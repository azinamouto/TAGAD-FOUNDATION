# WP01 source register — v0.1.0

Date: 2026-10-13 (Asia/Shanghai). Review baseline: `2ccf527b283fc063abd61aeeedc3c383dd230668`, merged [PR #40](https://github.com/azinamouto/TAGAD-FOUNDATION/pull/40). This register distinguishes requirements authority from implementation evidence. No institutional decision is approved by source archiving.

| Source | Location / version | Authority and use |
| --- | --- | --- |
| SRC01 | [Original proposal](../../requirements/TALIBON_GAD_SDD_PROPOSAL.md), supplied by the user on 2026-10-13 | Primary functional requirements authority; user explicitly instructed that this recovered original governs WP01. No signed LGU approval or publication date was supplied. |
| SRC02 | [Merged traceability](../REQUIREMENTS_TRACEABILITY.md), baseline commit above | Accepted audit interpretation; 67 preserved rows. Acceptance detail may exceed literal proposal wording and requires clarification. |
| SRC03 | [Work packages](../IMPLEMENTATION_WORK_PACKAGES.md), baseline commit above | Authorized WP01 boundary; all 14 packages retained. WP02–WP14 have no execution authorization. |
| SRC04 | User's WP01 authorization and source-archiving instructions, this session, 2026-10-13 | Authorizes documentation, source preservation, dedicated branch and draft PR only. S01 originates in the earlier task brief as recorded by PR #40, not SRC01. |
| SRC05 | [Verification evidence index](../VERIFICATION_BASELINE.md), E02/E05/E07 | Read-only current schema/validators/form/service definitions; observed behavior is not approved LGU policy. |
| SRC06 | [Open decisions](../OPEN_DECISIONS.md), D01–D13 | Proposed stakeholders, questions and gates; no signed responses supplied. |

## Verbatim archive and checksum

The user supplied `docs/realignment/TALIBON_GAD_SDD_PROPOSAL.md` and explicitly directed archival at `docs/requirements/TALIBON_GAD_SDD_PROPOSAL.md`. The file was relocated without rewriting. Its single-paragraph layout, Unicode bullet/currency characters and trailing literal `&#x20;` are retained. No headings or metadata were inserted into the source.

SHA-256 of the original supplied file and archived bytes:

`f7d8983965decb79fe707ded1c3b1469402c6a409199840ceb8bde9ef4f6a257`

The staged Git blob must have the same checksum. Stage this file with command-local `core.autocrlf=false` to avoid changing original line endings; do not change repository configuration. Check with Python `hashlib.sha256(subprocess.check_output(['git','show',':docs/requirements/TALIBON_GAD_SDD_PROPOSAL.md'])).hexdigest()` after staging. The source section locators below refer to literal text, since the original is not formatted as Markdown headings.

| Section | Exact heading / locator | Traceability coverage |
| --- | --- | --- |
| I | PROJECT TITLE | R01 |
| II | RATIONALE | R02, R03, M10 |
| III | OBJECTIVES | R01, R02, U01–U07, DTA10, M10, A01–A09, REP01–REP07 |
| IV | PROJECT DESCRIPTION | R01, R04, DTA01–DTA10, M01–M10 |
| V | PROJECT COMPONENTS / SYSTEM MODULES | U01–U07, DTA01–DTA10, M01–M10, A01–A09, REP01–REP07, SEC01–SEC06 |
| VI | TARGET BENEFICIARIES | R04, R05 |
| VII | IMPLEMENTATION STRATEGY | L01–L05 |
| VIII | BUDGET REQUIREMENT | L04, L06 |
| IX | EXPECTED OUTPUTS | R01, U01–U07, DTA10, A01–A09, REP01–REP07, L04 |
| X | EXPECTED OUTCOMES | R02 |
| XI | IMPLEMENTING OFFICE | R05, L07 |
| XII | SUSTAINABILITY MECHANISM | L07–L12 |
| XIII | CONCLUSION | R01, R02 |

All 13 headings occur once and in order. V contains the six named modules; VII contains phases 1–5; IX and X contain eight outputs and seven outcomes respectively. The proposal lists PHP 300,000.00 total, with user training/orientation and initial testing/deployment included. This is a source statement, not an estimate proving the implementation plan fits the budget.

## Cross-check findings for review

All 67 rows have been compared to SRC01; their individual source/path register is in [REQUIREMENTS_BASELINE.md](REQUIREMENTS_BASELINE.md). No rows were deleted, renumbered or rewritten. The following qualifications apply to those rows; they do not silently alter the requirements.

| Review ID | Rows / original wording | Qualification and disposition |
| --- | --- | --- |
| Q01 | S01; A03; DTA03 | Barangay-level data is explicit; interactive mapping and the number 25 are not in SRC01. Retain S01 as separately authorized stakeholder scope. Roster, geometry and audience remain D07. |
| Q02 | U01–U06; V.1 says authorized users “such as” the six personas | The six named personas are covered; treating them as an exhaustive list or fixed technical roles is an audit recommendation. D02 must approve capability assignments and any additional persona. |
| Q03 | DTA01; V.2 places “other applicable gender categories” under Sex | Source wording mixes concepts; preserve the wording, ask D03 which concepts and vocabularies are needed. No automatic sex/gender translation or new category list. |
| Q04 | REP07; V.5 says reports “may be exported” to Excel, PDF and other usable formats | Baseline tests contemplate required formats. D06 must select formats per report; source does not require every format for every report. |
| Q05 | DTA06/DTA08, M01/M05/M10, A06; tracking beneficiaries and services | Activity linkage, distinct-person counting and attendance reconciliation are proposed acceptance interpretations. Source does not define deduplication keys, episodes, cross-office linkage or denominator. D04 remains open. |
| Q06 | R03, SEC06; II/V.6 list alignment/compliance intent | Does not certify compliance or specify applicable rule versions. D05/D09 require qualified review and sources. Existing percentages, HGDG rules and role powers are implementation facts only. |
| Q07 | A01; III.2/V.4/IX.5 say real-time | No measurable latency, availability or offline requirement supplied. D11 selects measurable criteria. No implied WebSocket or offline-sync requirement. |
| Q08 | R02, L03–L12; outcomes, pilot, training, sustainability | Turnaround/error metrics, proficiency records and review cadence are proposed evidence methods. Numeric targets, dates, funding and signatories are not in SRC01; D10–D13 remain open. |
| Q09 | M03/M04, U07, SEC05 | Sensitive service coverage is explicit; aggregate-only collection, minimum fields, retention and suppression are unresolved policy choices under D05. No case-management mandate or public-release permission is inferred. |

No missing proposal section or omitted named module/category was found in the 67-row coverage. This is a requirements coverage check, not functional acceptance. The original audit's source-absence statements describe its historical state; this archive supersedes that provenance gap only.

## Evidence still to obtain

MPDC/GFPS: designated version owner and scope endorsement. Sector offices: approved forms, indicator definitions, source samples, periods and update owners. Report owners: GPB/GAR and other templates with issuance/version. GIS custodian: roster, boundary source and licensing. DPO: documented collection/release/retention rules. Operators: current deployment inventory and recovery targets. Budget authority: recurring funding and estimates. None is supplied by source text alone; track through D01–D13. No external policy research or legal conclusion is part of this source register.
