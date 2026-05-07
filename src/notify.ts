import { getUnnotifiedJobs, markAsNotified } from './db';
import { MatchedJob } from './types';
import 'dotenv/config';

function buildSlackBlocks(jobs: { id: string; data: MatchedJob }[]) {
  const blocks: object[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `🔍 Job Leads — ${new Date().toDateString()}` },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `*${jobs.length} new match${jobs.length > 1 ? 'es' : ''}* found today` }],
    },
    { type: 'divider' },
  ];

  for (const { data: j } of jobs) {
    // Each job now adds 4 blocks (instead of 5) to save space
    blocks.push(
      { 
        type: 'section', 
        text: { type: 'mrkdwn', text: `*<${j.url}|${j.title}>* at *${j.company}*\n📍 ${j.location} | ⭐ Score: ${j.matchScore}/10` } 
      },
      { 
        type: 'context', 
        elements: [
          { type: 'mrkdwn', text: `💡 ${j.matchReason}` },
          ...(j.contact?.email ? [{ type: 'mrkdwn', text: `📧 ${j.contact.email}` }] : [])
        ] 
      },
      { 
        type: 'actions', 
        elements: [{ type: 'button', text: { type: 'plain_text', text: '🔗 View Job' }, url: j.url, style: 'primary' }] 
      },
      { type: 'divider' }
    );
  }

  return blocks;
}

export async function sendSlackDigest(): Promise<void> {
  const jobs = await getUnnotifiedJobs();

  if (!jobs.length) {
    console.log('No new jobs to notify.');
    return;
  }

  const blocks = buildSlackBlocks(jobs);

  const res = await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks: blocks.slice(0, 50) }), // Absolute safety cap
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Slack error: ${res.statusText} - ${body}`);
  }

  await markAsNotified(jobs.map(j => j.id));
  console.log(`✅ Slack digest sent — ${jobs.length} jobs.`);
}

sendSlackDigest().catch(console.error);
