import { scrapeGreenhouse } from './greenhouse';
import { scrapeLever } from './lever';
import { scrapeAshby } from './ashby';
import { scrapeRemoteOK } from './remoteok';
import { scrapeWWR } from './weworkremotely';
import { JobListing } from '../types';

export const KEYWORDS = [
  'frontend', 'front-end', 'vue', 'nuxt',
  'react', 'next.js', 'full stack', 'fullstack', 'web lead',
];

export async function scrapeAll(): Promise<JobListing[]> {
  const [greenhouse, lever, ashby, remoteok, wwr] = await Promise.all([
    scrapeGreenhouse(KEYWORDS),
    scrapeLever(KEYWORDS),
    scrapeAshby(KEYWORDS),
    scrapeRemoteOK(KEYWORDS),
    scrapeWWR(KEYWORDS),
  ]);

  return [...greenhouse, ...lever, ...ashby, ...remoteok, ...wwr];
}
