export const config = {
  // ─── AI Model ────────────────────────────────────────────
  model: 'gemini-2.5-flash',
  matchScoreThreshold: 7,
  vertexLocation: 'us-central1',

  // ─── Your Job Requirements ───────────────────────────────
  requirements: {
    roles: [
      'Frontend Developer',
      'Full-stack Developer',
      'Web Team Lead',
    ],
    stack: [
      'Vue.js', 'Nuxt.js', 'TypeScript', 'Firebase',
      'React', 'Next.js', 'React Native',
    ],
    seniority: 'Mid to Senior',
    location: 'Lagos, Nigeria (Timezone: GMT+1/WAT)',
    remotePreference: [
      'HIGH PRIORITY: Fully Remote (Worldwide or EMEA-based)',
      'FAVOR: Companies with existing African presence or open to hiring in Nigeria',
    ],
    relocationPolicy: [
      'Only consider non-remote roles IF they explicitly offer visa sponsorship and relocation support.',
      'If the listing requires existing local right to work (e.g., "Must be a US citizen", "EU right to work required"), REJECT it unless sponsorship is mentioned.',
    ],
    exclude: [
      'Project Manager',
      'Product Manager',
      'Non-engineering roles',
    ],
  },

  // ─── Scraper Keywords ────────────────────────────────────
  keywords: [
    'frontend', 'front-end', 'vue', 'nuxt',
    'react', 'next.js', 'full stack', 'fullstack',
    'web lead', 'typescript',
  ],

  // ─── Job Boards ──────────────────────────────────────────
  greenhouse: [
    'airbnb', 'stripe', 'notion', 'figma', 'linear',
    'vercel', 'supabase', 'clerk', 'resend', 'planetscale',
  ],
  lever: [
    'netflix', 'shopify', 'atlassian', 'discord', 'canva',
  ],
  ashby: [
    'ramp', 'mercury', 'retool', 'brex', 'loom',
  ],

  // ─── Notifications ───────────────────────────────────────
  maxJobsPerDigest: 20,
  slackBlockSafetyCap: 50,

  // ─── Contact Lookup ──────────────────────────────────────
  preferredContactRoles: [
    'engineering manager',
    'tech lead',
    'head of engineering',
    'vp engineering',
    'cto',
    'frontend lead',
    'recruiter',
    'talent',
  ],
  companyDomains: {
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
  } as Record<string, string>,

  // ─── Rate Limiting ───────────────────────────────────────
  batchSize: 10,
  batchDelayMs: 2000,
  retryDelayMs: 15000,
  maxRetries: 3,

  // ─── No Results Handling ─────────────────────────────────
  consecutiveMissThreshold: 3,
  jobTTLDays: 30,
} as const;

export type Config = typeof config;
