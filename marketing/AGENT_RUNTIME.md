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

The five expensive stages load their role prompt from `.claude/agents/*.md` — the same file Claude Code uses to invoke that agent as a subagent — minus its frontmatter and its `## Devuelves` contract section, which is caller-specific (`soloElRol` in `pipeline/docs.ts`). The Radar loads `marketing/prompts/fantasy-radar.md`. There is no longer a separate `agents/` directory.

Full write-up: `src/server/marketing/pipeline/` (the code) and its tests (`*.test.ts` in the same folder, all offline — a fake `LlamadaClaude` stands in for the API, so `npm test` never spends anything).

**Runs locally (or in CI), never on Vercel.** Production's filesystem is read-only — nothing running there could write to `marketing/generated/**` even if it tried, and the pipeline isn't wired into any deployed route. The flow is: run the three commands locally, review the diff, commit the new `marketing/radar/**` and `marketing/generated/**` files, push, deploy — only then does `/marketing` (which just reads whatever is in the deployed bundle) see the new queue.

## Daily batch: what expires and what does not

`marketing:queue` is the step that decides which Radar opportunities are worth the expensive chain. Three rules govern it, and all three exist because running it for real on 2026-08-22 broke them:

**An opportunity that already has a piece never enters the chain again.** The check is by `sourceOpportunityId` — the provenance, which *both* package conventions declare — never by the piece id, which is the one field the two conventions disagree on. Without this, `LL-2026-001` (hand-made, old convention, covering `LL-RADAR-20260822-001`) and a freshly queued `LL-20260822-001` would cover the same opportunity, and five Opus calls would go into repeating work that already existed. Pieces from *any* date count: an opportunity converted yesterday is not reconverted because today's Radar repeats it.

**`creativeCandidateLimit` is a ceiling per day, not per invocation.** Pieces already present in `marketing/generated/<date>/` consume slots, hand-made ones included. Running the command twice in a day therefore costs nothing the second time, instead of doubling the bill.

**Piece numbers come from what is already on disk, not from the position in the batch.** Numbering by batch position works exactly once: on a second run the converted opportunities drop out, different ones take their place, and the numbering restarts at `001` on top of pieces that already exist. The files themselves survive (nothing overwrites an existing `package.json`), but `queue.json` ends up pointing an id at a different opportunity than the `package.json` of that same id declares. A queue that lies is worse than a queue that is missing.

**Unused opportunities expire with the day.** A 14-opportunity Radar producing 3 pieces leaves 11 unused, and that is the intended outcome, not a backlog: `whyNow` is what makes an opportunity worth filming, and a probable-lineup story is worthless once the match is played. Tomorrow's Radar is generated from scratch. The command prints every discarded opportunity with its reason (`ya tiene pieza` / `score por debajo del mínimo` / `fuera del límite diario`) so the decision is visible rather than silent.

A draft written by this step sets `needsCapture: false`, not `true`. Whether a real product capture is needed is derived by the Creative Director from its own shots (`creative.ts` → `necesitaCaptura`); a draft asserting it up front claims something nobody has decided yet, and cannot say *which* screen — which is exactly what the `paquetes-reales.test.ts` canary rejects.

## Human gate

No publishing adapter is enabled by default. A package can reach `pending_approval`, but not `generated` or `published`, without explicit approval.

## Product integrity

Real LigaLab screens must come from real captures. Image/video models can create framing, people, scenes, motion, backgrounds and marketing assets, but cannot fabricate a screenshot and present it as product UI.

## Provider strategy

Image and video providers are adapters, not hard-coded brand dependencies. Seedance is the initial video target; the image generator remains replaceable. The logo/app icon is also replaceable without changing the pipeline.
