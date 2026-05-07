import { JobListing } from '../types';

export async function scrapeRemoteOK(keywords: string[]): Promise<JobListing[]> {
  const jobs: JobListing[] = [];

  try {
    const res = await fetch('https://remoteok.com/api');
    if (!res.ok) return [];

    const data = await res.json() as any[];
    
    // RemoteOK API: first item is usually a legal/meta object, skip it
    const listings = data.slice(1);

    for (const job of listings) {
      const titleMatch = keywords.some(k =>
        job.position?.toLowerCase().includes(k.toLowerCase())
      );
      
      if (titleMatch) {
        jobs.push({
          title: job.position,
          company: job.company,
          url: job.url,
          location: job.location || 'Remote',
          source: 'remoteok',
          postedAt: new Date(job.date).toISOString(),
          content: job.description?.slice(0, 500),
        });
      }
    }
  } catch (err) {
    console.error('Failed to scrape RemoteOK:', err);
  }

  return jobs;
}
