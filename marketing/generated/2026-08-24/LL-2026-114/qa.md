# QA — LL-2026-114

## Scope
Direct real-product demonstration of MarketView / real bid flow. Prelaunch only.

## Product truth
- [x] MarketView is listed under “Funciona hoy” in `marketing/PRODUCT_TRUTH.md`.
- [x] Real bid creation/modification/cancellation is supported in production.
- [ ] Recheck production immediately before capture; PRODUCT_TRUTH was last verified 2026-08-19.

## Creative gate
- [x] Visual-first; no copy-led hook required.
- [x] Distinct from existing queue themes: rival cash, comparator, league economy, value evolution, calendar, probable XI, points and own cash.
- [x] Does not revive rejected copy directions.
- [x] Optional overlay must remain neutral and minimal (`Mercado` is sufficient).

## Asset gate
- [ ] Real 9:16 LigaLab capture required.
- [ ] Show a real player currently listed in the market.
- [ ] Show only the real bid controls/fields available at capture time.
- [ ] Do not fabricate player names, bid amounts, market state, ownership or outcome.
- [ ] Do not edit values to make the screen more dramatic.
- [ ] Remove/avoid private identifiers from the recording.
- [ ] No recreated UI, generated product screen or simulated bid result.

## Claims gate
- [x] No recommendation that the viewer should bid.
- [x] No prediction of winning the bid.
- [x] No claim that LigaLab optimizes or guarantees a successful bid.
- [x] No claim of automatic alerts/push.
- [x] No public availability/download CTA.

## Approval gate
Keep `status: draft` and `needsCapture: true` until the real capture exists and a human approves the creative. Do not advance to `generated` or `published`; publishers are disabled in prelaunch.
