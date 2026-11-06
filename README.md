# outreach_system — Orbit

A company outreach hub that starts with a company portfolio, extracts a draft profile, and matches creators against the reviewed brief.

## Open without installing anything

Download `standalone/Orbit.html` and open it in your browser. You can upload text-based PDFs directly, as well as TXT/Markdown, or paste content. No Python, API key, or server is needed for PDF uploads. An internet connection is required to load the pinned PDF.js reader from jsDelivr. PDF contents are processed on your device and are not uploaded.

## Run the full app (optional, adds Word uploads)

Requires Python 3.10+; Node.js is needed only for the JavaScript checks.

```sh
git clone https://github.com/rititititi/outreach_system.git
cd outreach_system
python -m pip install -r requirements.txt
python server.py
```

Open **http://127.0.0.1:8000**. This server binds to localhost and is intended for local development, not public hosting. No API keys are needed.

## Company-first workflow

1. Upload a portfolio (text-based PDF, DOCX, TXT, or Markdown), or paste a company overview.
2. Review extracted company name, products, audience, market, industry, tone, keywords, exclusions, and any explicit campaign settings. Supporting excerpts appear alongside the fields. Missing fields stay blank.
3. Confirm the profile, objective, platform, and USD budget.
4. Explore scored creator profiles, build a shortlist, review the budget mix, export CSV, and prepare outreach drafts.

The upload limit is 8 MB. Extracted text is limited to 120,000 characters; PDFs to 60 pages. Image-only/scanned portfolios need OCR text pasted into the app. Legacy DOC and PowerPoint files are not supported; export those to text-based PDF first. Encrypted PDFs are not supported.

The parser understands labeled company details and industry keywords in English. It is a deterministic text analyzer, **not an LLM**. It cannot reliably interpret every free-form deck. Review is required; it does not silently invent missing markets, audiences, company names, or budgets. Only explicitly marked USD amounts are extracted; other currencies require manual conversion. Website URLs are recorded but not crawled.

Confirming a replacement profile clears the active shortlist, drafts, and outreach stages. Editing the campaign brief afterward preserves these records.

## Standalone option

Open `standalone/Orbit.html` directly in a browser. Pasted content, PDFs, and TXT/Markdown uploads work without a server. PDF extraction runs in the browser, including when opened as a local file. DOCX extraction still requires `python server.py`; alternatively export Word files to PDF. A static HTTP server supports PDF uploads too.

## Matching

`engine.js` scores each profile out of 100:

- Category relevance: 40 points
- Exact content keyword overlap: up to 20 points
- Audience-market match: 20 points
- Preferred platform: 10 points
- Engagement signal: up to 10 points

The budget suggestion considers only profiles with matching market/platform, some content relevance, and no matched exclusion keywords. It selects greedily in score order while respecting the reserve. It is not an optimal portfolio solver. Scores are matching signals, not probabilities or sales predictions. Keyword exclusions cannot replace brand-safety review.

**All creators, handles, audience metrics, and rates are still fictional demo data.** Live Instagram discovery, provider data, external AI, email sending, shared accounts, and campaign measurement are not connected.

## Data handling

Original files and full extracted text are processed in memory and not written to disk by the app. Saved company fields, source excerpts, and outreach records persist in this browser's localStorage (`orbit-v1`). They do not synchronize across devices. To remove them, clear this site's browser storage. No portfolio text is sent to an external AI service. Google Fonts may be requested by the stylesheet; system fonts work without them. PDF uploads load PDF.js 4.10.38 and its worker from jsDelivr (internet required); no PDF bytes are sent to that CDN. Image-only PDFs still need OCR; password-protected PDFs must be unlocked first.

The local server exposes only the app's explicit static assets and a same-origin extraction endpoint. Do not expose it publicly without authentication, request-rate and resource limits, secure deployment, and production document-processing controls.

## Project files

- `index.html`, `style.css`, `app.js`: company onboarding and outreach hub
- `engine.js`: shared portfolio extraction rules and creator scoring
- `pdf-reader.js`: browser-local PDF extraction using pinned PDF.js (Apache-2.0)
- `server.py`: local static server and in-memory PDF/DOCX extraction
- `requirements.txt`: PDF parser dependency
- `standalone/Orbit.html`: bundled browser app (text-only extraction)
- `tests/`: behavior, extraction, and local API checks

## Checks

```sh
node --check app.js
node --check engine.js
node tests/pdf-reader.cjs
node tests/engine.cjs
node tests/check.cjs
python -m unittest discover -s tests -p 'test_*.py'
```

JavaScript UI checks use a minimal DOM stub, not a rendered browser. Python checks cover actual text-based PDF and DOCX extraction, payload validation, origin checks, and blocked private-file routes. Rendered browser and accessibility testing remain outstanding.

## Next integrations

Add a production backend and identity, licensed/authorized creator records with field-level provenance, optional semantic analysis, then authorized email sending and performance tracking. Keep provider credentials server-side.
