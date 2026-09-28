# Frontend issues 22?24

## Branch order

These branches are stacked on the existing `uiLandinPage` checkout:
1. `fix/22-auth-session-security`
2. `fix/23-workflow-api-alignment`
3. `feat/24-frontend-integrations`
4. `style/24-branding-design-tokens`

Review commits in order. Follow-up authentication race protection and development
proxy verification are included in the integration branch after browser testing.

## Behavior

- Backend session rejection cannot restore cached roles. A 401 can refresh once,
  then the new access token must pass `/auth/me`; 403 denies access. Outages
  preserve credentials for retry but never grant cached administrative access.
- Logout always clears local credentials and reports whether the server confirmed
  logout. Late restoration responses cannot reauthenticate after logout.
- Submitted GAD plans use `/revise` with required remarks. REVISED plans can be
  edited and resubmitted with `/submit`, including by encoders. Approval uses
  `/approve`; backend scope and state validation remain authoritative.
- All HTTP callers share a validated `VITE_API_BASE_URL`. Default `/api` uses
  same-origin hosting and the Vite development proxy to port 3000. Split hosting
  uses an absolute HTTP(S) root and backend `CORS_ORIGINS`; rebuild after changes.
- Pages load through lazy route imports and a loading boundary. Administrative
  workspace aliases require session verification.
- Authenticated catalog users can search stored observations. Table workspaces
  show paginated dataset summaries with explicit unweighted-mean semantics.
- CSV imports support explicit measure columns, indicator selection, dimension
  constants, and optional per-measure period, unit and dimension overrides.
  Preview and execute use the same mapping state; backend validation is retained.
- Accomplishments expose MOV listing, multipart upload and signed downloads.
  Upload permissions follow writer roles; the backend enforces office scope and
  file validation. Files over 20 MB are rejected locally too.
- Application surfaces, typography colors and chart colors use shared tokens.
  Status palettes and authored illustrations retain intentional colors.
- Verified municipal website branding replaces the TG and recreated seal marks;
  see FRONTEND_BRANDING.md for provenance.

## Verification

- Frontend unit tests: `npm --prefix frontend test` (20 tests).
- Browser tests: `npm --prefix frontend run test:browser` (11 tests).
  Install Chromium with `npx playwright install chromium` in frontend, or set
  `PLAYWRIGHT_CHANNEL=msedge` to use installed Edge (used for this verification).
- Both frontend and backend TypeScript checks pass.
- Production frontend build passes. The original single entry bundle was
  2,153 KB / 473 KB gzip; route splitting reduced the entry to 612.98 KB / 176.95 KB gzip. This is the entry chunk, not total page transfer size.
  Vite still warns that the shared entry exceeds 500 KB.
- 15 targeted backend tests pass: GAD workflow/approval, statistical CSV import,
  search failure handling, MOV multipart/scope, and same/cross-origin CORS.
- Browser tests use intercepted fixture responses to verify frontend requests and
  rendering. Backend contract tests run separately. Production database-backed
  search and real storage uploads/downloads were not exercised against a deployed
  environment; they require configured backend services and authorized test data.

No migrations, production data changes or deployments are part of these changes.
