# LigaLab Marketing Automation v1

This layer automates the existing marketing strategy. It does not replace `PRODUCT_TRUTH.md`, `CONTENT_ENGINE.md`, `SEEDANCE_PIPELINE.md`, `IMAGE_PIPELINE.md`, `ASO.md` or the research documents.

## Source-of-truth order
1. `marketing/PRODUCT_TRUTH.md` — what can truthfully be marketed today.
2. `brand/BRAND.md` + `brand/VOICE.md` + `brand/CONTENT_RULES.md` — how LigaLab communicates.
3. `marketing/research/*` — known pains and opportunities.
4. Latest current evidence from the Fantasy Radar.
5. `marketing/CONTENT_ENGINE.md` — how one insight becomes platform-specific pieces.

If two documents conflict, product truth and verified current evidence win.

## v1 workflow

```text
CURRENT SIGNALS / COMMUNITY / PRODUCT DATA
                  ↓
            FANTASY RADAR
                  ↓
        10–20 scored opportunities
                  ↓
             STRATEGIST
                  ↓
          3–5 production briefs
                  ↓
       COPY + CREATIVE + VIDEO
                  ↓
            BRAND REVIEWER
                  ↓
             HUMAN APPROVAL
                  ↓
          PLATFORM ADAPTATION
                  ↓
         TIKTOK / REELS / SHORTS
                  ↓
          PERFORMANCE METRICS
                  ↓
             GROWTH AGENT
                  └──────────→ scoring feedback
```

## Human gate
In v1 there is ALWAYS a human approval step before external publication. Automatic generation is allowed; automatic publication is not.

## Product boundary
This system may generate or change marketing/store assets. It MUST NOT redesign or recolor the LigaLab product UI. Real product screenshots stay visually faithful to production.

## Replaceable app icon
The current app-icon direction is deliberately treated as a replaceable asset. Automation references a logical `brand.app_icon` / `brand.wordmark`, not a hard-coded visual concept.

## Execution phases

### Phase A — foundation
- Brand rules.
- Agent contracts.
- Content-item schema.
- Queue directories/state model.
- No external API required.

### Phase B — daily radar
- Scheduled daily research.
- Score opportunities.
- Write dated radar output.
- Generate briefs for top opportunities.

### Phase C — production adapters
- LLM copy adapter.
- Image-generation adapter.
- Seedance/video adapter.
- Real screenshot ingest.
- Render/export adapter.

### Phase D — approval UI
- Private `/marketing` control panel.
- Preview asset.
- Approve / reject / request edit.
- Never exposed publicly.

### Phase E — publishing adapters
- TikTok.
- Instagram Reels.
- YouTube Shorts.
- Each platform gets adapted metadata even when the master video is shared.

### Phase F — measurement loop
- Pull platform performance at 24h / 72h / 7d.
- Record conversion data where attribution is available.
- Weekly Growth Agent memo.
- Update strategy weights only after enough sample size.

## Recommended daily cadence
- 08:30–09:00: radar.
- 09:00: opportunity scoring.
- 09:10: 1 primary insight selected.
- Morning: production package generated.
- Human approval when convenient.
- Publish at platform-appropriate time.

The existing `CONTENT_ENGINE.md` principle still applies: start with one strong insight per day, then adapt it into several platform-native pieces rather than manufacturing unrelated filler.
