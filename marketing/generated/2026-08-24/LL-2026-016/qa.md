# LL-2026-016 — QA / production gate

## Concept
Rival cash reconstruction: real Fantasy market context → real LigaLab rival profile → reconstructed rival cash marked `≈`.

## Product truth gate
- Verified feature: **Caja de rivales reconstruida**.
- Source/view: `economy/activity.ts` / rival manager profile.
- The reconstructed cash is an **estimate**, not an exact published balance.
- The `≈` marker must remain visible whenever the estimate is shown.
- Do not imply that LigaLab predicts whether the rival can afford a player.
- Do not show automatic alerts/push notifications.

## Asset gate
- `needsCapture=true`.
- Capture must be from the real production LigaLab UI.
- 9:16 vertical capture preferred.
- Record 5–8 seconds to allow a clean 2–4 second edit.
- No recreated UI, generated screenshots or edited product figures.
- Blur/crop any unrelated personal data before approval.

## Edit gate
1. Establish a real Fantasy market listing.
2. Move to the real rival profile.
3. Show the reconstructed cash estimate with `≈`.
4. Keep transitions fast; no explanatory copy required if the visual is self-explanatory.
5. LigaLab branding appears only after the product proof.

## Copy gate
No new hook is required. Avoid adding a slogan, Gen-Z slang, emojis or a causal promise such as “LigaLab evita que te lo quiten”. The current human feedback requires visual-first creative and minimal text.

## Approval status
`draft` — waiting for real product capture and human creative review. Do not advance to `generated` or `published` automatically.
