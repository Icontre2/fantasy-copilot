# Portal reference for job-search

Public search-URL patterns the `job-search` skill uses. `<q>` = URL-encoded query, `<loc>` = location.

## Fetchable endpoints (try these first)

| Board | Pattern | Notes |
|---|---|---|
| LinkedIn Jobs (guest) | `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=<q>&location=<loc>&f_TPR=r604800&start=0` | Global, no auth. Detail: `.../jobs-guest/jobs/api/jobPosting/<jobId>`. Low volume, personal use only. |
| Tecnoempleo | `https://www.tecnoempleo.com/ofertas-trabajo/?te=<q>` | España (tech). Plain HTML, no auth. Cards: `<h3 class="fs-5 mb-2">` with an `<a href=... title="<role>">`; open the `href` for the full posting. Verified 2026-10-31. |

## Search-engine patterns (via web search)

| Board | Pattern | Market |
|---|---|---|
| Indeed | `site:indeed.com "<q>" <loc>` (or the local TLD: indeed.fr, indeed.de, ...) | Global |
| StepStone | `site:stepstone.de "<q>" <loc>` (also .fr, .nl, .be) | DACH/EU |
| Welcome to the Jungle | `site:welcometothejungle.com "<q>" <loc>` | FR/EU tech |
| Otta / Welcome tech | `site:app.otta.com "<q>"` | UK/US/EU tech |
| Greenhouse boards | `site:boards.greenhouse.io "<q>"` | Direct company postings |
| Lever boards | `site:jobs.lever.co "<q>"` | Direct company postings |
| EURES | `site:eures.europa.eu "<q>" <loc>` | EU cross-border |
| InfoJobs | `site:infojobs.net "<q>" <loc>` | España. Direct fetch returns 405 (bot wall): search-engine only. |
| Indeed España | `site:es.indeed.com "<q>" <loc>` | España. Direct fetch returns 401: search-engine only. |

## Direct search URLs (for the honest-degradation path: hand these to the user)

| Board | Pattern |
|---|---|
| LinkedIn | `https://www.linkedin.com/jobs/search/?keywords=<q>&location=<loc>&f_TPR=r604800` |
| Indeed | `https://www.indeed.com/jobs?q=<q>&l=<loc>&fromage=7` |
| StepStone | `https://www.stepstone.de/jobs/<q>/in-<loc>` |
| Welcome to the Jungle | `https://www.welcometothejungle.com/en/jobs?query=<q>` |
| InfoJobs | `https://www.infojobs.net/jobsearch/search-results/list.xhtml?keyword=<q>` |
| Tecnoempleo | `https://www.tecnoempleo.com/ofertas-trabajo/?te=<q>` |
| Indeed España | `https://es.indeed.com/jobs?q=<q>&l=<loc>&fromage=7` |

## Add your local board

Add a row to whichever table fits: if the board's results render without JavaScript and don't block bots, put it under fetchable endpoints with its URL pattern; otherwise add a `site:` pattern and/or a direct search URL. The skill reads this file on every run, so a new row is live immediately. PRs adding well-tested patterns for national boards are welcome (see CONTRIBUTING.md).
