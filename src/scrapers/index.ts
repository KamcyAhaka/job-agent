import { scrapeGreenhouse } from './greenhouse';
import { scrapeLever } from './lever';
import { scrapeAshby } from './ashby';
import { scrapeRemoteOK } from './remoteok';
import { scrapeWWR } from './weworkremotely';
import { JobListing } from '../types';
import { config } from '../config';
import { scrapeJobicy } from './jobicy';
import { scrapeRemotive } from './remotive';
import { scrapeArbeitnow } from './arbeitnow';

export async function scrapeAll(): Promise<JobListing[]> {
  const [greenhouse, lever, ashby, remoteok, wwr] = await Promise.all([
    scrapeGreenhouse(config.keywords),
    scrapeLever(config.keywords),
    scrapeAshby(config.keywords),
    scrapeRemoteOK(config.keywords),
    scrapeWWR(config.keywords),
    scrapeJobicy(),
    scrapeRemotive(),
    scrapeArbeitnow(),
  ]);

  return [...greenhouse, ...lever, ...ashby, ...remoteok, ...wwr];
}
