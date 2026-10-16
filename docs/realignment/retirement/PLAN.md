# GAD-first legacy retirement plan

2026-10-17, Asia/Shanghai. Baseline: `c47b2a39f9f25e77082b46002146e8b98d1ead78`.
PR #42 is merged; its final commit is an ancestor of this baseline. Targeted fetch
of main succeeded after broad fetch encountered an unrelated origin/UI ref conflict.
Branch: `refactor/gad-first-legacy-retirement`. No tracked local modifications;
October audit documents remain untracked and are fingerprinted for preservation.

## Authority and scope

The original `docs/requirements/TALIBON_GAD_SDD_PROPOSAL.md` governs. Read alongside
REQUIREMENTS_TRACEABILITY, FEATURE_DISPOSITION, TARGET_ARCHITECTURE,
IMPLEMENTATION_WORK_PACKAGES, OPEN_DECISIONS, wp01 REQUIREMENTS_BASELINE,
DATA_DICTIONARY, ACCEPTANCE_SCENARIOS, and the October CBMS_SCOPE_ASSESSMENT,
RECOVERY_ROADMAP and WORK_PACKAGE_STATUS. Those audits recommend retention under
an earlier documentation/hide-only mandate. The current explicit retirement
request supersedes that execution boundary, not institutional decisions.

WP01 documentation is delivered; WP02 policy-independent corrections are now
merged (October references to uncommitted work are historical). WP02 institutional
acceptance remains partial. This pass does not start WP03-14 or close D01-D13.

## Classification and before/after inventory

| Capability before | Classification | After / evidence |
| --- | --- | --- |
| General table builder and dimension/indicator dialogs | RETIRE frontend; PRESERVE FOR COMPATIBILITY backend | Delete page, components, client/types and URL registrations. Authoring arbitrary table definitions is not a proposal module. No GAD page imports this group. Preserve mounted API, validators, services and tests. |
| Comprehensive catalog browsing and observation search UI | RETIRE frontend; PRESERVE FOR COMPATIBILITY backend | Delete catalog pages, modal/search and frontend client; no full-CBMS browsing workflow in active app. Catalog source and statistical API remain. |
| Generic statistical grid, dataset selector, summary and generic CSV mapping UI | RETIRE frontend; PRESERVE FOR COMPATIBILITY engines | Delete generic workspace dependency closure. Its only callers are retiring catalog/builder/grid pages; no registry, program, plan, accomplishment, dashboard or report page consumes it. No approved GAD-specific template is implemented here. This intentionally removes generic manual observation entry from the web app; future curated aggregate entry remains WP07, blocked by D03/D08. |
| Beneficiary registry and CSV wizard | KEEP | DataEncoding and modules/ingestion remain; CsvDiscovery/CsvIngestion plus offices/barangays/validation/audit are required by V.2. |
| Sex-disaggregated barangay dashboard | KEEP; REFACTOR navigation | Existing male/female registered-record charts remain prominent; never relabel as municipal population. No new map; S01 remains incomplete. |
| Programs, plans, accomplishments, MOV, working reports, accounts | KEEP | V.1/V.3/V.5/V.6 workflow and legacy/admin aliases remain. Canonical admin controllers serve existing HTTP aliases. |
| Unmounted duplicate controllers, old layout/navbar, auth wrappers and dashboard | RETIRE | No incoming imports (Navbar only from retired Layout); server.ts and router use different active implementations. No runtime filename loader. Remove five unmounted backend controllers, not their mounted admin counterparts. |
| Statistical services, datasets, observations, catalog, table-definition APIs | PRESERVE FOR COMPATIBILITY | Route inventory enumerates all mounts and HTTP handlers. Repository has tests/scripts; external callers cannot be ruled out. No API endpoint removed, narrowed, or redirected. |
| Catalog registers, CBMS source rows/reconciliation, statistical schemas and provenance | KEEP | Historical statistical storage can support GAD sources. Keep seeds, CSV register, migration history and reconciliation unchanged. |
| Household linkage, source eligibility, public releases, operational artifacts | BLOCKED (retain) | D04/D05/D08/D10 and unknown external consumers prevent data/endpoint retirement. No household survey UI was found to remove. Source sector names alone cannot prove irrelevance: health, employment, education, agriculture, fisheries and DRR are in proposal IV. |
| Public portal and feedback | KEEP existing; BLOCKED broader policy | Existing URLs and confidentiality safeguards remain; no new release policy. PR42 accomplishment-text withholding is unchanged. |

## Exact retirement and dependency evidence

- `retired-files.txt`: exact 39-file deletion plan, including obsolete importMapping unit test.
- `file-inventory.csv`: every tracked frontend/backend/CI file at baseline, classification,
  rationale and resolved incoming repository code imports where applicable.
- `import-consumers.json`: baseline static relative/alias import and re-export graph,
  including test/script consumers. Candidates have no retained code consumers other
  than removed router imports. Literal route/link searches supplement this graph.
- `frontend-route-inventory.csv`: before/after URL registrations, including the
  duplicated catalog registration. Ten unique generic URLs (eleven registrations)
  are removed; old bookmarks reach the existing not-found page, not a hidden tool
  or misleading redirect. Detail IDs, query strings and fragments do not restore
  the retired application. SPA catch-all is not an HTTP 410 response.
- `backend-route-inventory.csv`: all literal API mounts and route handlers remain.

Repository evidence cannot establish absence of external API consumers. Therefore
HTTP endpoints are preserved. Source-only unmounted implementation files are not
external HTTP contracts; built packages are private. Old frontend bookmarks are
an intentional breaking UI change authorized by retirement, documented for review.
No HTTP compatibility window or institutional retirement/retention policy is invented.

## Database and integrity dependency review

No database connection, migration, deletion or seed run is needed for retirement.
All Prisma/Supabase schemas, migration histories, seed data, source CSV registers,
SQLite artifacts and source provenance remain byte-identical to main. Household
links to Barangay and Beneficiary; Beneficiary references office, barangay and user.
StatisticalObservation references dataset, table definition, indicator, barangay
and provenance; bindings reference definitions/dimensions; datasets/provenance
reference importing users. GADPlanItem connects plans/programs; accomplishments
connect programs/items and MOV; audit/revocation reference users. These foreign
keys make database deletion unsafe and unnecessary. Preserve all relations and IDs.

## Target application and verification plan

Use existing GAD pages only: dashboard/sex-disaggregated barangay statistics,
registry/import, programs/services and accomplishments, planning/working reports,
and administration. Combine duplicate dashboard/navigation headings; security is
cross-cutting. Keep the map-unavailable notice and working-export limitations.

Replace browser expectations that generic tools remain reachable with real
not-found/no-statistical-request assertions for authenticated and anonymous visits.
Retain GAD authorization, navigation, outage, incomplete-data, lifecycle and MOV
checks. Remove only three browser cases and one unit test solely for deleted UI;
backend statistical search/summary/import authorization tests remain. Run full
backend/frontend tests, typechecks/builds, browser tests, compatibility regression,
PR42 safeguards, schema/source/audit checksums, and remote security checks.

Remaining blocks: API retirement awaits consumer/owner evidence; curated GAD
aggregate forms need D03/D08; geographic mapping needs D05/D07; publication needs
D05; official templates/workflow need D06/D09; institutional and operational
acceptance remain D01-D13. No missing module is marked complete by this pass.
