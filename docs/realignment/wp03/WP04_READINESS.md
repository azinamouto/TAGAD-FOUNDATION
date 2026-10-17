# WP04 readiness

WP03 provides an isolated SQL migration baseline and preservation evidence. WP04 schema implementation is **not authorized by this delivery**. Read alongside [WP01 requirements](../wp01/REQUIREMENTS_BASELINE.md), [data dictionary](../wp01/DATA_DICTIONARY.md), [model plan](../DATA_MODEL_AND_MIGRATION_PLAN.md), and [decision register](../OPEN_DECISIONS.md). All D01-D13 remain open institutional decisions; the D01 source-archive subtask does not close D01.

| Proposal-aligned candidate addition | Required evidence before implementation |
| --- | --- |
| Explicit capability/scope assignments and dataset ownership | D02 persona/action/office/barangay matrix; D05 privacy boundaries; preserve existing accounts and deny unresolved assignments. Importer affiliation is not reliable historical ownership. |
| Versioned beneficiary/sector/sex or gender/category/age definitions | D03 dictionary, D04 counting and D05 purpose; preserve original values and mapping lineage. No invented category conversions. |
| Service activity and participation (or approved aggregate-only path) | D04 grain, repeats/unique persons and attribution; D03/D05/D08 approved fields/sources. Do not convert existing aggregate counts into individual attendance. |
| Versioned GAD indicator/form/grain metadata and observation missingness | D03 units/formulas/denominators, D06 templates, D08 source mappings, D05 suppression. Profile duplicates before adding uniqueness; missing is not numeric zero. |
| Source versions, correction lineage, explicit ownership and publication review | D08 authoritative source files/cadence and D02/D05 scope/release controls. Retain CBMS catalog and observations; select GAD relevance through configuration. |
| Geographic source/version/license/checksum and code aliases | D07 approved roster and geometry, D05 audience; preserve unknowns and original geometry. |
| Report snapshots/template versions and approved workflow metadata | D06 report examples/rounding/signatures, D09 delegated transitions/HGDG/budget rules. Preserve historic outputs and totals. |
| Attachment sensitivity/retention metadata | D05 collection/access/holds/disposal; D10 private storage and recovery inventory. Do not remove evidence objects. |

## Decision gates

| Decision | WP04 / delivery dependency |
| --- | --- |
| D01 | Accepted scope/version and named authority; no feature expansion by inference. |
| D02 | Approved personas, capabilities and office/barangay intersections. |
| D03 | Approved field/category/indicator definitions and versions. |
| D04 | Aggregate versus participation grain, repeat counting and identity rules. |
| D05 | Purpose, minimum sensitive fields, release/suppression and retention. |
| D06 | Official template/formats and report acceptance; no official-output claims. |
| D07 | Verified barangay roster/codes, geographic authority and audience. |
| D08 | Source ownership, source examples, correction/review and relevant GAD subset. |
| D09 | Delegated approval/publication/budget rules; existing role behavior is not authority. |
| D10 | Actual database ledger/DDL/grants, operator, storage, backups and recovery targets; operational rollout blocked until reconciled. |
| D11 | Workload/performance/accessibility/freshness criteria before sizing/index commitments. |
| D12 | Pilot cohort, acceptance/training/support owners; tests do not establish pilot completion. |
| D13 | Costed scope/phasing and recurring operations funding; no budget-fit promise. |

Next authorized package should begin with these evidence gates, then propose additive nullable structures and reversible source-backed mappings. No new GAD module, CBMS feature, policy, schema dictionary or official LGU data was implemented in WP03.
