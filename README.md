# outreach_system

Orbit is an interactive prototype for planning influencer and KOL partnerships.

## Run locally

Open `index.html` directly in a browser, or serve the repository:

```sh
python -m http.server 8000
```

Visit http://localhost:8000. There are no build steps or package dependencies. A single-file version is available at `standalone/Orbit.html`.

## Features

- Editable company and campaign briefs
- Fictional creator pool with search, category and platform filters
- Rule-based creator fit scores and explanations
- Shortlists and budget suggestions with a configurable reserve
- CSV shortlist export
- Editable outreach templates and manual partnership stages
- Browser-local persistence

## Project files

- `index.html`: app shell
- `style.css`: responsive interface styles (Google Fonts are optional external requests)
- `app.js`: demo profiles, scoring, budget logic, drafts, and state management
- `tests/check.cjs`: lightweight behavior checks using Node's built-in modules
- `standalone/Orbit.html`: bundled app for opening as a single file

## Verification

```sh
node --check app.js
node tests/check.cjs
```

The behavior checks use a minimal DOM stub; they do not replace rendered browser or accessibility testing.

## Prototype limitations

All creator identities, audiences, metrics, and rates are fictional. Rates are estimated USD fees per sponsored post. Rankings use structured campaign fields and explicit rules, not an AI model. The budget suggestion uses a greedy selection approach, not a mathematical optimum or a performance prediction.

Data stays in this browser's localStorage; it is not synchronized across users or devices. The app does not scan websites, contact creators, send emails, authenticate users, or connect to live creator data. Outreach stage updates are manual records only.

## Next implementation steps

1. Add authentication, a shared database, and server-side campaign APIs.
2. Add company website analysis with URL validation and SSRF protections.
3. Integrate licensed creator data and record its source and freshness.
4. Add authorized email sending, reviewed messages, opt-outs, and delivery tracking.
5. Track campaign results with links, promo codes, and supported metrics.
