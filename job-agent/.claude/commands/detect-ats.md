---
description: Work out which ATS a company uses, and what that means for your CV
argument-hint: [company name, or a job posting / careers URL]
---

Use the `ats-detective` skill (.claude/skills/ats-detective/SKILL.md) exactly as written.

- Target: $ARGUMENTS if provided, otherwise ask the user for a company name or a posting URL.
- A URL is worth far more than a name: it often settles the vendor in Step 1 with no requests at all, so ask for one if the user only gave a name and the probes come back inconclusive.
- Respect the skill's confirmation rules: a board that answers is evidence, a guess is not. Report "unconfirmed" plainly rather than naming a vendor you did not establish.
- End with the 3-4 rules that actually change this CV, and offer `/optimize-cv` to apply them.
