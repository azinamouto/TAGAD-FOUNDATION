# WP04 Model Inventory

**Status:** Baseline inventory of existing Prisma schema models (as of PR #45, commit a3befbb).  
**Date:** 2026-10-17  
**Purpose:** Catalog existing models that can support GAD encoding, beneficiary statistics, service monitoring, indicators, source tracking, and barangay analytics.  
**Source:** <ref_file file="C:\Users\admin\Documents\TAGAD-FOUNDATION\backend\prisma\schema.prisma" />

## Overview

The canonical schema (Blueprint V2) provides 17 models across four domains:

1. **Organizational & Geographic Entities** (4 models)
2. **Identity & Users** (1 model)
3. **Beneficiary Registry** (1 model)
4. **GAD Planning & Operations** (5 models)
5. **Statistical Domain** (6 models)
6. **Security & Authentication** (2 models)

---

## 1. Organizational & Geographic Entities

### Office (`tagad_offices`)

**Purpose:** LGU departments and implementing units.

**Fields:**
- `id` (UUID PK)
- `code` (VARCHAR(50) UNIQUE)
- `name` (VARCHAR(255))
- `headName` (VARCHAR(255), nullable)
- `isActive` (BOOLEAN, default TRUE)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)

**Relations:**
- `users[]` (User.officeId)
- `beneficiaries[]` (Beneficiary.officeId)
- `programs[]` (Program.officeId)
- `gadPlans[]` (GADPlan.officeId)

**GAD Relevance:**
- **Supports:** DD15 (owning office), DD19 (service category custodian)
- **Gaps:** No explicit office capability mapping (D02); no office-level source ownership metadata (D08)
- **Preservation:** Preserve existing office records; do not delete or merge

---

### Barangay (`tagad_barangays`)

**Purpose:** 25 barangays of Talibon with geographic metadata.

**Fields:**
- `id` (UUID PK)
- `name` (VARCHAR(100) UNIQUE)
- `code` (VARCHAR(50) UNIQUE)
- `captainName` (VARCHAR(255), nullable)
- `gadFocalPerson` (VARCHAR(255), nullable)
- `contactNumber` (VARCHAR(50), nullable)
- `latitude`, `longitude` (DOUBLE PRECISION, nullable)
- `boundary` (JSON, nullable)
- `geoSource` (VARCHAR, nullable)
- `geoVerified` (BOOLEAN, default FALSE)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)

**Relations:**
- `households[]` (Household.barangayId)
- `beneficiaries[]` (Beneficiary.barangayId)
- `users[]` (User.barangayId)
- `statisticalObservations[]` (StatisticalObservation.barangayId)

**GAD Relevance:**
- **Supports:** DD12 (barangay reference), DD18 (geographic geometry)
- **Gaps:** Geometry verification authority not established (D07); missing CRS, license, date, checksum metadata (DD18)
- **Preservation:** Preserve existing geometry even if unverified; null boundary explicit

---

### Household (`tagad_households`)

**Purpose:** Demographic grouping for 4Ps/indigent classification.

**Fields:**
- `id` (UUID PK)
- `householdNo` (VARCHAR(100) UNIQUE)
- `barangayId` (UUID FK to Barangay)
- `purok` (VARCHAR(100), nullable)
- `is4Ps` (BOOLEAN, default FALSE)
- `isIndigent` (BOOLEAN, default FALSE)
- `headName` (VARCHAR(255), nullable)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)

**Relations:**
- `barangay` (Barangay)
- `beneficiaries[]` (Beneficiary.householdId)

**GAD Relevance:**
- **Supports:** DD17 (personal/contact fields - household grouping)
- **Gaps:** No explicit household-level GAD membership or participation tracking; sector membership not captured at household level (DD13)
- **Preservation:** Preserve existing household records; do not delete

---

## 2. Identity & Users

### User (`tagad_users`)

**Purpose:** System users with role and scope assignments.

**Fields:**
- `id` (UUID PK)
- `email` (VARCHAR(255) UNIQUE)
- `passwordHash` (VARCHAR(255))
- `fullName` (VARCHAR(255))
- `role` (Role enum: SUPER_ADMIN, ADMIN, ENCODER, VIEWER)
- `officeId` (UUID FK to Office, nullable)
- `barangayId` (UUID FK to Barangay, nullable)
- `isActive` (BOOLEAN, default TRUE)
- `avatarUrl` (TEXT, nullable)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)

**Relations:**
- `office` (Office)
- `barangay` (Barangay)
- `encodedBeneficiaries[]` (Beneficiary.encodedById)
- `createdPrograms[]` (Program.createdById)
- `createdGADPlans[]` (GADPlan.createdById)
- `createdAccomplishments[]` (GADAccomplishment.createdById)
- `uploadedMOVs[]` (MOVAttachment.uploadedById)
- `auditLogs[]` (AuditLog.userId)
- `importedDatasets[]` (StatisticalDataset.importedById)
- `provenanceRecords[]` (StatisticalProvenance.importedById)
- `revokedTokens[]` (RevokedToken.userId)
- `reviewedFeedback[]` (CitizenFeedback.reviewedById)

**GAD Relevance:**
- **Supports:** DD16 (actor/persona assignment), DD38 (audit and evidence attachment)
- **Gaps:** No explicit capability matrix (D02); no multi-scope assignment support; no explicit persona-level workflow delegation (D09)
- **Preservation:** Preserve existing user accounts and role assignments; do not infer additional scope

---

## 3. Beneficiary Registry

### Beneficiary (`tagad_beneficiaries`)

**Purpose:** Individual beneficiary records with sex-disaggregated demographic data.

**Fields:**
- `id` (UUID PK)
- `householdId` (UUID FK to Household, nullable)
- `officeId` (UUID FK to Office, nullable)
- `barangayId` (UUID FK to Barangay)
- `firstName` (VARCHAR(100))
- `lastName` (VARCHAR(100))
- `middleName` (VARCHAR(100), nullable)
- `sex` (Sex enum: MALE, FEMALE)
- `birthdate` (DATE, nullable)
- `age` (INT)
- `sector` (VARCHAR(100))
- `contactNumber` (VARCHAR(50), nullable)
- `addressStreet` (TEXT, nullable)
- `isArchived` (BOOLEAN, default FALSE)
- `encodedById` (UUID FK to User, nullable)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)

**Relations:**
- `household` (Household)
- `office` (Office)
- `barangay` (Barangay)
- `encodedBy` (User)

**Indexes:**
- `barangayId`
- `sex`
- `sector`

**GAD Relevance:**
- **Supports:** DD01 (registry record), DD06 (sex/gender concepts - binary only), DD08 (birthdate), DD09 (age observation), DD12 (barangay), DD13 (sector membership - single value), DD17 (personal/contact fields)
- **Gaps:**
  - Sex enum is binary (MALE/FEMALE only); no source-provided text preservation (DD06)
  - No missing value reason field (DD07)
  - No age reference date field (DD10)
  - No age band reference (DD11)
  - Sector is single string; no versioned code/multi-membership support (DD13)
  - No beneficiary type classification (DD14)
  - No service activity/participation relation (DD02, DD03)
  - Age validator 0-130 in migration; this is implementation, not policy (DD09)
- **Preservation:** Preserve all existing beneficiary records; do not delete or infer participation from registry

---

## 4. GAD Planning & Operations

### GADPlan (`tagad_gad_plans`)

**Purpose:** Annual mandatory 5% GAD budget plan header.

**Fields:**
- `id` (UUID PK)
- `officeId` (UUID FK to Office)
- `fiscalYear` (INT)
- `totalBudget` (DECIMAL(14,2), default 0.00)
- `mandatoryGADPercentage` (DECIMAL(5,2), default 5.00)
- `gadBudget` (DECIMAL(14,2), default 0.00)
- `status` (GADPlanStatus enum: DRAFT, SUBMITTED, APPROVED, REVISED)
- `createdById` (UUID FK to User, nullable)
- `updatedById` (UUID FK to User, nullable)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)

**Constraints:**
- UNIQUE([officeId, fiscalYear])

**Relations:**
- `office` (Office)
- `createdBy` (User)
- `items[]` (GADPlanItem[])

**GAD Relevance:**
- **Supports:** DD05 (program/PAP tracking), DD28 (money/expenditure - planned)
- **Gaps:** No budget authority or approval workflow metadata (D09); no HGDG scoring at plan level
- **Preservation:** Preserve existing plan records; no financial claims without authorized templates (D06)

---

### GADPlanItem (`tagad_gad_plan_items`)

**Purpose:** Detailed GPB matrix lines with gender issues and GAD results.

**Fields:**
- `id` (UUID PK)
- `gadPlanId` (UUID FK to GADPlan)
- `programId` (UUID FK to Program, nullable)
- `genderIssue` (TEXT)
- `causeOfIssue` (TEXT, nullable)
- `gadResult` (TEXT)
- `activity` (TEXT)
- `performanceIndicator` (TEXT)
- `targetGroup` (VARCHAR(255))
- `timeline` (VARCHAR(100))
- `responsibleOffice` (VARCHAR(255))
- `budget` (DECIMAL(14,2), default 0.00)
- `fundSource` (VARCHAR(100), default "General Fund (5% GAD)")
- `hgdgScore` (DECIMAL(5,2), nullable)
- `attributedPercentage` (DECIMAL(5,2), nullable)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)

**Relations:**
- `gadPlan` (GADPlan)
- `program` (Program)
- `accomplishments[]` (GADAccomplishment[])

**GAD Relevance:**
- **Supports:** DD05 (program/PAP), DD23 (indicator definition - narrative), DD27 (target vs actual), DD28 (money/expenditure), DD29 (gender issue/result)
- **Gaps:**
  - Indicator is free text; no versioned definition metadata (DD23)
  - No explicit indicator formula, numerator/denominator, unit, grain (DD23, DD25, DD26)
  - No source attribution or method documentation (DD31)
  - HGDG score without versioned rule reference (D09)
- **Preservation:** Preserve existing plan items; do not infer official indicator definitions from text

---

### Program (`tagad_programs`)

**Purpose:** Operational GAD programs with sex-disaggregated targets and actuals.

**Fields:**
- `id` (UUID PK)
- `officeId` (UUID FK to Office)
- `title` (VARCHAR(255))
- `description` (TEXT, nullable)
- `sector` (VARCHAR(100))
- `fiscalYear` (INT)
- `status` (ProgramStatus enum: DRAFT, ACTIVE, COMPLETED, CANCELLED)
- `budgetTarget` (DECIMAL(14,2), default 0.00)
- `budgetActual` (DECIMAL(14,2), default 0.00)
- `targetMale` (INT, default 0)
- `targetFemale` (INT, default 0)
- `actualMale` (INT, default 0)
- `actualFemale` (INT, default 0)
- `createdById` (UUID FK to User, nullable)
- `updatedById` (UUID FK to User, nullable)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)

**Indexes:**
- `fiscalYear`, `officeId`

**Relations:**
- `office` (Office)
- `createdBy` (User)
- `gadPlanItems[]` (GADPlanItem[])
- `accomplishments[]` (GADAccomplishment[])

**GAD Relevance:**
- **Supports:** DD05 (program/PAP), DD19 (service category - via sector), DD24 (count), DD27 (target vs actual), DD28 (money/expenditure)
- **Gaps:**
  - No service activity occurrence model (DD02, DD20, DD21)
  - No participation relation (DD03)
  - No activity date/range or location (DD20, DD21)
  - Sex-disaggregated counters are manual; no source-backed lineage (DD04, DD32)
  - No program/service category versioning (DD19)
- **Preservation:** Preserve existing program records; do not synthesize participation from manual totals

---

### GADAccomplishment (`tagad_accomplishments`)

**Purpose:** Quarterly/annual implementation results with MOV evidence.

**Fields:**
- `id` (UUID PK)
- `programId` (UUID FK to Program, nullable)
- `gadPlanItemId` (UUID FK to GADPlanItem, nullable)
- `fiscalYear` (INT)
- `quarter` (INT, nullable)
- `actualOutput` (TEXT)
- `actualMale` (INT, default 0)
- `actualFemale` (INT, default 0)
- `actualBudgetUsed` (DECIMAL(14,2), default 0.00)
- `outputSummary` (TEXT, nullable)
- `remarks` (TEXT, nullable)
- `varianceExplanation` (TEXT, nullable)
- `createdById` (UUID FK to User, nullable)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)

**Relations:**
- `program` (Program)
- `gadPlanItem` (GADPlanItem)
- `createdBy` (User)
- `attachments[]` (MOVAttachment[])

**GAD Relevance:**
- **Supports:** DD22 (reporting period - via fiscalYear/quarter), DD24 (count), DD27 (target vs actual), DD28 (money/expenditure), DD30 (report/template snapshot - via quarter/fiscalYear)
- **Gaps:**
  - No activity occurrence granularity (DD02, DD20)
  - No source version or correction lineage (DD32)
  - No publication/verification status enum (DD36)
  - No report template version reference (DD30)
- **Preservation:** Preserve existing accomplishment records; do not fabricate missing variance explanations

---

### MOVAttachment (`tagad_mov_attachments`)

**Purpose:** Evidence attachment metadata for accomplishments.

**Fields:**
- `id` (UUID PK)
- `accomplishmentId` (UUID FK to GADAccomplishment)
- `storagePath` (TEXT)
- `fileName` (VARCHAR(255))
- `fileType` (VARCHAR(100))
- `fileSizeBytes` (INT)
- `uploadedById` (UUID FK to User, nullable)
- `uploadedAt` (TIMESTAMPTZ)

**Relations:**
- `accomplishment` (GADAccomplishment)
- `uploadedBy` (User)

**GAD Relevance:**
- **Supports:** DD38 (audit and evidence attachment)
- **Gaps:** No sensitivity classification, retention metadata, or disposal tracking (DD34, DD37)
- **Preservation:** Preserve existing attachments; do not delete evidence objects

---

## 5. Statistical Domain

### StatisticalTableDefinition (`tagad_statistical_table_definitions`)

**Purpose:** Metadata catalog for 69-table statistical catalog (CBMS-derived).

**Fields:**
- `id` (UUID PK)
- `tableNumber` (INT UNIQUE)
- `tableCode` (VARCHAR(50) UNIQUE)
- `title` (VARCHAR(500))
- `domain` (VARCHAR(100))
- `classification` (StatisticalTableClassification enum: AGGREGATED_STATISTICS, INDICATOR, DERIVED_METRIC, REFERENCE_DATA, UNVERIFIED)
- `description` (TEXT, nullable)
- `expectedUnit` (VARCHAR(100), nullable)
- `rowGrain` (VARCHAR(255), default "UNVERIFIED")
- `dimensionsSummary` (VARCHAR(255), default "UNVERIFIED")
- `measureStructure` (VARCHAR(255), default "UNVERIFIED")
- `sourceFormat` (VARCHAR(100), default "UNVERIFIED")
- `isSystemTable` (BOOLEAN, default FALSE)
- `isArchived` (BOOLEAN, default FALSE)
- `verificationStatus` (StatisticalVerificationStatus enum: UNVERIFIED, PROVISIONAL, VERIFIED)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)

**Relations:**
- `indicators[]` (StatisticalIndicator[])
- `observations[]` (StatisticalObservation[])
- `dimensionBindings[]` (TableDimensionBinding[])

**GAD Relevance:**
- **Supports:** DD23 (indicator definition - partial), DD31 (source reference - partial)
- **Gaps:**
  - Grain, dimensions, measure structure are unverified placeholders (DD23)
  - No versioned definition; no explicit numerator/denominator, formula, population, unit, steward (DD23, DD25)
  - No sensitivity classification (DD34)
- **Preservation:** Preserve CBMS catalog; do not claim GAD relevance without D08 mapping

---

### StatisticalDataset (`tagad_statistical_datasets`)

**Purpose:** Imported statistical dataset container.

**Fields:**
- `id` (UUID PK)
- `datasetCode` (VARCHAR(100) UNIQUE)
- `name` (VARCHAR(255))
- `description` (TEXT, nullable)
- `sourceAgency` (VARCHAR(100), nullable)
- `reportingYear` (INT, nullable)
- `reportingPeriod` (VARCHAR(100), nullable)
- `surveyRound` (VARCHAR(100), nullable)
- `geographicLevel` (VARCHAR(50), default "MUNICIPALITY")
- `sourceFileName` (VARCHAR(255), nullable)
- `ingestionBatchId` (UUID, nullable)
- `importedById` (UUID FK to User, nullable)
- `isOfficial` (BOOLEAN, default FALSE)
- `isPublished` (BOOLEAN, default FALSE)
- `publicationStatus` (StatisticalPublicationStatus enum: DRAFT, VALIDATED, OFFICIAL, PUBLISHED, WITHDRAWN)
- `verificationStatus` (StatisticalVerificationStatus enum: UNVERIFIED, PROVISIONAL, VERIFIED)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)

**Relations:**
- `importedBy` (User)
- `observations[]` (StatisticalObservation[])

**GAD Relevance:**
- **Supports:** DD22 (reporting period), DD31 (source reference - partial), DD36 (publication/verification status)
- **Gaps:**
  - Source agency is free text; no versioned source metadata (DD31)
  - No batch correction lineage (DD32)
  - No explicit dataset ownership (DD15)
  - `isOfficial` and `isPublished` flags are not proof of LGU approval (DD36)
- **Preservation:** Preserve existing datasets; importer affiliation is not reliable historical ownership (DD15)

---

### StatisticalIndicator (`tagad_statistical_indicators`)

**Purpose:** Indicator definitions with formula metadata.

**Fields:**
- `id` (UUID PK)
- `indicatorCode` (VARCHAR(100) UNIQUE)
- `name` (VARCHAR(255))
- `title` (VARCHAR(500))
- `description` (TEXT, nullable)
- `unit` (VARCHAR(100), nullable)
- `classification` (StatisticalTableClassification enum, default INDICATOR)
- `formula` (TEXT, nullable)
- `numeratorDefinition` (TEXT, nullable)
- `denominatorDefinition` (TEXT, nullable)
- `tableDefinitionId` (UUID FK to StatisticalTableDefinition, nullable)
- `verificationStatus` (StatisticalVerificationStatus enum, default UNVERIFIED)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)

**Relations:**
- `tableDefinition` (StatisticalTableDefinition)
- `observations[]` (StatisticalObservation[])

**GAD Relevance:**
- **Supports:** DD23 (indicator definition - partial), DD25 (numerator/denominator), DD26 (unit)
- **Gaps:**
  - No versioned definition; no population, grain, source, method, valid range, frequency, steward, sensitivity, acceptance evidence (DD23)
  - Formula, numerator, denominator are free text; no executable or validated structure (DD25)
  - No zero-denominator handling rules (DD25)
- **Preservation:** Preserve existing indicators; do not fabricate formulas or claim official status

---

### StatisticalDimension (`tagad_statistical_dimensions`)

**Purpose:** Dimension definitions for statistical tables.

**Fields:**
- `id` (UUID PK)
- `dimensionCode` (VARCHAR(100) UNIQUE)
- `name` (VARCHAR(255))
- `description` (TEXT, nullable)
- `dataType` (VARCHAR(50), default "string")
- `vocabularySource` (VARCHAR(255), nullable)
- `verificationStatus` (StatisticalVerificationStatus enum, default UNVERIFIED)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)

**Relations:**
- `tableBindings[]` (TableDimensionBinding[])

**GAD Relevance:**
- **Supports:** DD23 (indicator definition - dimensions)
- **Gaps:**
  - No versioned dimension definition; no non-overlapping boundaries (DD11)
  - Vocabulary source is free text; no authoritative mapping (DD11, DD13)
- **Preservation:** Preserve existing dimensions; do not invent category boundaries

---

### TableDimensionBinding (`tagad_table_dimension_bindings`)

**Purpose:** Many-to-many binding of dimensions to table definitions.

**Fields:**
- `id` (UUID PK)
- `tableDefinitionId` (UUID FK to StatisticalTableDefinition)
- `dimensionId` (UUID FK to StatisticalDimension)
- `displayOrder` (INT, default 0)
- `isRequired` (BOOLEAN, default TRUE)
- `allowedValues` (JSON, nullable)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)

**Constraints:**
- UNIQUE([tableDefinitionId, dimensionId])

**Relations:**
- `tableDefinition` (StatisticalTableDefinition)
- `dimension` (StatisticalDimension)

**GAD Relevance:**
- **Supports:** DD23 (indicator definition - dimension binding)
- **Gaps:**
  - `allowedValues` is JSON; no versioned enum or vocabulary management (DD13)
  - No dimension validation rules at observation level
- **Preservation:** Preserve existing bindings; do not claim authoritative vocabulary

---

### StatisticalProvenance (`tagad_statistical_provenance`)

**Purpose:** Source metadata for statistical data.

**Fields:**
- `id` (UUID PK)
- `sourceAgency` (VARCHAR(100), nullable)
- `sourceFileName` (VARCHAR(255), nullable)
- `sourceDocument` (VARCHAR(255), nullable)
- `datasetCode` (VARCHAR(100), nullable)
- `tableCode` (VARCHAR(50), nullable)
- `reportingPeriod` (VARCHAR(100), nullable)
- `importedById` (UUID FK to User, nullable)
- `ingestionBatchId` (UUID, nullable)
- `methodologyNotes` (TEXT, nullable)
- `sourceUrl` (VARCHAR(500), nullable)
- `createdAt` (TIMESTAMPTZ)

**Relations:**
- `importedBy` (User)
- `observations[]` (StatisticalObservation[])

**GAD Relevance:**
- **Supports:** DD31 (source reference - partial), DD32 (batch and correction lineage - partial)
- **Gaps:**
  - No source version/date, method, received date, reviewer, checksum (DD31)
  - No correction reason or original record/version reference (DD32)
  - No idempotence rule enforcement
- **Preservation:** Preserve existing provenance records; do not infer authority from agency name

---

### StatisticalObservation (`tagad_statistical_observations`)

**Purpose:** Individual statistical data points with dimension support.

**Fields:**
- `id` (UUID PK)
- `datasetId` (UUID FK to StatisticalDataset)
- `tableDefinitionId` (UUID FK to StatisticalTableDefinition)
- `indicatorId` (UUID FK to StatisticalIndicator, nullable)
- `barangayId` (UUID FK to Barangay, nullable)
- `period` (VARCHAR(50))
- `numericValue` (DECIMAL(18,4))
- `unit` (VARCHAR(100), nullable)
- `dimensions` (JSON, nullable)
- `dimensionsHash` (VARCHAR(64), nullable)
- `provenanceId` (UUID FK to StatisticalProvenance, nullable)
- `suppressionStatus` (VARCHAR(50), default "NONE")
- `suppressionReason` (VARCHAR(255), nullable)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)

**Relations:**
- `dataset` (StatisticalDataset)
- `tableDefinition` (StatisticalTableDefinition)
- `indicator` (StatisticalIndicator)
- `barangay` (Barangay)
- `provenance` (StatisticalProvenance)

**GAD Relevance:**
- **Supports:** DD04 (aggregate observation), DD12 (barangay), DD22 (reporting period), DD26 (unit and numeric value), DD33 (observation status - via suppression), DD35 (suppression)
- **Gaps:**
  - No explicit sex-disaggregation field; sex would need to be in dimensions JSON (DD06)
  - No missing value reason separate from suppression (DD07, DD33)
  - `suppressionStatus` is free text; no approved rule/version (DD35)
  - No duplicate key definition (requires approved grain DD04)
  - No explicit source version or correction lineage (DD32)
- **Preservation:** Preserve existing observations; do not convert aggregate counts to individual beneficiaries

---

## 6. Security & Authentication

### RevokedToken (`tagad_revoked_tokens`)

**Purpose:** Durable token revocation store for security.

**Fields:**
- `id` (UUID PK)
- `jti` (VARCHAR(255) UNIQUE, nullable)
- `tokenHash` (VARCHAR(64) UNIQUE)
- `userId` (UUID FK to User, nullable)
- `reason` (VARCHAR(255), nullable)
- `expiresAt` (TIMESTAMPTZ)
- `revokedAt` (TIMESTAMPTZ, default NOW())

**Relations:**
- `user` (User)

**GAD Relevance:**
- **Supports:** DD38 (audit and evidence attachment - via session security)
- **Gaps:** None for GAD-specific concerns
- **Preservation:** Preserve existing revocations; never discard unledgered entries

---

### CitizenFeedback (`tagad_citizen_feedback`)

**Purpose:** Public feedback collection mechanism.

**Fields:**
- `id` (UUID PK)
- `name` (VARCHAR(255))
- `email` (VARCHAR(255))
- `subject` (VARCHAR(255))
- `message` (TEXT)
- `status` (VARCHAR(20), default "NEW")
- `reviewNote` (VARCHAR(2000), nullable)
- `reviewedById` (UUID FK to User, nullable)
- `reviewedAt` (TIMESTAMPTZ, nullable)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)

**Relations:**
- `reviewedBy` (User)

**GAD Relevance:**
- **Supports:** Not GAD-specific; general system feedback
- **Gaps:** No GAD-specific feedback routing
- **Preservation:** Preserve existing feedback records

---

### AuditLog (`tagad_audit_logs`)

**Purpose:** System-wide audit trail.

**Fields:**
- `id` (UUID PK)
- `userId` (UUID FK to User, nullable)
- `action` (VARCHAR(100))
- `entityType` (VARCHAR(100))
- `entityId` (UUID, nullable)
- `beforeState` (JSON, nullable)
- `afterState` (JSON, nullable)
- `ipAddress` (VARCHAR(45), nullable)
- `userAgent` (TEXT, nullable)
- `createdAt` (TIMESTAMPTZ)

**Relations:**
- `user` (User)

**GAD Relevance:**
- **Supports:** DD38 (audit and evidence attachment)
- **Gaps:** No sensitivity classification on logged content (DD34)
- **Preservation:** Preserve existing audit logs; do not remove historical evidence

---

## Summary by GAD Requirement Category

| GAD Requirement | Supported By | Gaps/Dependencies |
| --- | --- | --- |
| **GAD Encoding** | Beneficiary (sex, age, sector, barangay), Program (target/actual), GADPlanItem (gender issue/result) | No service activity/participation model; no versioned sex/sector definitions (D03, D04) |
| **Beneficiary Statistics** | Beneficiary (registry), Program/Accomplishment (sex-disaggregated counters) | No participation grain; no missing value reasons; no age reference date/bands (D03, D04) |
| **Service Monitoring** | Program (budget/target/actual), GADAccomplishment (quarterly results) | No activity occurrence model; no activity date/location; no correction lineage (D04, D08) |
| **Indicators** | StatisticalIndicator (formula metadata), GADPlanItem (narrative indicator) | No versioned indicator definitions; no numerator/denominator execution; no steward assignment (D03, D08) |
| **Source Tracking** | StatisticalProvenance (agency/file/method), StatisticalDataset (sourceAgency) | No source version/date/checksum; no correction lineage; no explicit ownership (D08) |
| **Barangay Analytics** | Barangay (geometry metadata), StatisticalObservation (barangayId), Beneficiary (barangayId) | Geometry not verified; no geographic authority; no CRS/license/date metadata (D07) |
| **Sex-Disaggregation** | Beneficiary (sex enum), Program/Accomplishment (male/female counters) | Binary sex only; no source text preservation; no missing value handling (D03, D05) |
| **Missingness** | StatisticalObservation (suppressionStatus/reason) | No distinct missing value reasons; no explicit unknown/refused/not_applicable categories (DD07, DD33) |
| **GAD Program Participation** | None | No participation model; no service activity occurrence (D04) |
| **Ownership** | Office (owner reference), User (officeId/barangayId) | No explicit dataset/observation ownership; no capability matrix (D02, D15) |
| **Geographic References** | Barangay (latitude/longitude/boundary/geoSource/geoVerified) | No version/crs/license/checksum; no verification authority (D07) |

---

## Conclusion

The existing schema provides a **foundation** for GAD data management but lacks **policy-independent additive structures** for:

1. Versioned GAD definitions (indicators, sex categories, age bands, sectors)
2. Source provenance with version, checksum, and correction lineage
3. Explicit missing value semantics (distinct from suppression)
4. Service activity occurrence and participation models
5. Explicit ownership and geographic metadata with versioning

All of these gaps are **blocked by D01-D13 institutional decisions**. WP04 can only implement **policy-independent additive structures** that preserve existing data and do not fabricate policy rules.

Next step: Build proposal-to-model mapping to identify which gaps can be addressed with additive, reversible changes without institutional decisions.
