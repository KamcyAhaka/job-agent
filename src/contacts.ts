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

// Map company slugs to their domains
const COMPANY_DOMAINS: Record<string, string> = {
  airbnb: 'airbnb.com',
  stripe: 'stripe.com',
  notion: 'notion.so',
  figma: 'figma.com',
  linear: 'linear.app',
  vercel: 'vercel.com',
  supabase: 'supabase.io',
  discord: 'discord.com',
  canva: 'canva.com',
  shopify: 'shopify.com',
  netlify: 'netlify.com',
  atlassian: 'atlassian.com',
};

const ENGINEERING_TITLES = [
  'engineering manager',
  'tech lead',
  'head of engineering',
  'vp engineering',
  'cto',
  'frontend lead',
  'recruiter',
  'talent',
];

export async function findContact(company: string): Promise<ContactResult> {
  if (!process.env.HUNTER_API_KEY) return {};

  const domain = COMPANY_DOMAINS[company.toLowerCase()];
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

    // Prefer engineering managers or recruiters over random emails
    const preferred = emails.find(e =>
      ENGINEERING_TITLES.some(title =>
        e.position?.toLowerCase().includes(title)
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
