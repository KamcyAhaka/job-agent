import { JobListing } from '../types';

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  candidate_required_location: string;
  publication_date: string;
  description: string;
}

export async function scrapeRemotive(): Promise<JobListing[]> {
  try {
    const res = await fetch(
      'https://remotive.com/api/remote-jobs?category=software-dev&limit=100',
    );
    if (!res.ok) return [];

    const data = (await res.json()) as { jobs: RemotiveJob[] };

    return (data.jobs ?? []).map((job) => ({
      title: job.title,
      company: job.company_name,
      url: job.url,
      location: job.candidate_required_location || 'Remote',
      source: 'remotive',
      postedAt: job.publication_date,
      content: job.description?.slice(0, 500),
    }));
  } catch (err) {
    console.error('Remotive scrape failed:', err);
    return [];
  }
}
