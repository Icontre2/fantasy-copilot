# LL-2026-114 — Capture handoff

## Objective
Get the single real-product recording needed to turn the Mercado / pujas reales evergreen into a reviewable asset.

## Recording
- Vertical 9:16.
- Record 5–8 seconds raw; final usable cut 2–4 seconds.
- Start already inside `MarketView` on a real player currently listed in the user's real league.
- Briefly show the listing and the real bid controls available in production.
- If entering the bid flow, stop before any irreversible action unless the human explicitly intends to place a real bid.
- Keep the UI readable on a phone.

## Before recording
- Use a real LigaLab session and real league.
- Do not edit player name, market state, price, bid amount or timestamps.
- Avoid exposing unrelated manager/private information.
- Recheck the screen against `marketing/PRODUCT_TRUTH.md` before capture.

## Do not capture or imply
- Fake market listings or recreated UI.
- Invented bid amounts.
- A recommended bid from LigaLab.
- Predicted outcome, profit or points.
- Automatic bidding or alerts.

## Acceptance gate
- [ ] Real LigaLab `MarketView`.
- [ ] Real current market item.
- [ ] Real bid controls visible.
- [ ] No private information unnecessarily exposed.
- [ ] 9:16 and legible.
- [ ] No edited figures or UI.
- [ ] No unsupported product claim.

## Current status
`draft` — waiting for human asset intake. No external publication.
