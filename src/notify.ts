import { getUnnotifiedJobs, markAsNotified } from './db';
import { MatchedJob } from './types';
import { config } from './config';
import 'dotenv/config';

function buildSlackBlocks(jobs: { id: string; data: MatchedJob }[]) {
  const blocks: object[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `🔍 Job Leads — ${new Date().toDateString()}` },
    },
    {
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: `*${jobs.length} new match${jobs.length > 1 ? 'es' : ''}* found today`,
      }],
    },
    { type: 'divider' },
  ];

  for (const { data: j } of jobs) {
    blocks.push(
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*<${j.url}|${j.title}>* at *${j.company}*\n📍 ${j.location} | ⭐ Score: ${j.matchScore}/10`,
        },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `💡 ${j.matchReason}` },
          ...(j.contact?.email ? [{ type: 'mrkdwn', text: `📧 ${j.contact.email}` }] : []),
        ],
      },
      {
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: '🔗 View Job' },
          url: j.url,
          style: 'primary',
        }],
      },
      { type: 'divider' }
    );
  }

  return blocks;
}

export async function sendSlackDigest(): Promise<void> {
  const jobs = await getUnnotifiedJobs(config.maxJobsPerDigest);

  if (!jobs.length) {
    console.log('No new jobs to notify.');
    return;
  }

  const blocks = buildSlackBlocks(jobs);

  const res = await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks: blocks.slice(0, config.slackBlockSafetyCap) }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Slack error: ${res.statusText} - ${body}`);
  }

  await markAsNotified(jobs.map(j => j.id));
  console.log(`✅ Slack digest sent — ${jobs.length} jobs.`);
}

sendSlackDigest().catch(console.error);
