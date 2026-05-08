import { JobListing } from '../types';

const ASHBY_COMPANIES = [
  'replicate', 'cursor', 'posthog', 'langchain', 'perplexity',
  'bezel', 'pydantic', 'modal', 'mindsdb', 'shuttle',
];

interface AshbyJob {
  title: string;
  jobExternalUrl: string;
  location: string;
  publishedAt: string;
}

export async function scrapeAshby(keywords: readonly string[]): Promise<JobListing[]> {
  const jobs: JobListing[] = [];

  for (const company of ASHBY_COMPANIES) {
    try {
      // Ashby Public Job Board API
      const res = await fetch(
        `https://api.ashbyhq.com/v0/job-board-api/organizations/${company}/job-postings`
      );
      if (!res.ok) continue;

      const data = await res.json() as { results: AshbyJob[] };

      for (const job of data.results) {
        const titleMatch = keywords.some(k =>
          job.title.toLowerCase().includes(k.toLowerCase())
        );
        if (titleMatch) {
          jobs.push({
            title: job.title,
            company,
            url: job.jobExternalUrl,
            location: job.location ?? 'Remote',
            source: 'ashby',
            postedAt: job.publishedAt,
          });
        }
      }
    } catch (err) {
      console.error(`Failed to scrape Ashby for ${company}:`, err);
    }
  }

  return jobs;
}
