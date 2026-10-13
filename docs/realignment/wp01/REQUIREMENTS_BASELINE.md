# WP01 requirements baseline — v0.1.0

Prepared 2026-10-13 (Asia/Shanghai), based on merged PR #40 at `2ccf527b283fc063abd61aeeedc3c383dd230668`. Status: **documentation candidate; stakeholder agreement pending**. Source: [SRC01–SRC06](SOURCE_REGISTER.md). All 67 original traceability rows and all 14 work packages remain intact. WP01 authorization does not authorize WP02 or later work.

## Meaning of confirmation

- **Confirmed source requirement (C):** explicit in the user-designated original proposal. Confirms textual scope, not LGU policy approval or delivered behavior.
- **Confirmed task constraint (T):** explicit user direction, including documentation-only scope, preservation, S01's separately recorded stakeholder origin and draft publication.
- **Recommendation (P):** proposed clarification, ownership, workflow or verification method awaiting review.
- **Unresolved (U):** definition or institutional decision lacks authoritative confirmation. D01–D13 remain open; only D01's source-location/archiving subtask is satisfied.

Revision rule: retain this version in Git; record date, affected requirement/dictionary/scenario IDs, old/new meaning, decision ID, named authorized approver and linked evidence for each substantive change. Editorial corrections do not approve policy. A future agreed version must cite the consultation record and unresolved exceptions. Neither elapsed time nor merging documentation constitutes stakeholder sign-off.

## Confirmed scope and boundaries

C: centralized Talibon GAD-SDD storage, encoding, updates, retrieval, monitoring, analytics, reports and security; all six V modules; offices/barangays and named sectors in IV/VI; five VII delivery phases; training, guides, pilot and sustainability obligations. C: PHP 300,000 project total includes training/orientation and initial testing/deployment (VIII). U: feasibility estimates, recurring costs, procurement terms and dates (D13); this baseline offers no delivery-price or schedule commitment.

T: S01 is additional interactive male/female visualization for 25 barangays, recorded by the accepted audit. Boundary/roster authority remains U; a table fallback cannot satisfy S01. Comprehensive CBMS expansion, optional household matching, general case management, AI features and automatic official submission are outside this authorization. Existing records, IDs and functionality are preserved.

## Personas, navigation and workflow clarification

Six module names are C; the workspace labels and flows below are P, not UI changes. Security applies across every workspace. Persona names are C examples in V.1, not approved technical-role mappings (Q02). Named assignees, multiple assignments and office/barangay intersection remain D02. The proposed reviewers are institutional roles, not confirmed delegates.

| Module / proposed flow | Proposed persona and limits | Open decisions |
| --- | --- | --- |
| User Management: designation → provision → review → deactivate | System Administrator manages approved accounts; no automatic confidential access | D02, D05, D10 |
| Data Encoding: select approved form → encode/import preview → correct → submit for review | Department Encoder within office; Barangay Encoder within barangay and approved office/program scope | D02–D05, D08 |
| GAD Program and Service Monitoring: select program/service → activity or approved aggregate → review results | Encoders capture permitted data; GAD Focal Person reviews assigned scope; no inferred approval delegation | D04, D05, D09 |
| Dashboard and Analytics: scope/period/measure → summary → source/quality explanation | Viewer reads authorized summaries; focal person analyzes permitted scope | D03–D05, D07, D11 |
| Report Generation: template → parameters → preview → authorized export | Report Generator exports selected templates without implied CRUD, publication or confidential-detail permission | D02, D05, D06, D09 |
| Data Security and Privacy: access review → audit review → incident/recovery evidence | Designated administrator/operator/DPO responsibilities must be confirmed; no automatic role bypass | D02, D05, D10 |

Proposed office scenario: an assigned department encoder submits an approved form; reviewer checks dictionary, period and provenance before an authorized report generator exports. Proposed barangay scenario: encoder works only in the approved office/barangay intersection and cannot broaden scope by changing a filter. Proposed sensitive scenario: responsible service office uses only D05-approved aggregate or restricted-detail intake; no collection/publication starts while that choice is unresolved. These are walkthrough scripts, not performed consultations.

## Clarification coverage and acceptance ownership

Each register row below preserves the original ID and source locator, proposes a responsible review role, identifies a scenario in [ACCEPTANCE_SCENARIOS.md](ACCEPTANCE_SCENARIOS.md), and carries the original decision gates. The original [traceability matrix](../REQUIREMENTS_TRACEABILITY.md) retains the detailed requirement, implementation status, acceptance criteria and later WP allocation. Every acceptance path uses those row-specific criteria as well as the scenario; a shared scenario does not replace them. All 67 source comparisons are completed; all stakeholder walkthroughs are pending. Source qualifiers Q01–Q09 are in the source register.

| Requirement | Source locator / cross-check | Proposed responsible reviewer | Acceptance path | Decision gates (original row) |
| --- | --- | --- | --- | --- |
| R01 | I; III general; IV; IX.1–2,8; XIII; C concept; P acceptance detail | MPDC/GFPS | AC01, AC04 | D01/03 |
| R02 | II; III.4,6; X.1–7; XIII; C concept; P acceptance detail; Q08 | MPDC/GFPS | AC14 | D12 |
| R03 | II; C concept; P acceptance detail; Q06 | MPDC/GFPS | AC11, AC07 | D05/06/09 |
| R04 | IV; VI; C concept; P acceptance detail | MPDC/GFPS | AC05, AC06 | D03 |
| R05 | VI; XI; C concept; P acceptance detail | MPDC/GFPS | AC02, AC14 | D02/12 |
| U01 | V.1; C concept; P acceptance detail; Q02 | MPDC/GFPS with office/barangay representatives | AC02, AC12 | D02/09 |
| U02 | V.1; C concept; P acceptance detail; Q02 | MPDC/GFPS with office/barangay representatives | AC02, AC11 | D02/09 |
| U03 | V.1; C concept; P acceptance detail; Q02 | MPDC/GFPS with office/barangay representatives | AC02 | D02 |
| U04 | V.1; C concept; P acceptance detail; Q02 | MPDC/GFPS with office/barangay representatives | AC03 | D02 |
| U05 | V.1; C concept; P acceptance detail; Q02 | MPDC/GFPS with office/barangay representatives | AC02, AC07 | D02/05 |
| U06 | V.1; C concept; P acceptance detail; Q02 | MPDC/GFPS with office/barangay representatives | AC02, AC09 | D02/06 |
| U07 | V.1; C concept; P acceptance detail; Q09 | MPDC/GFPS with office/barangay representatives | AC07, AC12 | D05/10 |
| DTA01 | V.2; IV; C concept; P acceptance detail; Q03 | GFPS/MPDC and source-owning offices | AC05 | D03 |
| DTA02 | V.2; IV; C concept; P acceptance detail | GFPS/MPDC and source-owning offices | AC05 | D03 |
| DTA03 | V.2; IV; C concept; P acceptance detail; Q01 | GFPS/MPDC and source-owning offices | AC03, AC04 | D07 |
| DTA04 | V.2; IV; C concept; P acceptance detail | GFPS/MPDC and source-owning offices | AC05 | D03 |
| DTA05 | V.2; IV; C concept; P acceptance detail | GFPS/MPDC and source-owning offices | AC02, AC04 | D02/03 |
| DTA06 | V.2; IV; C concept; P acceptance detail; Q05 | GFPS/MPDC and source-owning offices | AC06 | D04 |
| DTA07 | V.2; IV; C concept; P acceptance detail | GFPS/MPDC and source-owning offices | AC05, AC06 | D03/04 |
| DTA08 | V.2; IV; C concept; P acceptance detail; Q05 | GFPS/MPDC and source-owning offices | AC06 | D04 |
| DTA09 | V.2; IV; C concept; P acceptance detail | GFPS/MPDC and source-owning offices | AC04, AC08 | D03/08 |
| DTA10 | III.1; IV; IX.4,8; C concept; P acceptance detail | GFPS/MPDC and source-owning offices | AC04 | D03/08 |
| M01 | V.3; IV; C concept; P acceptance detail; Q05 | Service-owning office and GFPS | AC06 | D04 |
| M02 | V.3; IV; C concept; P acceptance detail | Service-owning office and GFPS | AC06 | D03/04 |
| M03 | V.3; IV; C concept; P acceptance detail; Q09 | Service-owning office and GFPS / DPO | AC06, AC07 | D03/05 |
| M04 | V.3; IV; C concept; P acceptance detail; Q09 | Service-owning office and GFPS / DPO | AC07 | D05 |
| M05 | V.3; IV; C concept; P acceptance detail; Q05 | Service-owning office and GFPS | AC06 | D04 |
| M06 | V.3; IV; C concept; P acceptance detail | Service-owning office and GFPS | AC06, AC08 | D03/04 |
| M07 | IV education; C concept; P acceptance detail | Service-owning office and GFPS | AC04, AC06 | D03/08 |
| M08 | IV agriculture/fisheries; C concept; P acceptance detail | Service-owning office and GFPS | AC04, AC06 | D03/08 |
| M09 | IV DRR; C concept; P acceptance detail | Service-owning office and GFPS / DPO | AC06, AC07 | D03/05/08 |
| M10 | II; III; IV; V.3; C concept; P acceptance detail; Q05 | Service-owning office and GFPS | AC06, AC11 | D04/09 |
| A01 | V.4; III.2,4; IX.5; C concept; P acceptance detail; Q07 | GFPS/MPDC and source owners | AC08, AC13 | D11 |
| A02 | V.4; III.2,4; IX.5; C concept; P acceptance detail | GFPS/MPDC and source owners | AC05, AC08 | D03/04 |
| A03 | V.4; III.2,4; IX.5; C concept; P acceptance detail; Q01 | GFPS/MPDC and source owners | AC08 | D07 |
| A04 | V.4; III.2,4; IX.5; C concept; P acceptance detail | GFPS/MPDC and source owners | AC05, AC08 | D03 |
| A05 | V.4; III.2,4; IX.5; C concept; P acceptance detail | GFPS/MPDC and source owners | AC05, AC08 | D03 |
| A06 | V.4; III.2,4; IX.5; C concept; P acceptance detail; Q05 | GFPS/MPDC and source owners | AC06, AC08 | D04 |
| A07 | V.4; III.2,4; IX.5; C concept; P acceptance detail | GFPS/MPDC and source owners | AC07, AC08 | D05 |
| A08 | V.4; III.2,4; IX.5; C concept; P acceptance detail | GFPS/MPDC and source owners | AC08 | D03/04 |
| A09 | V.4; III.2,4; IX.5; C concept; P acceptance detail | GFPS/MPDC and source owners | AC08, AC11 | D03/09 |
| S01 | SRC04 additional scope; not SRC01; T additional scope; Q01 | MPDC/GIS custodian | AC10 | D05/07/11 |
| REP01 | V.5; III.3; IX.6; C concept; P acceptance detail | Designated report owner and MPDC/GFPS | AC09, AC11 | D06/09 |
| REP02 | V.5; III.3; IX.6; C concept; P acceptance detail | Designated report owner and MPDC/GFPS | AC09, AC11 | D06/09 |
| REP03 | V.5; III.3; IX.6; C concept; P acceptance detail | Designated report owner and MPDC/GFPS | AC09 | D03/06 |
| REP04 | V.5; III.3; IX.6; C concept; P acceptance detail | Designated report owner and MPDC/GFPS | AC09 | D06/07 |
| REP05 | V.5; III.3; IX.6; C concept; P acceptance detail | Designated report owner and MPDC/GFPS | AC09 | D04/06 |
| REP06 | V.5; III.3; IX.6; C concept; P acceptance detail | Designated report owner and MPDC/GFPS | AC09, AC14 | D03/06 |
| REP07 | V.5; III.3; IX.6; C concept; P acceptance detail; Q04 | Designated report owner and MPDC/GFPS | AC09 | D06 |
| SEC01 | V.6; C concept; P acceptance detail | DPO/operator with MPDC/GFPS | AC02, AC03, AC07 | D02/05 |
| SEC02 | V.6; C concept; P acceptance detail | DPO/operator with MPDC/GFPS | AC12 | D02/10 |
| SEC03 | V.6; C concept; P acceptance detail | DPO/operator with MPDC/GFPS | AC04 | D03/08 |
| SEC04 | V.6; C concept; P acceptance detail | DPO/operator with MPDC/GFPS | AC12 | D10 |
| SEC05 | V.6; C concept; P acceptance detail; Q09 | DPO/operator with MPDC/GFPS | AC07, AC12 | D05/10 |
| SEC06 | V.6; C concept; P acceptance detail; Q06 | DPO/operator with MPDC/GFPS | AC07, AC12 | D05 |
| L01 | VII phase 1; C concept; P acceptance detail | MPDC/GFPS with departments/barangays | AC01, AC02, AC03, AC07 | D01–09/12 |
| L02 | VII phase 2; C concept; P acceptance detail | MPDC/GFPS with departments/barangays | AC04, AC09, AC12 | Individual row/package prerequisites |
| L03 | VII phase 3; C concept; P acceptance detail; Q08 | MPDC/GFPS with departments/barangays | AC13 | D11/12 |
| L04 | VII phase 4; VIII; IX.7; C concept; P acceptance detail; Q08 | MPDC/GFPS with departments/barangays | AC14 | D12 |
| L05 | VII phase 5; C concept; P acceptance detail; Q08 | MPDC/GFPS with departments/barangays | AC13, AC14 | D10/11/12 |
| L06 | VIII; C concept; P acceptance detail; Q08 | MPDC/GFPS with departments/barangays / budget authority | AC01 | D13 |
| L07 | XI; XII.1; C concept; P acceptance detail; Q08 | MPDC/GFPS with departments/barangays | AC02, AC14 | D02/12 |
| L08 | XII.2; C concept; P acceptance detail; Q08 | MPDC/GFPS with departments/barangays | AC04, AC14 | D08/12 |
| L09 | XII.3; C concept; P acceptance detail; Q08 | MPDC/GFPS with departments/barangays / budget authority | AC14 | D10/13 |
| L10 | XII.4; C concept; P acceptance detail; Q08 | MPDC/GFPS with departments/barangays | AC07, AC14 | D05 |
| L11 | XII.5; C concept; P acceptance detail; Q08 | MPDC/GFPS with departments/barangays | AC09, AC14 | D06/12 |
| L12 | XII.6; C concept; P acceptance detail; Q08 | MPDC/GFPS with departments/barangays | AC14 | D11/12 |

## Consultation handoff and package gates

MPDC/GFPS should review this baseline, [dictionary](DATA_DICTIONARY.md), [D01–D13 options/questions](../OPEN_DECISIONS.md) and representative scenarios together. Record attendance/designation, source version/checksum, each answer and rationale, dissent, evidence, date, authorized signatory, affected IDs and follow-up owner. No invitations or stakeholder messages have been sent.

D02–D05 remain explicitly unresolved: do not finalize assignments, field vocabularies, service counting or confidentiality rules from this draft. Other dependencies remain exactly as in the 14-package plan. Even after a decision is answered, later work requires separate user authorization. WP01 documentation can be reviewed with these questions open; an agreed requirements baseline and stakeholder walkthrough acceptance cannot be claimed yet.
