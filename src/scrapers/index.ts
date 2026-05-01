import { scrapeGreenhouse } from './greenhouse';
import { scrapeLever } from './lever';
import { JobListing } from '../types';

export const KEYWORDS = [
  'frontend', 'front-end', 'vue', 'nuxt',
  'react', 'next.js', 'full stack', 'fullstack', 'web lead',
];

export async function scrapeAll(): Promise<JobListing[]> {
  const [greenhouse, lever] = await Promise.all([
    scrapeGreenhouse(KEYWORDS),
    scrapeLever(KEYWORDS),
  ]);

  return [...greenhouse, ...lever];
}
