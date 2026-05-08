import { JobListing } from '../types';

const LEVER_COMPANIES = [
  'netflix', 'shopify', 'atlassian', 'discord', 'canva',
];

interface LeverJob {
  text: string;
  hostedUrl: string;
  categories: { location: string };
  createdAt: number;
}

export async function scrapeLever(keywords: readonly string[]): Promise<JobListing[]> {
  const jobs: JobListing[] = [];

  for (const company of LEVER_COMPANIES) {
    try {
      const res = await fetch(
        `https://api.lever.co/v0/postings/${company}?mode=json`
      );
      if (!res.ok) continue;

      const data = await res.json() as LeverJob[];

      for (const job of data) {
        const titleMatch = keywords.some(k =>
          job.text.toLowerCase().includes(k.toLowerCase())
        );
        if (titleMatch) {
          jobs.push({
            title: job.text,
            company,
            url: job.hostedUrl,
            location: job.categories?.location ?? 'Remote',
            source: 'lever',
            postedAt: new Date(job.createdAt).toISOString(),
          });
        }
      }
    } catch (err) {
      console.error(`Failed to scrape ${company}:`, err);
    }
  }

  return jobs;
}
