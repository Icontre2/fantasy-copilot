#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const configPath = path.join(root, 'marketing', 'automation.config.json');
const radarPath = path.join(root, 'marketing', 'radar', `${date}.json`);

const config = JSON.parse(await readFile(configPath, 'utf8'));
const radar = JSON.parse(await readFile(radarPath, 'utf8'));

if (radar.date !== date || !Array.isArray(radar.opportunities)) {
  throw new Error(`Invalid Radar payload: ${radarPath}`);
}

const selected = [...radar.opportunities]
  .filter((item) => Number.isInteger(item.score) && item.score >= config.daily.minimumScoreForCreative)
  .sort((a, b) => b.score - a.score)
  .slice(0, config.daily.creativeCandidateLimit);

const queueDir = path.join(root, 'marketing', 'queue', date);
await mkdir(queueDir, { recursive: true });

const queue = {
  date,
  generatedAt: new Date().toISOString(),
  status: selected.length ? 'ready' : 'empty',
  items: selected.map((opportunity, index) => ({
    contentId: `LL-${date.replaceAll('-', '')}-${String(index + 1).padStart(3, '0')}`,
    status: 'draft',
    score: opportunity.score,
    opportunity,
    agents: [
      { name: 'strategist', status: 'pending' },
      { name: 'copywriter', status: 'pending' },
      { name: 'creative-director', status: 'pending' },
      { name: 'video-director', status: 'pending' },
      { name: 'brand-reviewer', status: 'pending' }
    ],
    approval: {
      required: true,
      status: 'pending',
      approvedAt: null,
      approvedBy: null
    }
  }))
};

await writeFile(path.join(queueDir, 'queue.json'), `${JSON.stringify(queue, null, 2)}\n`);

for (const item of queue.items) {
  const itemDir = path.join(root, 'marketing', 'generated', date, item.contentId);
  await mkdir(itemDir, { recursive: true });
  await writeFile(
    path.join(itemDir, 'package.json'),
    `${JSON.stringify({
      id: item.contentId,
      date,
      status: 'draft',
      sourceOpportunityId: item.opportunity.id,
      score: item.score,
      problem: item.opportunity.problem,
      feature: item.opportunity.feature,
      hook: item.opportunity.hook,
      needsCapture: true,
      strategy: null,
      script: null,
      imagePrompt: null,
      seedancePrompt: null,
      captions: null,
      qa: null,
      approval: item.approval
    }, null, 2)}\n`
  );
}

console.log(`LigaLab agent queue: ${selected.length} item(s) prepared for ${date}`);
for (const item of queue.items) console.log(`- ${item.contentId} · ${item.score}/100 · ${item.opportunity.title}`);
