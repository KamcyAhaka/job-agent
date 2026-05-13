import { JobListing } from '../types';

interface ArbeitnowJob {
  slug: string;
  url: string;
  title: string;
  company_name: string;
  location: string;
  created_at: number;
  description: string;
  remote: boolean;
}

export async function scrapeArbeitnow(): Promise<JobListing[]> {
  try {
    const res = await fetch(
      'https://www.arbeitnow.com/api/job-board-api?page=1',
    );
    if (!res.ok) return [];

    const data = (await res.json()) as { data: ArbeitnowJob[] };

    return (data.data ?? []).map((job) => ({
      title: job.title,
      company: job.company_name,
      url: job.url,
      location: job.remote ? 'Remote' : job.location,
      source: 'arbeitnow',
      postedAt: new Date(job.created_at * 1000).toISOString(),
      content: job.description?.slice(0, 500),
    }));
  } catch (err) {
    console.error('Arbeitnow scrape failed:', err);
    return [];
  }
}
