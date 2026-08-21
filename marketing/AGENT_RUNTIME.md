# LigaLab Marketing Agent Runtime

This is the operational layer above the existing marketing strategy documents.

## Pipeline

`Fantasy Radar → score/filter → Strategist → Copywriter → Creative Director → Video Director → Brand Reviewer → pending_approval → generation → publishing → Growth Analyst`

## Cost control

The Radar is intentionally cheap and wide: 10–20 short opportunities. Only the top 3 with score >= the configured threshold may enter the expensive multi-agent chain. Default production is 1 strong creative per day.

## Structured handoff

The Radar writes both a human markdown report and `marketing/radar/YYYY-MM-DD.json` matching `marketing/radar.schema.json`.

The pipeline is three commands, each doing exactly one stage — none of them re-does the selection or scoring the previous one already did:

```bash
npm run marketing:radar -- 2026-08-21     # Fantasy Radar: calls Claude with real web search, writes marketing/radar/2026-08-21.{json,md}
npm run marketing:queue -- 2026-08-21     # selects the top candidates (score >= minimumScoreForCreative, capped at creativeCandidateLimit), writes queue.json + draft package.json per item
npm run marketing:generate -- 2026-08-21  # runs Strategist → Copywriter → Creative Director → Video Director → Brand Reviewer on each selected item, fills in its package.json
```

This creates `marketing/queue/YYYY-MM-DD/queue.json` and one `marketing/generated/YYYY-MM-DD/<contentId>/package.json` per selected opportunity — plus, after `marketing:generate`, its human-readable companions (`brief.md`, `script.md`, `seedance-prompt.md`, `image-prompt.md`, `captions.md`, `qa.md`) in the same folder. None of them is the source of truth; `package.json` is.

The package is the shared state passed between agents. Each agent fills only its own section and changes status. Human approval remains mandatory before real generation or publishing.

Requires `ANTHROPIC_API_KEY` (see `.env.example`). Without it, `marketing:radar` and `marketing:generate` refuse to run rather than fabricate anything — there is no offline fallback that invents content. `marketing:radar` runs on the cheap model (`MARKETING_AGENT_MODEL_CHEAP`, default Haiku 4.5) with web search enabled, since every opportunity needs a real, fetchable source; `marketing:generate` runs on the expensive model (`MARKETING_AGENT_MODEL`, default Opus 5) — bounded to at most `creativeCandidateLimit` pieces because `marketing:queue` already capped the queue, checked again defensively inside the script itself. Sources and formats always come straight from the Radar item, never re-derived by a downstream agent — only the Radar has search grounding.

Full write-up: `src/server/marketing/pipeline/` (the code) and its tests (`*.test.ts` in the same folder, all offline — a fake `LlamadaClaude` stands in for the API, so `npm test` never spends anything).

**Runs locally (or in CI), never on Vercel.** Production's filesystem is read-only — nothing running there could write to `marketing/generated/**` even if it tried, and the pipeline isn't wired into any deployed route. The flow is: run the three commands locally, review the diff, commit the new `marketing/radar/**` and `marketing/generated/**` files, push, deploy — only then does `/marketing` (which just reads whatever is in the deployed bundle) see the new queue.

## Human gate

No publishing adapter is enabled by default. A package can reach `pending_approval`, but not `generated` or `published`, without explicit approval.

## Product integrity

Real LigaLab screens must come from real captures. Image/video models can create framing, people, scenes, motion, backgrounds and marketing assets, but cannot fabricate a screenshot and present it as product UI.

## Provider strategy

Image and video providers are adapters, not hard-coded brand dependencies. Seedance is the initial video target; the image generator remains replaceable. The logo/app icon is also replaceable without changing the pipeline.
