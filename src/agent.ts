// --- AI Studio (@google/generative-ai) — commented out, kept for easy rollback ---
// import { GoogleGenerativeAI } from '@google/generative-ai';
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
// -------------------------------------------------------------------------------------

import { VertexAI } from '@google-cloud/vertexai';
import { JobListing, MatchedJob } from './types';
import { scrapeAll } from './scrapers';
import { findContact } from './contacts';
import { saveJobs } from './db';
import 'dotenv/config';

// Vertex AI bills through Google Cloud automatic payments (no prepay credits needed)
const vertexAI = new VertexAI({
  project: process.env.GCLOUD_PROJECT!,
  location: 'us-central1',
  googleAuthOptions: {
    credentials: JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!),
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  },
});

const MY_REQUIREMENTS = `
  - Role: Frontend Developer, Full-stack Developer, or Web Team Lead
  - Stack: Vue.js, Nuxt.js, TypeScript, Firebase, React, Next.js, React Native
  - Type: Remote (Worldwide/EMEA) (FAVOR Africa-friendly locations)
  - Location: Based in Lagos, Nigeria (FAVOR EMEA-friendly timezones or Global Remote)
  - Seniority: Mid to Senior level
  - Industry: Tech, Nonprofit, or Social Impact
  - EXCLUDE: Project Manager, Product Manager, or any non-engineering roles
`;

function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function startSpinner(label: string): () => void {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  process.stdout.write('\n');
  const id = setInterval(() => {
    process.stdout.write(`\r${frames[i++ % frames.length]}  ${label}`);
  }, 80);
  return () => {
    clearInterval(id);
    process.stdout.write('\r\x1b[K'); // clear spinner line
  };
}

async function filterWithAI(jobs: JobListing[]): Promise<MatchedJob[]> {
  // const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); // AI Studio
  const model = vertexAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const batches = chunkArray(jobs, 10);
  const filtered: MatchedJob[] = [];

  for (const batch of batches) {
    const prompt = `
      You are a job search assistant. Given these listings and requirements,
      return ONLY a JSON array of strong matches (score 7+/10).

      MY REQUIREMENTS:
      ${MY_REQUIREMENTS}

      JOB LISTINGS:
      ${JSON.stringify(batch, null, 2)}

      Return JSON array with shape:
      [{ "title", "company", "url", "location", "source", "postedAt", "matchScore", "matchReason" }]
      Return [] if no matches. Return ONLY raw JSON, no markdown or backticks.
    `;

    let attempt = 0;
    const maxAttempts = 3;
    while (attempt < maxAttempts) {
      const stopSpinner = startSpinner(`Vertex AI filtering batch ${batches.indexOf(batch) + 1}/${batches.length}...`);
      try {
        const result = await model.generateContent(prompt);
        stopSpinner();
        // Vertex AI SDK uses candidates array instead of .text() helper
        const raw = result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const text = raw.replace(/```json|```/g, '').trim();
        const matches: MatchedJob[] = JSON.parse(text);
        filtered.push(...matches.map(j => ({ ...j, notified: false })));
        break;
      } catch (err: any) {
        stopSpinner();
        const is429 = err?.status === 429 || err?.message?.includes('429');
        attempt++;
        if (is429 && attempt < maxAttempts) {
          const waitMs = 15000 * attempt; // 15s, 30s
          console.warn(`Rate limit hit. Retrying in ${waitMs / 1000}s... (attempt ${attempt}/${maxAttempts})`);
          await sleep(waitMs);
        } else {
          console.error('AI filter error:', err);
          break;
        }
      }
    }
    // Small delay between batches to stay within RPM limits
    await sleep(2000);
  }

  return filtered;
}

async function run(): Promise<void> {
  console.log('🔍 Scraping job boards...');
  const raw = await scrapeAll();
  console.log(`Found ${raw.length} raw listings.`);

  const matched = await filterWithAI(raw);
  console.log(`${matched.length} strong matches found.`);

  for (const job of matched) {
    job.contact = await findContact(job.company);
  }

  await saveJobs(matched);
  console.log('✅ Done.');
}

run().catch(console.error);
