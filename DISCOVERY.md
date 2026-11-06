# Connect broader Instagram discovery

Orbit now includes a backend connector to the **Modash Discovery API**. It searches the provider's Instagram index rather than the six starter records. It is not direct unrestricted access to every Instagram account. Provider coverage, freshness, API entitlement, and credits apply.

**Connection state:** implementation and mocked contract tests are complete; no live provider request was made because no account/API key is configured. Do not treat this as an activated or live-validated integration.

## What you need

1. A Modash account with **Discovery API access** and available credits. A web-app subscription alone may not grant API access; verify with the provider.
2. A server running this repository, with `MODASH_API_KEY` configured as a server secret. Never put it in the HTML, GitHub, browser storage, a client-side environment variable, or a chat message.

Provider links: [Discovery API](https://www.modash.io/influencer-marketing-api/discovery), [Instagram search documentation](https://docs.modash.io/products/discovery_api/openapi_doc/discovery/instagram/instagramcontroller_search).

No Instagram password or session cookies are required. No paid plan is purchased or provisioned by this code.

## Try locally without writing the key to a file

Download/clone the updated repository, then run:

```sh
python start_discovery.py
```

Paste the API key into the hidden terminal prompt. Open **http://127.0.0.1:8000**, confirm a company portfolio, go to Discover creators, and click **Search Instagram index**. No Python package installation is required for discovery or browser PDF uploads; the optional PDF server fallback still uses the existing requirements.

The hidden prompt keeps the key in this process's environment only. Closing the process removes that copy. Alternatively, set `MODASH_API_KEY` through your hosting provider's secret settings and launch the backend normally.

For a hosted version, deploy a production backend with authentication and managed secrets. The bundled Python server binds only to localhost and is a development server. Public hosting also needs per-user authorization, usage accounting, request-rate controls, and a production server; do not expose this development endpoint directly to the internet.

## How it works

- `GET /api/discovery/status` reports whether a key is configured; it does **not** verify its validity, entitlement, or credits.
- `POST /api/discovery/search` validates the request and calls the fixed provider endpoint `https://api.modash.io/v1/instagram/search` with a server-only Bearer token.
- The company profile suggests **editable content keywords**. This version uses the documented keyword-search endpoint, not semantic AI search.
- The form sends content terms, a follower range, optional two-letter content language, and a page number. One page is requested per click. It does not automatically search on upload or typing, or retry errors.
- Results show provider identity links and available metrics, with a review step before saving. If a content description isn't returned, the user must add sourced content evidence before saving.
- Audience country is deliberately **not** inferred from creator location or from the company's target market. This first connector does not request audience geography filters or audience reports. Quoted fees remain unknown until added with a source.
- Metrics are provider snapshots. The stored date is retrieval date, not a claim that measurement occurred that day. Fees, availability, brand suitability, authenticity, and audience fit still need independent review.
- The adapter maps documented search collections `directs` and `lookalikes`, tolerates nested/flat profile objects, validates handles, and deduplicates results. Unexpected formats fail visibly rather than fabricating profiles.

## Costs, limits, and errors

Searches consume your provider credits according to your agreement. Requests run only on explicit Search / Next page clicks. Identical queries/pages are cached for 120 seconds in the local process; the adapter allows at most one uncached request per second and makes no automatic retries. Changing filters/pages may consume additional credits. The client uses the documented typical 15-result pagination size; actual counts and limits are controlled by the provider.

Provider authentication, rate-limit, quota, network, malformed-response, and missing-key errors are surfaced without exposing provider error bodies or credentials. Request/response sizes and timeouts are bounded. Cached query results and the server key are not written to disk by this implementation.

## Standalone HTML

The downloaded single HTML file continues to support PDF uploads, company analysis, creator matching, imports, and outreach drafts. It cannot safely contain a private provider key or run the discovery backend. Open the app through the configured backend for provider search. The search dialog explains this instead of showing fake live results.

## Checks

```sh
python -m unittest discover -s tests -p 'test_*.py'
node tests/discovery.cjs
```

Provider contract checks use mocked responses and a test-only key. A successful live search must still be verified after configuring an entitled provider account. No end-to-end live-provider or rendered-browser claim is made.
