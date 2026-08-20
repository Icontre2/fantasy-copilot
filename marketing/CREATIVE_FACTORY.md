# LigaLab Creative Factory

## Goal
Turn the daily Fantasy Radar into 1-3 production-ready content packages without publishing anything automatically.

## Inputs
Read, in this order:
1. `brand/BRAND.md`
2. `brand/VOICE.md`
3. `brand/CONTENT_RULES.md`
4. `marketing/PRODUCT_TRUTH.md`
5. `marketing/CONTENT_ENGINE.md`
6. Today's `marketing/radar/YYYY-MM-DD.md`
7. Agent instructions in `/agents`

## Selection
Choose at most 3 opportunities. Prefer one strong insight over volume. Reject an opportunity if:
- its feature is not live according to PRODUCT_TRUTH;
- the number or claim cannot be verified;
- it needs identifiable rival data without permission;
- it implies affiliation with LALIGA;
- it is generic football news without a LigaLab resolution.

## Output
For each selected idea create:

```
marketing/generated/YYYY-MM-DD/LL-YYYY-NNN/
  brief.md
  package.json
  script.md
  seedance-prompt.md
  image-prompt.md
  captions.md
  qa.md
```

No binary assets are required at this stage. `needs_capture=true` means the real LigaLab screen must be captured before render.

## Narrative defaults
The default short-video structure is:
- 0-2s: problem/hook
- 2-5s: tension or context
- 5-9s: real LigaLab proof
- 9-12s: answer + CTA

Rotate structures from `CONTENT_ENGINE.md`; do not produce the same opening every day.

## Brand rule
The planned red/black identity is for logo, app icon, store and marketing framing only. DO NOT recolor or redesign real LigaLab screenshots. Product UI remains as shipped.

## QA gate
A package can move to `pending_approval` only if the Brand Reviewer passes:
- brand consistency;
- product truth;
- factual verification;
- no invented metrics;
- no betting framing;
- no false affiliation;
- real app screen identified;
- platform-safe copy.

## Publication gate
No external publishing happens in v1. The user must approve the package first. A later publisher adapter may consume only `approved` packages.
