import * as admin from 'firebase-admin';
import { MatchedJob } from './types';
import 'dotenv/config';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

export async function saveJobs(jobs: MatchedJob[]): Promise<void> {
  const batch = db.batch();
  let newCount = 0;

  for (const job of jobs) {
    const id = Buffer.from(job.url).toString('base64url');
    const ref = db.collection('job_leads').doc(id);
    const existing = await ref.get();

    if (!existing.exists) {
      batch.set(ref, {
        ...job,
        savedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      newCount++;
    }
  }

  await batch.commit();
  console.log(`Saved ${newCount} new jobs to Firestore.`);
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
