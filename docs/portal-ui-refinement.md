# TAGAD personal portal refinement

Implementation verified on 2026-10-19. No merge or deployment performed.

## Changed files

- frontend/src/components/layout/AppLayout.tsx: responsive shell, skip link, modal mobile drawer, focus containment, Escape dismissal, scroll locking, and a content-level loading boundary.
- frontend/src/components/layout/Sidebar.tsx: 260px sidebar, Lucide icons, restrained active indicator, hash-aware route selection, existing sections and administrative access checks.
- frontend/src/components/layout/TopBar.tsx: contextual page title, wrapping account name and roles, accessible account menu using the existing component infrastructure, existing sign-out behavior.
- frontend/src/index.css: scoped purple workspace theme, flat panels, readable tables and metadata, responsive styles, focus states.
- frontend/src/pages/Dashboard.tsx: persistent reporting controls, scope notice, two wide statistical panels, charts and tabular alternatives, barangay detail table, recent entries with owning office, explicit missing values, loading/empty/error states and retry.
- frontend/tests/browser/portal-refinement.spec.ts: five viewport checks, keyboard interactions, accessibility, error recovery, missing values and empty responses.
- frontend/tests/browser/scope-reduction.spec.ts: mobile drawer interaction and synchronization with completed navigation.
- frontend/tests/browser/security-workflows.spec.ts: sign-out through the account menu.
- docs/portal-ui-refinement.md: implementation and verification report.

## Verification

- Frontend TypeScript check passed.
- All 19 frontend unit tests passed.
- Production build passed. Vite reports a bundle-size warning for chunks over 500 kB.
- All 30 browser test cases passed across the full run and the final targeted navigation-suite rerun. The final targeted run passed all 10 navigation/scope tests after adding an assertion that waits for route rendering before reopening the drawer.
- Browser testing used installed Microsoft Edge, isolated local ports, and disabled HMR. The default port was occupied and Playwright's bundled Chromium was unavailable.
- Dashboard checks passed at 320, 390, 768, 1024 and 1440px, including no document-level horizontal overflow, long account names, keyboard focus containment, single active route, and account-menu operation.
- Axe scans reported no violations on the tested dashboard states at all five widths.
- Rendered desktop, mobile, drawer and error screenshots were visually inspected.
- Existing authorization, provisional data entry, reporting, plan revision, attachments, and logout regression cases passed.
- git diff --check passed.

## Data integrity and limitations

The production UI uses the existing authenticated API. Synthetic responses exist only in browser tests; rendered test previews are not official municipal data. Live authenticated database responses were not verified.

Registry statistics retain their all-year, non-archived, access-scoped definition. The reporting year applies to programs and expenditures. Missing counts are explicitly marked; derived totals are unavailable when an input is missing. Registry counts are not represented as population or service participation.

The API does not supply aggregate validation status or a last-updated timestamp, so the interface explicitly states their absence. Entry encoding dates are not presented as last-update timestamps. Existing API failures remain visible; the redesign does not repair backend availability.

Desktop navigation stays expanded; mobile navigation uses a drawer. No icon-only navigation mode, unsupported notifications, geographic map, or new dependency was added. Browser checks cover Edge, not a full Safari/Firefox matrix.

Pre-existing changes in backend/server.ts, frontend/vite.config.ts and docs/audits/ were preserved. Backend logic, Prisma, routes, authentication and publication policies were not modified.
