import { JobListing } from '../types';

const GREENHOUSE_COMPANIES = [
  'airbnb', 'stripe', 'notion', 'figma', 'linear',
  'vercel', 'supabase', 'planetscale', 'clerk', 'resend',
];

interface GreenhouseJob {
  title: string;
  absolute_url: string;
  location: { name: string };
  content: string;
  updated_at: string;
}

export async function scrapeGreenhouse(keywords: readonly string[]): Promise<JobListing[]> {
  const jobs: JobListing[] = [];

  for (const company of GREENHOUSE_COMPANIES) {
    try {
      const res = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`
      );
      if (!res.ok) continue;

      const data = await res.json() as { jobs: GreenhouseJob[] };

      for (const job of data.jobs) {
        const titleMatch = keywords.some(k =>
          job.title.toLowerCase().includes(k.toLowerCase())
        );
        if (titleMatch) {
          jobs.push({
            title: job.title,
            company,
            url: job.absolute_url,
            location: job.location?.name ?? 'Remote',
            content: job.content?.slice(0, 500),
            source: 'greenhouse',
            postedAt: job.updated_at,
          });
        }
      }
    } catch (err) {
      console.error(`Failed to scrape ${company}:`, err);
    }
  }

  return jobs;
}
