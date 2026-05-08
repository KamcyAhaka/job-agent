import { VertexAI } from '@google-cloud/vertexai';
import { JobListing, MatchedJob } from './types';
import { scrapeAll } from './scrapers';
import { findContact } from './contacts';
import { saveJobs, filterNewJobs, saveRejectedJobs } from './db';
import { config } from './config';
import 'dotenv/config';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);

const vertexAI = new VertexAI({
  project: process.env.GCLOUD_PROJECT || serviceAccount.project_id,
  location: config.vertexLocation,
  googleAuthOptions: {
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  },
});

// Built from config — no more hardcoded requirements string
const MY_REQUIREMENTS = `
  - Roles: ${config.requirements.roles.join(', ')}
  - Stack: ${config.requirements.stack.join(', ')}
  - Seniority: ${config.requirements.seniority}
  - Location: ${config.requirements.location}
  - Remote Preference:
    ${config.requirements.remotePreference.map(r => `• ${r}`).join('\n    ')}
  - Relocation/Visa Policy:
    ${config.requirements.relocationPolicy.map(r => `• ${r}`).join('\n    ')}
  - EXCLUDE: ${config.requirements.exclude.join(', ')}
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
  if (!process.stdout.isTTY) {
    console.log(`[AI] ${label}`);
    return () => {};
  }
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  process.stdout.write('\n');
  const id = setInterval(() => {
    process.stdout.write(`\r${frames[i++ % frames.length]}  ${label}`);
  }, 80);
  return () => {
    clearInterval(id);
    process.stdout.write('\r\x1b[K');
  };
}

async function filterWithAI(jobs: JobListing[]): Promise<MatchedJob[]> {
  const model = vertexAI.getGenerativeModel({ model: config.model });
  const batches = chunkArray(jobs, config.batchSize);
  const filtered: MatchedJob[] = [];

  for (const batch of batches) {
    const prompt = `
      You are a job search assistant. Given these listings and requirements,
      return ONLY a JSON array of strong matches (score ${config.matchScoreThreshold}+/10).

      MY REQUIREMENTS:
      ${MY_REQUIREMENTS}

      JOB LISTINGS:
      ${JSON.stringify(batch, null, 2)}

      Return JSON array with shape:
      [{ "title", "company", "url", "location", "source", "postedAt", "matchScore", "matchReason" }]
      Return [] if no matches. Return ONLY raw JSON, no markdown or backticks.
    `;

    let attempt = 0;
    while (attempt < config.maxRetries) {
      const stopSpinner = startSpinner(
        `Vertex AI filtering batch ${batches.indexOf(batch) + 1}/${batches.length}...`
      );
      try {
        const result = await model.generateContent(prompt);
        stopSpinner();
        const raw = result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const text = raw.replace(/```json|```/g, '').trim();
        const matches: MatchedJob[] = JSON.parse(text);
        filtered.push(...matches.map(j => ({ ...j, notified: false })));
        break;
      } catch (err: any) {
        stopSpinner();
        const is429 = err?.status === 429 || err?.message?.includes('429');
        attempt++;
        if (is429 && attempt < config.maxRetries) {
          const waitMs = config.retryDelayMs * attempt;
          console.warn(`Rate limit hit. Retrying in ${waitMs / 1000}s... (attempt ${attempt}/${config.maxRetries})`);
          await sleep(waitMs);
        } else {
          console.error('AI filter error:', err);
          break;
        }
      }
    }
    await sleep(config.batchDelayMs);
  }

  return filtered;
}

async function run(): Promise<void> {
  console.log('🔍 Scraping job boards...');
  const raw = await scrapeAll();
  console.log(`Found ${raw.length} raw listings.`);

  const newJobs = await filterNewJobs(raw);
  console.log(`${newJobs.length} are new. (${raw.length - newJobs.length} already seen)`);

  if (newJobs.length === 0) {
    console.log('✅ No new jobs to process.');
    return;
  }

  const matched = await filterWithAI(newJobs);
  console.log(`${matched.length} strong matches found.`);

  // Optimization: Save REJECTED jobs too so we don't pay to analyze them again
  const matchedUrls = new Set(matched.map(m => m.url));
  const rejected = newJobs.filter(j => !matchedUrls.has(j.url));
  await saveRejectedJobs(rejected);

  for (const job of matched) {
    job.contact = await findContact(job.company);
  }

  await saveJobs(matched);
  console.log('✅ Done.');
}

run().catch(console.error);
