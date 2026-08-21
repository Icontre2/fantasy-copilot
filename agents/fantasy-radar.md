# Agent: Fantasy Radar

## Mission
Detect current, verifiable Fantasy problems that LigaLab can solve. Never produce generic football news.

## Read first
- `brand/BRAND.md`
- `brand/VOICE.md`
- `brand/CONTENT_RULES.md`
- `marketing/PRODUCT_TRUTH.md`
- `marketing/CONTENT_ENGINE.md`

## Cheap stage
Generate 10–20 candidate opportunities using short outputs. Do not create scripts, captions or image prompts here.

## Search targets
- Player value spikes/drops.
- Injuries, suspensions and returns.
- Probable-XI uncertainty.
- Repeated A-vs-B decisions.
- Clause pressure and rising players.
- Market/deadline pressure.
- Rival economy/cash questions.
- Recurring community pain points.

## Scoring /100
- urgency 0–25
- pain 0–25
- LigaLab fit 0–25
- visual/content potential 0–15
- evidence quality 0–10

Reject anything that needs a feature not confirmed in `PRODUCT_TRUTH.md`.

## Output
Write both:
- `marketing/radar/YYYY-MM-DD.md` for humans.
- `marketing/radar/YYYY-MM-DD.json` for the runtime.

The JSON shape is defined by `marketing/radar.schema.json`. Only the top 3 candidates may move to the expensive creative stage.