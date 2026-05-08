import { JobListing } from '../types';

export async function scrapeWWR(keywords: readonly string[]): Promise<JobListing[]> {
  const jobs: JobListing[] = [];

  try {
    const res = await fetch('https://weworkremotely.com/api/v1/posts');
    if (!res.ok) return [];

    const data = await res.json() as { jobs: any[] };

    for (const job of data.jobs) {
      const titleMatch = keywords.some(k =>
        job.title?.toLowerCase().includes(k.toLowerCase())
      );
      
      if (titleMatch) {
        jobs.push({
          title: job.title,
          company: job.company,
          url: job.url,
          location: job.location || 'Remote',
          source: 'weworkremotely',
          postedAt: job.listed_at,
          content: job.description?.slice(0, 500),
        });
      }
    }
  } catch (err) {
    console.error('Failed to scrape We Work Remotely:', err);
  }

  return jobs;
}
