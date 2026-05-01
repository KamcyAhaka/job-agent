import { GoogleGenerativeAI } from '@google/generative-ai';
import { JobListing, MatchedJob } from './types';
import { scrapeAll } from './scrapers';
import { findContact } from './contacts';
import { saveJobs } from './db';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MY_REQUIREMENTS = `
  - Role: Frontend Developer, Full-stack Developer, or Web Team Lead
  - Stack: Vue.js, Nuxt.js, TypeScript, Firebase, React, Next.js, React Native
  - Type: Remote or hybrid preferred
  - Seniority: Mid to Senior level
  - Industry: Tech, Nonprofit, or Social Impact
  - EXCLUDE: Project Manager, Product Manager, or any non-engineering roles
`;

function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

async function filterWithAI(jobs: JobListing[]): Promise<MatchedJob[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-04-17' });
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

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, '').trim();
      const matches: MatchedJob[] = JSON.parse(text);
      filtered.push(...matches.map(j => ({ ...j, notified: false })));
    } catch (err) {
      console.error('AI filter error:', err);
    }
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
