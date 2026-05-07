import * as admin from 'firebase-admin';
import { MatchedJob, JobListing } from './types';
import 'dotenv/config';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

export function getJobDocId(url: string): string {
  return Buffer.from(url).toString('base64url');
}

export async function filterNewJobs<T extends { url: string }>(jobs: T[]): Promise<T[]> {
  const newJobs: T[] = [];
  for (const job of jobs) {
    const id = getJobDocId(job.url);
    // Check both collections
    const [leadDoc, rejectedDoc] = await Promise.all([
      db.collection('job_leads').doc(id).get(),
      db.collection('rejected_leads').doc(id).get()
    ]);
    
    if (!leadDoc.exists && !rejectedDoc.exists) {
      newJobs.push(job);
    }
  }
  return newJobs;
}

export async function saveJobs(jobs: MatchedJob[]): Promise<void> {
  if (jobs.length === 0) return;
  const batch = db.batch();
  for (const job of jobs) {
    const id = getJobDocId(job.url);
    const ref = db.collection('job_leads').doc(id);
    batch.set(ref, {
      ...job,
      savedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  console.log(`Saved ${jobs.length} matches to Firestore.`);
}

export async function saveRejectedJobs(jobs: JobListing[]): Promise<void> {
  if (jobs.length === 0) return;
  const batch = db.batch();
  for (const job of jobs) {
    const id = getJobDocId(job.url);
    const ref = db.collection('rejected_leads').doc(id);
    batch.set(ref, {
      ...job,
      matchScore: 0,
      matchReason: 'Automatically rejected (low score)',
      savedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  console.log(`Marked ${jobs.length} rejected jobs as "seen" in rejected_leads.`);
}

export async function getUnnotifiedJobs(): Promise<{ id: string; data: MatchedJob }[]> {
  const snapshot = await db
    .collection('job_leads')
    .where('notified', '==', false)
    .orderBy('savedAt', 'desc')
    .limit(20)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    data: doc.data() as MatchedJob,
  }));
}

export async function markAsNotified(ids: string[]): Promise<void> {
  const batch = db.batch();
  ids.forEach(id => {
    batch.update(db.collection('job_leads').doc(id), { notified: true });
  });
  await batch.commit();
}

export async function queryJobs(limit = 10): Promise<MatchedJob[]> {
  const snapshot = await db
    .collection('job_leads')
    .orderBy('savedAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => doc.data() as MatchedJob);
}
