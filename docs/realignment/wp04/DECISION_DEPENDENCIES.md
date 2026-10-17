# WP04 Decision Dependencies

**Status:** Documentation of D01-D13 decision dependencies blocking WP04 implementation.  
**Date:** 2026-10-17  
**Purpose:** Clearly identify which institutional decisions are required for each proposed schema change or data dictionary concept.  
**Source:** <ref_file file="C:\Users\admin\Documents\TAGAD-FOUNDATION\docs\realignment\OPEN_DECISIONS.md" />

## Overview

All D01-D13 decisions remain **OPEN** as of 2026-10-17. WP04 cannot implement any policy-dependent schema changes without these decisions. This document maps each decision to the data dictionary concepts and schema changes it blocks.

---

## Decision Dependency Matrix

### D01: Proposal Version and Scope

**Decision Required:** Confirm user-supplied I–XIII text, repository source location/version owner, six modules and S01 map priority; distinguish required versus optional enhancements.

**Status:** OPEN

**Blocks:**
- No direct schema changes
- Establishes baseline for all subsequent decisions
- Determines which proposal sections are mandatory vs optional

**Impact:** Without D01, scope interpretation and institutional ownership are undefined. All subsequent decisions depend on D01 establishing the authoritative baseline.

**WP04 Impact:** Low (baseline decision, not blocking specific schema changes)

---

### D02: Personas, Scope, Account Designation

**Decision Required:** Six-persona capability matrix; can one user hold multiple assignments? Office/barangay intersection? Who provisions, deactivates, reviews and exports? Password/reset/session policy?

**Status:** OPEN

**Blocks:**
- **DD15:** Owning office - explicit dataset ownership distinct from importer
- **DD16:** Actor/persona assignment - capability matrix, multi-scope assignments
- **DD34:** Sensitivity and release - permitted audience/actions

**Schema Changes Blocked:**
- Adding `owningOfficeId` to `StatisticalDataset` (requires office assignment semantics)
- Creating persona capability matrix model (requires capability definitions)
- Adding sensitivity classification model (requires persona/action definitions)

**Impact:** Without D02, ownership, access control, and sensitivity classification cannot be implemented. Importer affiliation is not reliable historical ownership.

**WP04 Impact:** Moderate (blocks metadata preservation extensions for ownership and sensitivity)

---

### D03: Data Dictionary

**Decision Required:** Sex versus gender concepts and applicable categories; unknown/refused handling; age bands/reference dates; sectors and overlapping membership; beneficiary types; approved indicators, formulas, denominators and source population.

**Status:** OPEN

**Blocks:**
- **DD06:** Sex/gender concepts - non-binary categories, source label preservation
- **DD07:** Missing demographic value - reason codes (unknown, not collected, refused, not applicable)
- **DD09:** Age observation - age definition and limits
- **DD10:** Age reference date - reference date rules
- **DD11:** Age band - versioned code/label with boundaries and inclusion rules
- **DD13:** Sector membership - versioned code, multi-membership, overlap handling
- **DD14:** Beneficiary type - classification in service context
- **DD19:** Service category - versioned classification
- **DD22:** Reporting period - calendar vs fiscal convention, boundary inclusion
- **DD23:** Indicator definition - versioned metadata, population, grain, source, method, formula, valid range, frequency, steward, sensitivity
- **DD25:** Numerator/denominator - formula semantics, zero-denominator handling
- **DD26:** Unit and numeric value - unit conventions, precision, rounding
- **DD33:** Observation status - status vocabulary (zero, absent, unknown, invalid, suppressed, unavailable)

**Schema Changes Blocked:**
- Expanding `Beneficiary.sex` enum (requires approved categories)
- Adding missing value reason fields (requires approved reason codes)
- Adding age reference date field (requires age calculation rules)
- Creating age band model (requires approved boundaries)
- Creating sector membership model (requires approved definitions and cardinality)
- Creating beneficiary type model (requires approved classification)
- Creating service category model (requires approved vocabulary)
- Extending `StatisticalIndicator` with versioned metadata (requires approved fields)
- Creating observation status model (requires approved vocabulary)

**Impact:** Without D03, vocabulary, categories, and counting rules cannot be implemented. This is the most blocking decision, affecting 13 data dictionary concepts.

**WP04 Impact:** High (blocks most metadata preservation extensions and all functional structures)

---

### D04: Monitoring Grain and Linkage

**Decision Required:** Person-level versus aggregate collection; unique beneficiaries versus attendance/service episodes; service dates/locations; cross-office matching necessity; reconciliation of current manual totals.

**Status:** OPEN

**Blocks:**
- **DD02:** Service activity - actual occurrence model
- **DD03:** Participation - beneficiary-to-activity link
- **DD04:** Aggregate observation - duplicate key definition
- **DD05:** Program/PAP - program participation vs benefit distinction
- **DD14:** Beneficiary type - classification context
- **DD19:** Service category - category to program mapping
- **DD20:** Activity date/range - date precision rules
- **DD21:** Activity location - location precision rules
- **DD24:** Count - grain and counting rules

**Schema Changes Blocked:**
- Creating service activity model (requires grain approval)
- Creating participation model (requires grain and repeat counting rules)
- Defining duplicate key for `StatisticalObservation` (requires approved grain)
- Adding activity date/location fields (requires precision rules)

**Impact:** Without D04, service activities, participation, and counting rules cannot be implemented. This blocks core GAD functionality for tracking actual service delivery.

**WP04 Impact:** High (blocks core functional structures for service tracking)

---

### D05: Confidentiality/Privacy

**Decision Required:** Minimum fields, purposes, processing basis, notices, authorized sensitive users; WCPD/VAWC/health aggregate-only or restricted detail; suppression including complementary cells; retention, legal holds, disposal, subject requests and incident protocols.

**Status:** OPEN

**Blocks:**
- **DD07:** Missing demographic value - collection purpose
- **DD17:** Personal/contact fields - minimum collection purpose
- **DD21:** Activity location - restricted-location handling
- **DD23:** Indicator definition - sensitivity classification
- **DD33:** Observation status - suppression rules
- **DD34:** Sensitivity and release - classification, collection purpose, permitted audience
- **DD35:** Suppression - threshold, rule, version, complementary totals
- **DD38:** Audit and evidence attachment - retention, holds, disposal

**Schema Changes Blocked:**
- Adding missing value reason fields (requires collection purpose)
- Creating sensitivity classification model (requires classification categories)
- Creating suppression rules model (requires thresholds and rules)
- Adding retention/disposal metadata to attachments (requires retention policy)

**Impact:** Without D05, privacy controls, suppression rules, and retention policies cannot be implemented. This is critical for sensitive service data (WCPD/VAWC/health).

**WP04 Impact:** High (blocks privacy controls and sensitive data handling)

---

### D06: Official Reports

**Decision Required:** Current GPB/GAR templates, applicable issuance/version and examples; required sector/barangay/M&E/planning outputs, formats, signatures, rounding, reporting periods and acceptance authority.

**Status:** OPEN

**Blocks:**
- **DD28:** Money/expenditure - currency, rounding, conversion rules
- **DD30:** Report/template snapshot - template version, format, signatures, acceptance authority

**Schema Changes Blocked:**
- Creating report snapshot model (requires template definitions)
- Adding currency field to monetary fields (requires currency convention)
- Adding rounding metadata (requires rounding rules)

**Impact:** Without D06, official report templates and financial reporting rules cannot be implemented.

**WP04 Impact:** Moderate (blocks report generation and financial reporting)

---

### D07: Geographic Authority and Audience

**Decision Required:** Approved 25-barangay roster/codes/aliases; boundary source, date, CRS, license and attribution; islands/multipart handling; public or internal audience; whether verified points suffice temporarily.

**Status:** OPEN

**Blocks:**
- **DD12:** Barangay - approved roster, code/name/alias mapping, verification authority
- **DD18:** Geographic geometry - source, date, CRS, license, checksum, verification authority, audience

**Schema Changes Blocked:**
- Adding geometry metadata fields (CRS, date, license, checksum) (requires verification authority)
- Creating alias mapping for barangays (requires approved roster)
- Setting `geoVerified` to TRUE (requires verification authority)

**Impact:** Without D07, geographic data cannot be claimed as verified or authoritative. Audience rules (public vs internal) cannot be defined.

**WP04 Impact:** Moderate (blocks geometry metadata and verification)

---

### D08: Source Intake and Review

**Decision Required:** Representative approved source files; source-agency/method/version, update cadence, ownership, correction/release rules; which CBMS tables are relevant to GAD.

**Status:** OPEN

**Blocks:**
- **DD04:** Aggregate observation - source ownership
- **DD15:** Owning office - source ownership
- **DD23:** Indicator definition - source, method, steward
- **DD31:** Source reference - version, date, reviewer, checksum
- **DD32:** Batch and correction lineage - reviewer, correction reason, original record
- **DD36:** Publication/verification status - release rules
- **DD37:** Freshness/coverage - update cadence, gaps

**Schema Changes Blocked:**
- Adding source metadata fields (version, date, reviewer, checksum) (requires review workflow)
- Adding correction lineage fields (original record, correction reason, reviewer) (requires approval workflow)
- Adding dataset owning office (requires source ownership rules)
- Defining update cadence (requires source agreement)

**Impact:** Without D08, source provenance, correction lineage, and release rules cannot be implemented. Importer affiliation is not reliable ownership.

**WP04 Impact:** High (blocks source tracking and correction lineage)

---

### D09: GAD Workflow/Budget Rules

**Decision Required:** Named delegation and state transitions, HGDG/budget-rule applicability, publication authorization, corrections after approval; relevant current legal/policy sources including GMEF expectations.

**Status:** OPEN

**Blocks:**
- **DD05:** Program/PAP - budget rules
- **DD27:** Target vs actual - financial rounding, historical corrections
- **DD29:** Gender issue/result - workflow approval
- **DD30:** Report/template snapshot - authorized transitions
- **DD36:** Publication/verification status - publication authorization

**Schema Changes Blocked:**
- Creating workflow state model (requires transition definitions)
- Adding HGDG scoring rules (requires HGDG applicability)
- Defining publication authorization (requires delegation)

**Impact:** Without D09, GAD workflow, budget rules, and publication authorization cannot be implemented. Existing role behavior is not proof of LGU approval.

**WP04 Impact:** Moderate (blocks workflow and publication)

---

### D10: Operations/Security Ownership

**Decision Required:** Hosting owner, environment topology, deployed migration ledger/grants, private storage, backups/PITR and retention, RPO/RTO, restore responsibility, alert/incident support, access reviews.

**Status:** OPEN

**Blocks:**
- **DD38:** Audit and evidence attachment - retention, disposal, storage

**Schema Changes Blocked:**
- Adding retention/disposal metadata (requires retention policy)
- Configuring private storage (requires storage ownership)

**Impact:** Without D10, operational deployment, backup procedures, and retention policies cannot be established. No production availability/compliance claim.

**WP04 Impact:** Low (operational, not schema design)

---

### D11: Real-time/Performance/Accessibility

**Decision Required:** Refresh/latency targets, expected data volumes/concurrency, slow-connectivity constraints, browsers/devices, availability and usability criteria.

**Status:** OPEN

**Blocks:**
- No direct schema changes
- Affects indexing strategy and performance optimization

**Impact:** Without D11, performance targets and accessibility criteria cannot be defined. Indexing strategy cannot be optimized without workload expectations.

**WP04 Impact:** Low (performance tuning, not schema design)

---

### D12: Pilot/Training/Rollout/Outcomes

**Decision Required:** Pilot cohort, acceptance scenarios, training schedule/attendance/proficiency, user-guide owners, support/escalation, quality-review cadence and baseline outcome measures.

**Status:** OPEN

**Blocks:**
- No direct schema changes
- Affects training data and rollout configuration

**Impact:** Without D12, pilot design, training program, and rollout plan cannot be established. Unit tests do not establish pilot completion.

**WP04 Impact:** Low (operational, not schema design)

---

### D13: Budget/Sustainability

**Decision Required:** Confirm PHP 300,000 scope includes training/initial deployment as proposal VIII; recurring hosting/storage/backup/support funding; estimates, phasing and change-control.

**Status:** OPEN

**Blocks:**
- No direct schema changes
- Affects scope prioritization and phasing

**Impact:** Without D13, budget fit, recurring funding, and phasing cannot be confirmed. No claim that current plan fits funding or fixed deadline.

**WP04 Impact:** Low (budgeting, not schema design)

---

## Decision Priority for WP04

### Critical (Blocking Core GAD Functionality)

| Decision | DD Concepts Blocked | Schema Changes Blocked | Priority |
| --- | --- | --- | --- |
| **D03** | 13 | 8 | **HIGHEST** |
| **D04** | 8 | 4 | **HIGHEST** |
| **D05** | 8 | 4 | **HIGHEST** |

### High (Blocking Metadata and Tracking)

| Decision | DD Concepts Blocked | Schema Changes Blocked | Priority |
| --- | --- | --- | --- |
| **D08** | 7 | 3 | **HIGH** |
| **D02** | 3 | 2 | **HIGH** |

### Moderate (Blocking Reports and Geography)

| Decision | DD Concepts Blocked | Schema Changes Blocked | Priority |
| --- | --- | --- | --- |
| **D06** | 2 | 2 | **MODERATE** |
| **D07** | 2 | 1 | **MODERATE** |
| **D09** | 5 | 1 | **MODERATE** |

### Low (Operational, Not Schema Design)

| Decision | DD Concepts Blocked | Schema Changes Blocked | Priority |
| --- | --- | --- | --- |
| **D01** | 0 | 0 | **LOW** |
| **D10** | 1 | 0 | **LOW** |
| **D11** | 0 | 0 | **LOW** |
| **D12** | 0 | 0 | **LOW** |
| **D13** | 0 | 0 | **LOW** |

---

## Dependency Graph

```
D01 (Baseline)
├── D02 (Personas/Scope)
│   ├── DD15 (Owning Office)
│   ├── DD16 (Persona Assignment)
│   └── DD34 (Sensitivity Classification)
│
├── D03 (Data Dictionary)
│   ├── DD06 (Sex/Gender)
│   ├── DD07 (Missing Values)
│   ├── DD09 (Age)
│   ├── DD10 (Age Reference Date)
│   ├── DD11 (Age Bands)
│   ├── DD13 (Sector Membership)
│   ├── DD14 (Beneficiary Type)
│   ├── DD19 (Service Category)
│   ├── DD22 (Reporting Period)
│   ├── DD23 (Indicator Definition)
│   ├── DD25 (Numerator/Denominator)
│   ├── DD26 (Unit/Numeric Value)
│   └── DD33 (Observation Status)
│
├── D04 (Monitoring Grain)
│   ├── DD02 (Service Activity)
│   ├── DD03 (Participation)
│   ├── DD04 (Aggregate Observation)
│   ├── DD05 (Program/PAP)
│   ├── DD14 (Beneficiary Type)
│   ├── DD19 (Service Category)
│   ├── DD20 (Activity Date/Range)
│   ├── DD21 (Activity Location)
│   └── DD24 (Count)
│
├── D05 (Confidentiality/Privacy)
│   ├── DD07 (Missing Values)
│   ├── DD17 (Personal/Contact Fields)
│   ├── DD21 (Activity Location)
│   ├── DD23 (Indicator Definition)
│   ├── DD33 (Observation Status)
│   ├── DD34 (Sensitivity/Release)
│   ├── DD35 (Suppression)
│   └── DD38 (Audit/Attachments)
│
├── D06 (Official Reports)
│   ├── DD28 (Money/Expenditure)
│   └── DD30 (Report Snapshot)
│
├── D07 (Geographic Authority)
│   ├── DD12 (Barangay)
│   └── DD18 (Geographic Geometry)
│
├── D08 (Source Intake/Review)
│   ├── DD04 (Aggregate Observation)
│   ├── DD15 (Owning Office)
│   ├── DD23 (Indicator Definition)
│   ├── DD31 (Source Reference)
│   ├── DD32 (Batch/Correction Lineage)
│   ├── DD36 (Publication/Verification)
│   └── DD37 (Freshness/Coverage)
│
├── D09 (GAD Workflow/Budget Rules)
│   ├── DD05 (Program/PAP)
│   ├── DD27 (Target vs Actual)
│   ├── DD29 (Gender Issue/Result)
│   ├── DD30 (Report Snapshot)
│   └── DD36 (Publication/Verification)
│
├── D10 (Operations/Security)
│   └── DD38 (Audit/Attachments)
│
├── D11 (Performance/Accessibility)
│   └── (No direct schema impact)
│
├── D12 (Pilot/Training)
│   └── (No direct schema impact)
│
└── D13 (Budget/Sustainability)
    └── (No direct schema impact)
```

---

## Recommended Consultation Order

Based on dependency graph and blocking impact:

1. **Phase 1: Foundation (D01, D03)**
   - D01: Establish authoritative baseline
   - D03: Approve data dictionary (blocks 13 concepts, highest priority)

2. **Phase 2: Core Functionality (D04, D05)**
   - D04: Approve monitoring grain (blocks service activities, participation)
   - D05: Approve privacy rules (blocks sensitive data handling)

3. **Phase 3: Source and Access (D02, D08)**
   - D02: Approve personas and scope (blocks ownership, access control)
   - D08: Approve source intake and review (blocks provenance, corrections)

4. **Phase 4: Specialized Domains (D06, D07, D09)**
   - D06: Approve official reports (blocks report generation)
   - D07: Approve geographic authority (blocks geometry verification)
   - D09: Approve GAD workflow (blocks publication)

5. **Phase 5: Operations (D10, D11, D12, D13)**
   - D10: Approve operations/security ownership
   - D11: Approve performance targets
   - D12: Approve pilot/training plan
   - D13: Approve budget and sustainability

---

## Conclusion

**Key Findings:**

1. **All D01-D13 decisions remain OPEN** - no institutional decisions have been made
2. **D03, D04, D05 are highest priority** - blocking 29 data dictionary concepts combined
3. **D03 is the single most blocking decision** - affects 13 concepts (34% of all DD concepts)
4. **No schema changes can be implemented without D01-D13** - all functional gaps are decision-dependent
5. **Policy-independent extensions have limited value** - metadata preservation without decisions is low-value

**WP04 Recommendation:**

Deliver a **design-only PR** documenting the analysis and deferring implementation until D01-D13 decisions are available. No schema changes are justified without institutional decisions.

**Next Steps:**

1. Present decision dependency matrix to LGU/GFPS for review
2. Prioritize D03, D04, D05 consultations (blocking core GAD functionality)
3. Re-evaluate schema implementation after decisions are made
4. Design additive structures based on approved decisions
5. Implement migrations with clear functional requirements
