# LigaLab Marketing Agent Runtime

This is the operational layer above the existing marketing strategy documents.

## Pipeline

`Fantasy Radar → score/filter → Strategist → Copywriter → Creative Director → Video Director → Brand Reviewer → pending_approval → generation → publishing → Growth Analyst`

## Cost control

The Radar is intentionally cheap and wide: 10–20 short opportunities. Only the top 3 with score >= the configured threshold may enter the expensive multi-agent chain. Default production is 1 strong creative per day.

## Structured handoff

The Radar writes both a human markdown report and `marketing/radar/YYYY-MM-DD.json` matching `marketing/radar.schema.json`.

Run:

```bash
npm run marketing:queue -- 2026-08-21
```

This creates `marketing/queue/YYYY-MM-DD/queue.json` and one `marketing/generated/YYYY-MM-DD/<contentId>/package.json` per selected opportunity.

The package is the shared state passed between agents. Each agent fills only its own section and changes status. Human approval remains mandatory before real generation or publishing.

## Human gate

No publishing adapter is enabled by default. A package can reach `pending_approval`, but not `generated` or `published`, without explicit approval.

## Product integrity

Real LigaLab screens must come from real captures. Image/video models can create framing, people, scenes, motion, backgrounds and marketing assets, but cannot fabricate a screenshot and present it as product UI.

## Provider strategy

Image and video providers are adapters, not hard-coded brand dependencies. Seedance is the initial video target; the image generator remains replaceable. The logo/app icon is also replaceable without changing the pipeline.
