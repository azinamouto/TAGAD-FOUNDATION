# WP04 Proposal-to-Model Mapping

**Status:** Mapping of GAD-SDD proposal requirements to existing models (PR #45 baseline).  
**Date:** 2026-10-17  
**Purpose:** Identify reuse, extension, and deferral opportunities. Avoid duplicate tables and CBMS expansion.  
**Sources:** 
- Proposal: <ref_file file="C:\Users\admin\Documents\TAGAD-FOUNDATION\docs\requirements\TALIBON_GAD_SDD_PROPOSAL.md" />
- Data Dictionary: <ref_file file="C:\Users\admin\Documents\TAGAD-FOUNDATION\docs\realignment\wp01\DATA_DICTIONARY.md" />
- Model Inventory: <ref_file file="C:\Users\admin\Documents\TAGAD-FOUNDATION\docs\realignment\wp04\MODEL_INVENTORY.md" />
- Open Decisions: <ref_file file="C:\Users\admin\Documents\TAGAD-FOUNDATION\docs\realignment\OPEN_DECISIONS.md" />

## Methodology

For each proposal requirement (organized by data dictionary concept DD01-DD38), classify as:

- **REUSE:** Existing model fully supports the requirement with no schema changes needed
- **EXTEND:** Existing model can be extended with additive, nullable fields without breaking existing data
- **DEFER:** Requires institutional decision (D01-D13) or structural change that cannot be justified as policy-independent
- **NEW ADDITIVE:** Policy-independent additive structure can be created (nullable, reversible, preserves existing data)

**Constraint:** Do not fabricate sex categories, age bands, identity matching, reporting formulas, or sensitive-data rules.

---

## Mapping by Data Dictionary Concept

### DD01: Registry Record

**Proposal:** Stable record identifier for a person registered by a source/office.

**Existing Model:** `Beneficiary` (UUID PK)

**Classification:** **REUSE**

**Rationale:**
- UUID PK provides stable identifier
- `officeId` and `encodedById` capture source and encoder
- No schema changes needed

**Dependencies:** D04 (identity rules), D05 (privacy boundaries)

**Action:** None. Preserve existing beneficiary records.

---

### DD02: Service Activity

**Proposal:** Identified occurrence of a program/activity/project/service with actual date/location.

**Existing Model:** None

**Classification:** **DEFER**

**Rationale:**
- No service activity occurrence model exists
- Current `Program` tracks planned interventions, not actual occurrences
- `GADAccomplishment` has fiscal year/quarter but no specific activity date/location
- Creating an activity model requires D04 approval of grain (episodes vs unique persons)
- Cannot fabricate activity dates from fiscal years

**Dependencies:** D04 (monitoring grain and linkage)

**Action:** Defer until D04 resolves grain, repeats, and identity rules.

---

### DD03: Participation

**Proposal:** Authorized source record linking beneficiary reference to activity/service.

**Existing Model:** None

**Classification:** **DEFER**

**Rationale:**
- No participation relation exists
- `Beneficiary` has no link to `Program` or `GADAccomplishment`
- Requires DD02 (service activity) model first
- Requires D04 approval of participation grain and repeat counting rules
- Cannot infer participation from registry membership

**Dependencies:** D04 (monitoring grain and linkage), D05 (privacy)

**Action:** Defer until D04 resolves participation unit and eligibility.

---

### DD04: Aggregate Observation

**Proposal:** One measure for one source version, period, geography, and full dimension tuple.

**Existing Model:** `StatisticalObservation`

**Classification:** **EXTEND (conditional)**

**Rationale:**
- `StatisticalObservation` has `datasetId`, `tableDefinitionId`, `indicatorId`, `barangayId`, `period`, `numericValue`, `dimensions` (JSON)
- Supports aggregate grain
- Missing: Explicit source version field, duplicate key definition
- Duplicate key cannot be defined until D04 approves grain
- Cannot manufacture person records from aggregates

**Policy-Independent Extension Possible:**
- Add nullable `sourceVersion` VARCHAR(100) to preserve source version string
- Add nullable `originalRecordId` UUID to track correction lineage (DD32)
- These are additive, nullable, and preserve existing data

**Dependencies:** D04 (grain approval for duplicate key), D08 (source ownership)

**Action:** Consider adding nullable source version and original record ID fields after confirming they are policy-independent.

---

### DD05: Program/PAP

**Proposal:** Identified planned intervention, distinct from occurrence and reported accomplishment.

**Existing Model:** `Program`, `GADPlanItem`

**Classification:** **REUSE (with metadata gaps)**

**Rationale:**
- `Program` captures planned interventions with `title`, `description`, `sector`, `fiscalYear`, `status`, `budgetTarget`
- `GADPlanItem` links to `GADPlan` and provides detailed GPB matrix lines
- Distinct from `GADAccomplishment` (reported results)
- Gaps: No source title preservation, no explicit owning office on `GADPlanItem`

**Dependencies:** D04 (program participation vs benefit), D09 (budget rules)

**Action:** REUSE. Preserve existing program and plan item records. No schema changes needed.

---

### DD06: Sex/Gender Concepts

**Proposal:** Preserve source concept label and reported code/text. Male/female are source wording; separate concepts only when approved.

**Existing Model:** `Beneficiary.sex` (enum: MALE/FEMALE)

**Classification:** **DEFER**

**Rationale:**
- Current enum is binary only (MALE/FEMALE)
- Does not preserve source-provided text
- No field for "other" categories or source labels
- Expanding enum or adding text field requires D03 approval of sex/gender concepts and categories
- Cannot infer categories from names or service

**Dependencies:** D03 (data dictionary - sex/gender concepts)

**Action:** Defer until D03 approves sex/gender categories and vocabulary.

---

### DD07: Missing Demographic Value

**Proposal:** Explicit reason if authorized: unknown, not collected, refused, not applicable. Distinct from reported category.

**Existing Model:** None (beneficiary fields use null or defaults)

**Classification:** **NEW ADDITIVE (conditional)**

**Rationale:**
- No explicit missing value reason fields exist
- Current `Beneficiary.birthdate` is nullable, but no reason captured
- Current `Beneficiary.age` has default 0 in some contexts (not policy)
- Adding nullable `birthdateReason`, `ageReason`, `sectorReason` fields is policy-independent
- Reason codes would be free text until D03 approves vocabulary
- Preserves existing data (null reason = no reason recorded)

**Policy-Independent Extension Possible:**
- Add nullable `birthdateReason` VARCHAR(50) to `Beneficiary`
- Add nullable `ageReason` VARCHAR(50) to `Beneficiary`
- Add nullable `sectorReason` VARCHAR(50) to `Beneficiary`
- These fields do not define valid categories; they only preserve source-reported reasons

**Dependencies:** D03 (vocabulary approval for reason codes), D05 (collection purpose)

**Action:** Consider adding nullable reason fields as policy-independent metadata preservation.

---

### DD08: Birthdate

**Proposal:** Source-supplied calendar date only when necessary/authorized; absent allowed.

**Existing Model:** `Beneficiary.birthdate` (DATE, nullable)

**Classification:** **REUSE**

**Rationale:**
- Field exists and is nullable
- No schema changes needed
- Never infer date from age (application logic constraint)

**Dependencies:** D03 (collection choice), D05 (privacy)

**Action:** None. Preserve existing birthdate data.

---

### DD09: Age Observation

**Proposal:** Whole completed years at explicitly recorded reference date. Reject invalid values under approved limits.

**Existing Model:** `Beneficiary.age` (INT)

**Classification:** **EXTEND (conditional)**

**Rationale:**
- Field exists as INT
- Migration has CHECK constraint 0-130 (implementation, not policy)
- Missing: `ageReferenceDate` field (DD10)
- Cannot adopt 0-150 validator as policy (requires D03 approval)

**Policy-Independent Extension Possible:**
- Add nullable `ageReferenceDate` DATE to `Beneficiary` to preserve reference date
- Do not change validation logic (application-level, not schema)

**Dependencies:** D03 (age definition and limits)

**Action:** Consider adding nullable age reference date field. Do not change validation without D03.

---

### DD10: Age Reference Date

**Proposal:** Calendar date used for age or age-group assignment; source/reference/activity basis recorded.

**Existing Model:** None

**Classification:** **NEW ADDITIVE**

**Rationale:**
- No explicit age reference date field exists
- Entry timestamp (`createdAt`) is not a substitute
- Adding nullable `ageReferenceDate` DATE to `Beneficiary` is policy-independent
- Preserves source-reported reference date
- Does not define age calculation rules (application logic)

**Dependencies:** D03 (reference date rules)

**Action:** Add nullable `ageReferenceDate` DATE to `Beneficiary` as metadata preservation.

---

### DD11: Age Band

**Proposal:** Versioned code/label with non-overlapping lower/upper boundaries and inclusion rules.

**Existing Model:** `StatisticalDimension` (partial support)

**Classification:** **DEFER**

**Rationale:**
- `StatisticalDimension` can define dimensions but lacks versioning, boundaries, and inclusion rules
- No age band-specific model exists
- Requires D03 approval of age band definitions, boundaries, and overlap rules
- Cannot invent age thresholds

**Dependencies:** D03 (age band definitions)

**Action:** Defer until D03 approves age band boundaries and rules.

---

### DD12: Barangay

**Proposal:** Stable reference to approved geography; preserve UUID and source code/name/alias mapping.

**Existing Model:** `Barangay`

**Classification:** **REUSE (with metadata gaps)**

**Rationale:**
- `Barangay` has `id`, `name`, `code`, `latitude`, `longitude`, `boundary`, `geoSource`, `geoVerified`
- Supports UUID and code/name preservation
- Gaps: No alias mapping, no CRS, no license, no date, no checksum
- Geometry verification authority not established (D07)

**Dependencies:** D07 (geographic authority and audience)

**Action:** REUSE. Preserve existing barangay records. Do not claim verified status without D07.

---

### DD13: Sector Membership

**Proposal:** Source-defined population grouping; code/version, potentially multiple memberships.

**Existing Model:** `Beneficiary.sector` (single VARCHAR(100))

**Classification:** **DEFER**

**Rationale:**
- Current field is single string, not code/version
- No multi-membership support
- No versioning
- Requires D03 approval of sector definitions, overlap, and cardinality
- Cannot silently equate to beneficiary type

**Dependencies:** D03 (sector definitions and overlap)

**Action:** Defer until D03 approves sector vocabulary and cardinality.

---

### DD14: Beneficiary Type

**Proposal:** Source classification of recipient in service context; code/version.

**Existing Model:** None

**Classification:** **DEFER**

**Rationale:**
- No beneficiary type field exists
- Requires D03 approval of beneficiary type definitions
- Requires D04 approval of classification context

**Dependencies:** D03 (beneficiary type definitions), D04 (classification context)

**Action:** Defer until D03/D04 approve beneficiary type.

---

### DD15: Owning Office

**Proposal:** Institution accountable for record/dataset independent of encoder assignment.

**Existing Model:** `Office` (partial), `Beneficiary.officeId`, `Program.officeId`

**Classification:** **EXTEND (conditional)**

**Rationale:**
- `Beneficiary.officeId` and `Program.officeId` exist but are nullable
- `StatisticalDataset` has no explicit owning office field
- `importer affiliation` is not reliable historical ownership
- Adding nullable `owningOfficeId` to `StatisticalDataset` is policy-independent

**Policy-Independent Extension Possible:**
- Add nullable `owningOfficeId` UUID FK to `StatisticalDataset`
- This captures explicit ownership distinct from importer

**Dependencies:** D02 (office assignments), D08 (source ownership)

**Action:** Consider adding nullable owning office ID to StatisticalDataset.

---

### DD16: Actor/Persona Assignment

**Proposal:** Designated user, permitted actions, office/barangay scope and effective assignment.

**Existing Model:** `User` (role, officeId, barangayId)

**Classification:** **DEFER**

**Rationale:**
- `User` has role, office, barangay but no explicit capability matrix
- No multi-scope assignment support
- No effective date ranges
- Requires D02 approval of persona/action/office/barangay matrix
- Cannot infer scope from role name

**Dependencies:** D02 (personas, scope, account designation)

**Action:** Defer until D02 approves capability matrix.

---

### DD17: Personal/Contact Fields

**Proposal:** Name/contact/address/household identifiers only where minimum necessary and approved.

**Existing Model:** `Beneficiary` (firstName, lastName, middleName, contactNumber, addressStreet), `Household`

**Classification:** **REUSE (with sensitivity gaps)**

**Rationale:**
- Fields exist
- No sensitivity classification
- Requires D05 approval of minimum collection purpose

**Dependencies:** D05 (confidentiality/privacy)

**Action:** REUSE. Preserve existing fields. Do not expand without D05.

---

### DD18: Geographic Geometry

**Proposal:** Source-supplied boundary or point, with CRS, date, license, stable-code mapping and verification evidence.

**Existing Model:** `Barangay` (latitude, longitude, boundary, geoSource, geoVerified)

**Classification:** **EXTEND (conditional)**

**Rationale:**
- Geometry fields exist but lack CRS, date, license, checksum
- `geoVerified` is boolean without verification authority
- Adding nullable metadata fields is policy-independent

**Policy-Independent Extension Possible:**
- Add nullable `geometryCrs` VARCHAR(50) to `Barangay`
- Add nullable `geometryDate` DATE to `Barangay`
- Add nullable `geometryLicense` VARCHAR(255) to `Barangay`
- Add nullable `geometryChecksum` VARCHAR(64) to `Barangay`
- These preserve source metadata without claiming verification

**Dependencies:** D07 (geographic authority and audience)

**Action:** Consider adding nullable geometry metadata fields to Barangay.

---

### DD19: Service Category

**Proposal:** Versioned classification of service offered/received; mapped source form.

**Existing Model:** `Program.sector` (VARCHAR(100))

**Classification:** **DEFER**

**Rationale:**
- `Program.sector` is free text, not versioned code
- No service category model exists
- Requires D03 approval of service category vocabulary
- Requires D04 approval of category to program mapping

**Dependencies:** D03 (service category definitions), D04 (category mapping)

**Action:** Defer until D03/D04 approve service categories.

---

### DD20: Activity Date/Range

**Proposal:** Actual occurrence date or date interval, with source precision and timezone.

**Existing Model:** None (requires DD02 model)

**Classification:** **DEFER**

**Rationale:**
- No activity occurrence model (DD02)
- Cannot fabricate dates from fiscal years
- Requires D04 approval of date precision rules

**Dependencies:** D04 (activity occurrence grain)

**Action:** Defer until DD02 model is created and D04 approved.

---

### DD21: Activity Location

**Proposal:** Venue/barangay or approved broader location for occurrence.

**Existing Model:** None (requires DD02 model)

**Classification:** **DEFER**

**Rationale:**
- No activity occurrence model (DD02)
- Requires D04 approval of location precision
- Requires D05 approval of restricted-location handling

**Dependencies:** D04 (activity occurrence), D05 (privacy)

**Action:** Defer until DD02 model is created and D04/D05 approved.

---

### DD22: Reporting Period

**Proposal:** Explicit start/end or source period code plus calendar/fiscal convention.

**Existing Model:** `StatisticalDataset` (reportingYear, reportingPeriod), `GADAccomplishment` (fiscalYear, quarter)

**Classification:** **REUSE (with semantic gaps)**

**Rationale:**
- Fields exist but semantic conventions not defined
- No explicit start/end date fields
- Calendar vs fiscal convention not specified
- Requires D03 approval of period semantics

**Dependencies:** D03 (reporting period semantics), D04 (boundary inclusion)

**Action:** REUSE. Preserve existing period fields. Do not assume conventions.

---

### DD23: Indicator Definition

**Proposal:** Stable code, label, version, purpose, population, grain, unit, dimensions, source/method, formula, numerator/denominator, valid range, frequency, steward, sensitivity, acceptance evidence.

**Existing Model:** `StatisticalIndicator`, `GADPlanItem.performanceIndicator`

**Classification:** **DEFER**

**Rationale:**
- `StatisticalIndicator` has partial metadata (code, name, title, formula, numerator, denominator)
- Missing: version, purpose, population, grain, source, method, valid range, frequency, steward, sensitivity, acceptance evidence
- `GADPlanItem.performanceIndicator` is free text
- Requires D03 approval of indicator definition fields
- Requires D08 approval of source/method
- Requires D05 approval of sensitivity classification

**Dependencies:** D03 (indicator definitions), D08 (source ownership), D05 (sensitivity)

**Action:** Defer until D03/D08/D05 approve indicator metadata structure.

---

### DD24: Count

**Proposal:** Number of approved units at declared grain; nonnegative whole number when genuinely a count.

**Existing Model:** `Program.targetMale/targetFemale/actualMale/actualFemale`, `GADAccomplishment.actualMale/actualFemale`, `StatisticalObservation.numericValue`

**Classification:** **REUSE (with grain gaps)**

**Rationale:**
- Count fields exist
- Grain not explicitly defined (requires D04)
- Negative values not blocked in schema (application logic)

**Dependencies:** D04 (grain and counting rules)

**Action:** REUSE. Preserve existing counts. Do not assume grain.

---

### DD25: Numerator/Denominator

**Proposal:** Quantities with same declared population, scope, and period as approved formula.

**Existing Model:** `StatisticalIndicator.numeratorDefinition/denominatorDefinition` (TEXT)

**Classification:** **EXTEND (conditional)**

**Rationale:**
- Fields exist as free text
- No executable structure
- No zero-denominator handling
- Requires D03 approval of formula semantics

**Policy-Independent Extension Possible:**
- Add nullable `denominatorPopulation` VARCHAR(255) to preserve population reference
- This is metadata preservation, not formula execution

**Dependencies:** D03 (formula semantics)

**Action:** REUSE with metadata extension. Do not execute formulas without D03.

---

### DD26: Unit and Numeric Value

**Proposal:** Declared unit, precision, rounding; distinguish people, events, currency, rates.

**Existing Model:** `StatisticalObservation.numericValue` (DECIMAL(18,4)), `StatisticalObservation.unit` (VARCHAR(100))

**Classification:** **REUSE (with semantic gaps)**

**Rationale:**
- Fields exist
- Unit is free text
- No precision/rounding metadata
- Requires D03 approval of unit conventions

**Dependencies:** D03 (unit definitions)

**Action:** REUSE. Preserve existing values. Do not assume unit semantics.

---

### DD27: Target vs Actual

**Proposal:** Planned intended output versus source-evidenced result.

**Existing Model:** `Program.budgetTarget/budgetActual`, `Program.targetMale/targetFemale/actualMale/actualFemale`

**Classification:** **REUSE**

**Rationale:**
- Fields exist and are distinct
- No schema changes needed

**Dependencies:** D04 (counting rules), D09 (budget rules)

**Action:** None. Preserve existing target/actual pairs.

---

### DD28: Money/Expenditure

**Proposal:** Source currency and exact decimal amount; planned allocation and actual expenditure distinct.

**Existing Model:** `Program.budgetTarget/budgetActual`, `GADPlanItem.budget`, `GADAccomplishment.actualBudgetUsed`

**Classification:** **REUSE (with currency gaps)**

**Rationale:**
- Decimal fields exist
- No explicit currency field (assumes PHP)
- No rounding metadata
- Requires D06 approval of budget rules

**Dependencies:** D06 (official reports and budget rules)

**Action:** REUSE. Preserve existing monetary values. Do not assume currency without D06.

---

### DD29: Gender Issue/Result

**Proposal:** Human-reviewed source narrative tied to evidence.

**Existing Model:** `GADPlanItem.genderIssue/gadResult`

**Classification:** **REUSE**

**Rationale:**
- Fields exist as TEXT
- No schema changes needed
- Narratives are human-reviewed by definition

**Dependencies:** D09 (workflow and approval)

**Action:** None. Preserve existing narratives.

---

### DD30: Report/Template Snapshot

**Proposal:** Report type, template version, source versions, scope, period, dictionary/formula versions, generation time, authorized actor.

**Existing Model:** `GADAccomplishment` (fiscalYear, quarter)

**Classification:** **DEFER**

**Rationale:**
- No report snapshot model exists
- No template version reference
- Requires D06 approval of official templates
- Requires D09 approval of workflow transitions

**Dependencies:** D06 (official reports), D09 (workflow/budget rules)

**Action:** Defer until D06/D09 approve report structure.

---

### DD31: Source Reference

**Proposal:** Agency/custodian, source document/file/table, source version/date, method, period, received date, reviewer, checksum.

**Existing Model:** `StatisticalProvenance` (partial)

**Classification:** **EXTEND (conditional)**

**Rationale:**
- `StatisticalProvenance` has sourceAgency, sourceFileName, sourceDocument, methodologyNotes
- Missing: source version, source date, received date, reviewer, checksum
- Adding nullable metadata fields is policy-independent

**Policy-Independent Extension Possible:**
- Add nullable `sourceVersion` VARCHAR(100) to `StatisticalProvenance`
- Add nullable `sourceDate` DATE to `StatisticalProvenance`
- Add nullable `receivedDate` DATE to `StatisticalProvenance`
- Add nullable `reviewerId` UUID FK to `StatisticalProvenance`
- Add nullable `checksum` VARCHAR(64) to `StatisticalProvenance`
- These preserve source metadata without claiming authority

**Dependencies:** D08 (source intake and review)

**Action:** Consider adding nullable source metadata fields to StatisticalProvenance.

---

### DD32: Batch and Correction Lineage

**Proposal:** Identifies submission, retry, original record/version, correction reason, reviewer.

**Existing Model:** `StatisticalDataset.ingestionBatchId`, `StatisticalProvenance.ingestionBatchId`

**Classification:** **EXTEND (conditional)**

**Rationale:**
- Batch ID exists
- Missing: original record/version reference, correction reason, reviewer
- Adding nullable lineage fields is policy-independent

**Policy-Independent Extension Possible:**
- Add nullable `originalRecordId` UUID to `StatisticalObservation` (track corrections)
- Add nullable `correctionReason` VARCHAR(255) to `StatisticalObservation`
- Add nullable `reviewerId` UUID FK to `StatisticalObservation`
- These preserve correction history without defining approval rules

**Dependencies:** D08 (correction/release rules)

**Action:** Consider adding nullable correction lineage fields to StatisticalObservation.

---

### DD33: Observation Status

**Proposal:** Measured zero, absent, unknown, invalid, suppressed, unavailable have separate meanings.

**Existing Model:** `StatisticalObservation.suppressionStatus/reason`

**Classification:** **DEFER**

**Rationale:**
- Current model conflates suppression with missingness
- No explicit zero/absent/unknown/invalid/unavailable distinction
- Requires D03 approval of status vocabulary
- Requires D05 approval of suppression rules

**Dependencies:** D03 (status vocabulary), D05 (suppression rules)

**Action:** Defer until D03/D05 approve observation status semantics.

---

### DD34: Sensitivity and Release

**Proposal:** Classification, collection purpose, permitted audience/actions, release decision and evidence.

**Existing Model:** None

**Classification:** **DEFER**

**Rationale:**
- No sensitivity classification exists
- No release decision tracking
- Requires D05 approval of sensitivity categories
- Requires D02 approval of audience/actions

**Dependencies:** D05 (confidentiality/privacy), D02 (personas and scope)

**Action:** Defer until D02/D05 approve sensitivity classification.

---

### DD35: Suppression

**Proposal:** Withheld output under approved release rules, including complementary totals and repeated filters.

**Existing Model:** `StatisticalObservation.suppressionStatus/reason`

**Classification:** **DEFER**

**Rationale:**
- Fields exist but as free text
- No approved threshold/rule/version
- Complementary totals not tracked
- Requires D05 approval of suppression rules

**Dependencies:** D05 (suppression rules)

**Action:** Defer until D05 approves suppression thresholds and rules.

---

### DD36: Publication/Verification Status

**Proposal:** Source quality and permission to release are separate concepts.

**Existing Model:** `StatisticalDataset.publicationStatus/verificationStatus`

**Classification:** **REUSE (with authority gaps)**

**Rationale:**
- Enum fields exist
- No proof of LGU approval
- Authorized transitions not defined
- Requires D08 approval of release rules
- Requires D09 approval of publication authority

**Dependencies:** D08 (source release), D09 (delegated approval)

**Action:** REUSE. Preserve existing status fields. Do not claim official authenticity.

---

### DD37: Freshness/Coverage

**Proposal:** Source period, last validated update, expected cadence, known gaps.

**Existing Model:** `StatisticalDataset.reportingYear/reportingPeriod`, `StatisticalObservation.createdAt`

**Classification:** **REUSE (with metadata gaps)**

**Rationale:**
- Timestamps exist
- No expected cadence field
- No gap tracking
- Requires D08 approval of update cadence

**Dependencies:** D08 (source ownership and cadence)

**Action:** REUSE. Preserve existing timestamps. Do not invent SLA.

---

### DD38: Audit and Evidence Attachment

**Proposal:** Actor/action/scope/time/result and permitted source evidence.

**Existing Model:** `AuditLog`, `MOVAttachment`

**Classification:** **REUSE (with sensitivity gaps)**

**Rationale:**
- Audit log exists
- MOV attachment exists
- No sensitivity classification on attachments
- No retention/disposal tracking
- Requires D05 approval of retention policy
- Requires D10 approval of storage/disposal

**Dependencies:** D05 (retention), D10 (operations/security)

**Action:** REUSE. Preserve existing audit trail. Do not remove evidence.

---

## Summary Statistics

| Classification | Count | Examples |
| --- | --- | --- |
| **REUSE** | 14 | DD01, DD05, DD08, DD12, DD17, DD22, DD24, DD26, DD27, DD28, DD29, DD36, DD37, DD38 |
| **EXTEND (conditional)** | 8 | DD04, DD09, DD15, DD18, DD25, DD31, DD32 |
| **NEW ADDITIVE (conditional)** | 2 | DD07, DD10 |
| **DEFER** | 14 | DD02, DD03, DD06, DD11, DD13, DD14, DD16, DD19, DD20, DD21, DD23, DD30, DD33, DD34, DD35 |

**Total:** 38 data dictionary concepts

---

## Policy-Independent Extensions Candidates

The following extensions are **policy-independent** (additive, nullable, reversible, preserve existing data):

1. **DD07:** Add nullable `birthdateReason`, `ageReason`, `sectorReason` to `Beneficiary`
2. **DD09:** Add nullable `ageReferenceDate` to `Beneficiary`
3. **DD10:** Add nullable `ageReferenceDate` to `Beneficiary` (same as DD09)
4. **DD15:** Add nullable `owningOfficeId` to `StatisticalDataset`
5. **DD18:** Add nullable `geometryCrs`, `geometryDate`, `geometryLicense`, `geometryChecksum` to `Barangay`
6. **DD25:** Add nullable `denominatorPopulation` to `StatisticalIndicator`
7. **DD31:** Add nullable `sourceVersion`, `sourceDate`, `receivedDate`, `reviewerId`, `checksum` to `StatisticalProvenance`
8. **DD32:** Add nullable `originalRecordId`, `correctionReason`, `reviewerId` to `StatisticalObservation`

**Total:** 8 candidate extensions across 5 models

---

## Blocked by Institutional Decisions

The following are **blocked** and cannot be implemented without D01-D13 approval:

- DD02, DD03: Service activity and participation models (blocked by D04)
- DD06: Sex/gender category expansion (blocked by D03)
- DD11: Age band definitions (blocked by D03)
- DD13: Sector membership multi-value/versioning (blocked by D03)
- DD14: Beneficiary type classification (blocked by D03/D04)
- DD16: Persona capability matrix (blocked by D02)
- DD19: Service category versioning (blocked by D03/D04)
- DD20, DD21: Activity date/location (blocked by D04)
- DD23: Indicator definition metadata (blocked by D03/D08/D05)
- DD30: Report snapshot model (blocked by D06/D09)
- DD33: Observation status vocabulary (blocked by D03/D05)
- DD34: Sensitivity classification (blocked by D02/D05)
- DD35: Suppression rules (blocked by D05)

**Total:** 14 concepts blocked by 7 decisions (D02, D03, D04, D05, D06, D08, D09)

---

## Conclusion

**REUSE:** 14 concepts can be supported by existing models with no schema changes.

**EXTEND:** 8 concepts can be extended with policy-independent additive fields (nullable, reversible).

**DEFER:** 14 concepts are blocked by institutional decisions and cannot be implemented without D01-D13 approval.

**Key Insight:** Most GAD-specific gaps (sex categories, age bands, sector membership, service activities, participation, indicator definitions) are **blocked by D03, D04, and D05**. These are institutional decisions that require LGU/GFPS approval of vocabulary, counting rules, and privacy policies.

The only policy-independent extensions available are **metadata preservation fields** (source version, checksum, reason codes, reference dates) that do not define policy rules but only preserve source-provided information.

Next step: Design target data model focusing on policy-independent extensions only.
