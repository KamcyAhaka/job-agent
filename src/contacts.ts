import { config } from './config';
import 'dotenv/config';

interface HunterResponse {
  data: {
    emails: {
      value: string;
      first_name: string;
      last_name: string;
      position: string;
      confidence: number;
    }[];
  };
}

export interface ContactResult {
  email?: string;
  name?: string;
  position?: string;
}

export async function findContact(company: string): Promise<ContactResult> {
  if (!process.env.HUNTER_API_KEY) return {};

  const domain = config.companyDomains[company.toLowerCase()];
  if (!domain) return {};

  try {
    const url = new URL('https://api.hunter.io/v2/domain-search');
    url.searchParams.set('domain', domain);
    url.searchParams.set('api_key', process.env.HUNTER_API_KEY);
    url.searchParams.set('limit', '10');
    url.searchParams.set('type', 'personal');

    const res = await fetch(url.toString());
    if (!res.ok) return {};

    const data = await res.json() as HunterResponse;
    const emails = data.data?.emails ?? [];
    if (!emails.length) return {};

    const preferred = emails.find(e =>
      config.preferredContactRoles.some(role =>
        e.position?.toLowerCase().includes(role)
      )
    );

    const best = preferred ?? emails[0];

    return {
      email: best.value,
      name: `${best.first_name} ${best.last_name}`.trim(),
      position: best.position,
    };
  } catch (err) {
    console.error(`Hunter.io lookup failed for ${company}:`, err);
    return {};
  }
}
