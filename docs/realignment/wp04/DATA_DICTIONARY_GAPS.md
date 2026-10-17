# WP04 Data Dictionary Gaps Analysis

**Status:** Gap analysis between WP01 data dictionary and existing schema.  
**Date:** 2026-10-17  
**Purpose:** Identify which data dictionary concepts are supported, partially supported, or unsupported by the existing schema.  
**Sources:**
- Data Dictionary: <ref_file file="C:\Users\admin\Documents\TAGAD-FOUNDATION\docs\realignment\wp01\DATA_DICTIONARY.md" />
- Model Inventory: <ref_file file="C:\Users\admin\Documents\TAGAD-FOUNDATION\docs\realignment\wp04\MODEL_INVENTORY.md" />
- Proposal Mapping: <ref_file file="C:\Users\admin\Documents\TAGAD-FOUNDATION\docs\realignment\wp04\PROPOSAL_MODEL_MAPPING.md" />

## Gap Classification

- **FULLY SUPPORTED:** Existing model fully implements the concept with no gaps
- **PARTIALLY SUPPORTED:** Existing model implements the concept but with gaps in metadata or functionality
- **NOT SUPPORTED:** No existing model supports the concept

---

## Grain and Identity

### DD01: Registry Record

**Status:** FULLY SUPPORTED

**Evidence:**
- `Beneficiary.id` (UUID PK) provides stable identifier
- `Beneficiary.officeId` captures source office
- `Beneficiary.encodedById` captures encoder
- No gaps identified

**Decision Dependencies:** D04 (identity rules), D05 (privacy boundaries)

---

### DD02: Service Activity

**Status:** NOT SUPPORTED

**Evidence:**
- No service activity occurrence model exists
- `Program` tracks planned interventions only
- `GADAccomplishment` has fiscal year/quarter but no specific activity date/location
- Cannot derive activity from fiscal year

**Gaps:**
- No activity occurrence model
- No activity date/range field
- No activity location field
- No activity identifier distinct from program

**Decision Dependencies:** D04 (monitoring grain and linkage)

---

### DD03: Participation

**Status:** NOT SUPPORTED

**Evidence:**
- No participation relation exists
- `Beneficiary` has no link to `Program` or `GADAccomplishment`
- Cannot infer participation from registry membership

**Gaps:**
- No participation model
- No beneficiary-to-activity link
- No episode/repeat key
- No cancellation tracking

**Decision Dependencies:** D04 (monitoring grain and linkage), D05 (privacy)

---

### DD04: Aggregate Observation

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `StatisticalObservation` supports aggregate grain
- Has `datasetId`, `tableDefinitionId`, `indicatorId`, `barangayId`, `period`, `numericValue`, `dimensions`

**Gaps:**
- No explicit source version field
- No duplicate key definition (requires D04 approval of grain)
- No source-backing lineage

**Decision Dependencies:** D04 (grain approval), D08 (source ownership)

---

### DD05: Program/PAP

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `Program` captures planned interventions
- `GADPlanItem` links to `GADPlan` with detailed GPB matrix lines
- Distinct from `GADAccomplishment` (reported results)

**Gaps:**
- No source title preservation field
- No explicit owning office on `GADPlanItem`
- Program status enum does not distinguish planned vs submitted

**Decision Dependencies:** D04 (program participation vs benefit), D09 (budget rules)

---

## People, Classification, Geography and Scope

### DD06: Sex/Gender Concepts

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `Beneficiary.sex` enum exists (MALE/FEMALE)

**Gaps:**
- Binary only; no non-binary categories
- No source-provided text preservation
- No field for "other" categories
- Cannot expand without D03 approval

**Decision Dependencies:** D03 (sex/gender concepts and categories)

---

### DD07: Missing Demographic Value

**Status:** NOT SUPPORTED

**Evidence:**
- No explicit missing value reason fields
- `Beneficiary.birthdate` is nullable but no reason captured
- Current defaults in validation are implementation, not policy

**Gaps:**
- No `birthdateReason` field
- No `ageReason` field
- No `sectorReason` field
- No distinction between unknown, not collected, refused, not applicable

**Decision Dependencies:** D03 (vocabulary approval), D05 (collection purpose)

---

### DD08: Birthdate

**Status:** FULLY SUPPORTED

**Evidence:**
- `Beneficiary.birthdate` (DATE, nullable) exists
- No gaps identified

**Decision Dependencies:** D03 (collection choice), D05 (privacy)

---

### DD09: Age Observation

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `Beneficiary.age` (INT) exists
- Migration has CHECK constraint 0-130 (implementation, not policy)

**Gaps:**
- No `ageReferenceDate` field
- Validator is implementation-level, not policy

**Decision Dependencies:** D03 (age definition and limits)

---

### DD10: Age Reference Date

**Status:** NOT SUPPORTED

**Evidence:**
- No explicit age reference date field
- `createdAt` timestamp is not a substitute

**Gaps:**
- No `ageReferenceDate` field
- No reference date source tracking

**Decision Dependencies:** D03 (reference date rules)

---

### DD11: Age Band

**Status:** NOT SUPPORTED

**Evidence:**
- No age band-specific model exists
- `StatisticalDimension` can define dimensions but lacks versioning, boundaries, inclusion rules

**Gaps:**
- No age band model
- No versioned code/label
- No non-overlapping boundaries
- No inclusion rules

**Decision Dependencies:** D03 (age band definitions)

---

### DD12: Barangay

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `Barangay` has `id`, `name`, `code`, `latitude`, `longitude`, `boundary`, `geoSource`, `geoVerified`

**Gaps:**
- No alias mapping
- No CRS metadata
- No license metadata
- No date metadata
- No checksum metadata
- Verification authority not established

**Decision Dependencies:** D07 (geographic authority and audience)

---

### DD13: Sector Membership

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `Beneficiary.sector` (VARCHAR(100)) exists

**Gaps:**
- Single string, not code/version
- No multi-membership support
- No versioning
- No overlap tracking

**Decision Dependencies:** D03 (sector definitions and overlap)

---

### DD14: Beneficiary Type

**Status:** NOT SUPPORTED

**Evidence:**
- No beneficiary type field exists

**Gaps:**
- No beneficiary type classification
- No service context classification

**Decision Dependencies:** D03 (beneficiary type definitions), D04 (classification context)

---

### DD15: Owning Office

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `Beneficiary.officeId` and `Program.officeId` exist
- `StatisticalDataset` has no explicit owning office

**Gaps:**
- `StatisticalDataset` lacks owning office
- Importer affiliation is not reliable historical ownership
- No explicit ownership distinct from encoder

**Decision Dependencies:** D02 (office assignments), D08 (source ownership)

---

### DD16: Actor/Persona Assignment

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `User` has role, officeId, barangayId

**Gaps:**
- No explicit capability matrix
- No multi-scope assignment support
- No effective date ranges
- Role name does not imply scope

**Decision Dependencies:** D02 (personas, scope, account designation)

---

### DD17: Personal/Contact Fields

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `Beneficiary` has firstName, lastName, middleName, contactNumber, addressStreet
- `Household` has household-level grouping

**Gaps:**
- No sensitivity classification
- No minimum collection purpose defined

**Decision Dependencies:** D05 (confidentiality/privacy)

---

### DD18: Geographic Geometry

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `Barangay` has latitude, longitude, boundary, geoSource, geoVerified

**Gaps:**
- No CRS metadata
- No date metadata
- No license metadata
- No checksum metadata
- Verification authority not established

**Decision Dependencies:** D07 (geographic authority and audience)

---

## Time, Services, Measures and Reports

### DD19: Service Category

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `Program.sector` (VARCHAR(100)) exists

**Gaps:**
- Free text, not versioned code
- No service category model
- No mapping to source forms

**Decision Dependencies:** D03 (service category definitions), D04 (category mapping)

---

### DD20: Activity Date/Range

**Status:** NOT SUPPORTED

**Evidence:**
- No activity occurrence model (DD02)
- Cannot fabricate dates from fiscal years

**Gaps:**
- No activity date field
- No activity date range field
- No source precision tracking
- No timezone support

**Decision Dependencies:** D04 (activity occurrence grain)

---

### DD21: Activity Location

**Status:** NOT SUPPORTED

**Evidence:**
- No activity occurrence model (DD02)

**Gaps:**
- No activity location field
- No venue/barangay reference
- No location precision tracking

**Decision Dependencies:** D04 (activity occurrence), D05 (privacy)

---

### DD22: Reporting Period

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `StatisticalDataset` has reportingYear, reportingPeriod
- `GADAccomplishment` has fiscalYear, quarter

**Gaps:**
- No explicit start/end date fields
- Calendar vs fiscal convention not specified
- Boundary inclusion rules not defined

**Decision Dependencies:** D03 (reporting period semantics), D04 (boundary inclusion)

---

### DD23: Indicator Definition

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `StatisticalIndicator` has code, name, title, formula, numerator, denominator
- `GADPlanItem.performanceIndicator` has narrative indicator

**Gaps:**
- No version field
- No purpose field
- No population field
- No grain field
- No source field
- No method field
- No valid range field
- No frequency field
- No steward field
- No sensitivity field
- No acceptance evidence field

**Decision Dependencies:** D03 (indicator definitions), D08 (source ownership), D05 (sensitivity)

---

### DD24: Count

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `Program.targetMale/targetFemale/actualMale/actualFemale` exist
- `GADAccomplishment.actualMale/actualFemale` exist
- `StatisticalObservation.numericValue` exists

**Gaps:**
- Grain not explicitly defined
- Negative values not blocked in schema

**Decision Dependencies:** D04 (grain and counting rules)

---

### DD25: Numerator/Denominator

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `StatisticalIndicator.numeratorDefinition/denominatorDefinition` (TEXT) exist

**Gaps:**
- Free text, not executable
- No zero-denominator handling
- No population reference

**Decision Dependencies:** D03 (formula semantics)

---

### DD26: Unit and Numeric Value

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `StatisticalObservation.numericValue` (DECIMAL(18,4)) exists
- `StatisticalObservation.unit` (VARCHAR(100)) exists

**Gaps:**
- Unit is free text
- No precision metadata
- No rounding metadata

**Decision Dependencies:** D03 (unit definitions)

---

### DD27: Target vs Actual

**Status:** FULLY SUPPORTED

**Evidence:**
- `Program.budgetTarget/budgetActual` exist
- `Program.targetMale/targetFemale/actualMale/actualFemale` exist
- No gaps identified

**Decision Dependencies:** D04 (counting rules), D09 (budget rules)

---

### DD28: Money/Expenditure

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `Program.budgetTarget/budgetActual` exist
- `GADPlanItem.budget` exists
- `GADAccomplishment.actualBudgetUsed` exists

**Gaps:**
- No explicit currency field (assumes PHP)
- No rounding metadata
- No conversion rules

**Decision Dependencies:** D06 (official reports and budget rules)

---

### DD29: Gender Issue/Result

**Status:** FULLY SUPPORTED

**Evidence:**
- `GADPlanItem.genderIssue/gadResult` (TEXT) exist
- No gaps identified

**Decision Dependencies:** D09 (workflow and approval)

---

### DD30: Report/Template Snapshot

**Status:** NOT SUPPORTED

**Evidence:**
- No report snapshot model exists

**Gaps:**
- No report type field
- No template version field
- No source versions field
- No scope field
- No dictionary/formula versions field
- No generation time field
- No authorized actor field

**Decision Dependencies:** D06 (official reports), D09 (workflow/budget rules)

---

## Provenance, Quality, Confidentiality and Lifecycle

### DD31: Source Reference

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `StatisticalProvenance` has sourceAgency, sourceFileName, sourceDocument, methodologyNotes

**Gaps:**
- No source version field
- No source date field
- No received date field
- No reviewer field
- No checksum field

**Decision Dependencies:** D08 (source intake and review)

---

### DD32: Batch and Correction Lineage

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `StatisticalDataset.ingestionBatchId` exists
- `StatisticalProvenance.ingestionBatchId` exists

**Gaps:**
- No original record/version reference
- No correction reason field
- No reviewer field
- No idempotence rule enforcement

**Decision Dependencies:** D08 (correction/release rules)

---

### DD33: Observation Status

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `StatisticalObservation.suppressionStatus/reason` exist

**Gaps:**
- Conflates suppression with missingness
- No explicit zero/absent/unknown/invalid/unavailable distinction
- No reason codes for missingness

**Decision Dependencies:** D03 (status vocabulary), D05 (suppression rules)

---

### DD34: Sensitivity and Release

**Status:** NOT SUPPORTED

**Evidence:**
- No sensitivity classification exists
- No release decision tracking

**Gaps:**
- No classification field
- No collection purpose field
- No permitted audience field
- No permitted actions field
- No release decision field
- No evidence field

**Decision Dependencies:** D05 (confidentiality/privacy), D02 (personas and scope)

---

### DD35: Suppression

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `StatisticalObservation.suppressionStatus/reason` exist

**Gaps:**
- Free text, not approved rule/version
- No threshold field
- No complementary totals tracking
- No repeated filter tracking

**Decision Dependencies:** D05 (suppression rules)

---

### DD36: Publication/Verification Status

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `StatisticalDataset.publicationStatus/verificationStatus` enums exist

**Gaps:**
- No proof of LGU approval
- No authorized transition definitions
- No acceptance evidence

**Decision Dependencies:** D08 (source release), D09 (delegated approval)

---

### DD37: Freshness/Coverage

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `StatisticalDataset.reportingYear/reportingPeriod` exist
- `StatisticalObservation.createdAt` exists

**Gaps:**
- No expected cadence field
- No gap tracking
- No last validated update field

**Decision Dependencies:** D08 (source ownership and cadence)

---

### DD38: Audit and Evidence Attachment

**Status:** PARTIALLY SUPPORTED

**Evidence:**
- `AuditLog` exists
- `MOVAttachment` exists

**Gaps:**
- No sensitivity classification on attachments
- No retention/disposal tracking
- No hold tracking

**Decision Dependencies:** D05 (retention), D10 (operations/security)

---

## Summary Statistics

| Support Level | Count | Percentage |
| --- | --- | --- |
| **FULLY SUPPORTED** | 4 | 10.5% |
| **PARTIALLY SUPPORTED** | 20 | 52.6% |
| **NOT SUPPORTED** | 14 | 36.8% |
| **TOTAL** | 38 | 100% |

---

## Gaps by Decision Dependency

| Decision | Gap Count | DD IDs |
| --- | --- | --- |
| **D02** | 3 | DD15, DD16, DD34 |
| **D03** | 11 | DD06, DD07, DD09, DD10, DD11, DD13, DD14, DD19, DD22, DD23, DD25, DD26 |
| **D04** | 8 | DD02, DD03, DD04, DD05, DD14, DD19, DD20, DD21, DD24 |
| **D05** | 8 | DD07, DD17, DD21, DD23, DD33, DD34, DD35, DD38 |
| **D06** | 2 | DD28, DD30 |
| **D07** | 2 | DD12, DD18 |
| **D08** | 5 | DD04, DD15, DD23, DD31, DD32, DD36, DD37 |
| **D09** | 3 | DD05, DD27, DD29, DD30, DD36 |

**Note:** Some DD IDs have multiple decision dependencies.

---

## Critical Gaps Blocking GAD Functionality

The following gaps are **critical** for core GAD functionality and are blocked by institutional decisions:

1. **DD02: Service Activity** (blocked by D04) - Cannot track actual occurrences
2. **DD03: Participation** (blocked by D04, D05) - Cannot link beneficiaries to activities
3. **DD06: Sex/Gender Concepts** (blocked by D03) - Cannot support non-binary categories
4. **DD11: Age Band** (blocked by D03) - Cannot support age-disaggregated reporting
5. **DD13: Sector Membership** (blocked by D03) - Cannot support overlapping sectors
6. **DD23: Indicator Definition** (blocked by D03, D08, D05) - Cannot standardize indicators
7. **DD34: Sensitivity Classification** (blocked by D02, D05) - Cannot control data access

**Total Critical Gaps:** 7
**Blocking Decisions:** D02, D03, D04, D05, D08

---

## Conclusion

**Key Findings:**

1. **52.6% of data dictionary concepts are partially supported** - existing models provide foundation but lack metadata or functionality
2. **36.8% of concepts are not supported** - require new models or structural changes
3. **Only 10.5% are fully supported** - beneficiary ID, birthdate, target/actual, gender issue/result

2. **Most gaps are blocked by D03, D04, and D05** - data dictionary, monitoring grain, and privacy decisions
3. **Critical GAD functionality gaps are all blocked** - service activities, participation, sex categories, age bands, sector membership, indicator definitions, sensitivity classification

**Implication for WP04:**

Given that:
- All critical gaps are blocked by D01-D13
- Partially supported concepts require institutional decisions to add metadata
- No schema changes can close critical gaps without decisions

WP04 should deliver a **design-only PR** documenting the gap analysis and deferring implementation until institutional decisions are available.

**Next Steps:**

1. Document decision dependencies clearly for LGU/GFPS review
2. Prioritize D03, D04, D05 decisions (blocking 67% of gaps)
3. Design additive structures for deferred concepts after decisions are made
4. Implement policy-independent metadata preservation only if justified by functional requirements
