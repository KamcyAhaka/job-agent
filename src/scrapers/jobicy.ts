import { JobListing } from '../types';
import { config } from '../config';

interface JobicyJob {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  jobGeo: string;
  pubDate: string;
  jobExcerpt: string;
}

export async function scrapeJobicy(): Promise<JobListing[]> {
  try {
    const params = new URLSearchParams({
      count: '50',
      tag: config.keywords.slice(0, 3).join(','), // API supports up to 3 tags
    });

    const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?${params}`);
    if (!res.ok) return [];

    const data = (await res.json()) as { jobs: JobicyJob[] };

    return (data.jobs ?? []).map((job) => ({
      title: job.jobTitle,
      company: job.companyName,
      url: job.url,
      location: job.jobGeo ?? 'Remote',
      source: 'jobicy',
      postedAt: job.pubDate,
      content: job.jobExcerpt?.slice(0, 500),
    }));
  } catch (err) {
    console.error('Jobicy scrape failed:', err);
    return [];
  }
}
