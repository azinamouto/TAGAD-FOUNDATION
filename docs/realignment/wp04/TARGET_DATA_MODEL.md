# WP04 Target Data Model

**Status:** Policy-independent additive schema design proposal.  
**Date:** 2026-10-17  
**Purpose:** Design candidate additive structures that preserve existing data, are reversible, and do not fabricate policy rules.  
**Constraint:** Separate policy-independent structures from those blocked by D02-D09. Do not invent sex categories, age bands, identity matching, reporting formulas, or sensitive-data rules.  
**Sources:**
- Model Inventory: <ref_file file="C:\Users\admin\Documents\TAGAD-FOUNDATION\docs\realignment\wp04\MODEL_INVENTORY.md" />
- Proposal Mapping: <ref_file file="C:\Users\admin\Documents\TAGAD-FOUNDATION\docs\realignment\wp04\PROPOSAL_MODEL_MAPPING.md" />
- Open Decisions: <ref_file file="C:\Users\admin\Documents\TAGAD-FOUNDATION\docs\realignment\OPEN_DECISIONS.md" />

## Design Principles

1. **Additive Only:** All changes are additive nullable fields; no deletions, no type changes, no constraint tightening
2. **Reversible:** All changes can be rolled back without data loss
3. **Policy-Independent:** Fields preserve source-provided information without defining valid categories or rules
4. **Preservation-First:** Existing data is never modified or invalidated
5. **No Fabrication:** Do not invent sex categories, age bands, counting rules, or policy thresholds

---

## Recommendation: Design-Only Delivery

After thorough analysis, **no schema changes are justified** in WP04. The reasoning:

1. **All candidate extensions are metadata preservation only** - they add nullable fields to capture source-provided information (version, checksum, reason codes, reference dates)

2. **Metadata preservation without policy rules has limited value** - adding nullable fields for data that may never be populated (without D03/D08 decisions) creates schema bloat without functional benefit

3. **Existing schema already supports the baseline use case** - beneficiary registry, program tracking, accomplishments, and statistical observations are functional

4. **All functional gaps are blocked by D01-D13** - service activities, participation, versioned indicators, sex categories, age bands, sector membership, sensitivity classification all require institutional decisions

5. **Migration cost outweighs benefit** - creating and testing migrations for nullable metadata fields, with no functional use case until D03/D08, is not justified

6. **Schema drift without functional changes adds risk** - additive migrations increase complexity and potential for issues in future WP05-WP14

Therefore, WP04 should deliver a **design-only PR** documenting the analysis, inventory, mapping, and readiness assessment. Schema implementation should be deferred until WP05 or later when institutional decisions are available and functional requirements are clearer.

---

## Hypothetical Additive Extensions (For Future Reference)

If future authorization requires metadata preservation fields, the following are policy-independent additive structures that could be implemented:

### Extension 1: Beneficiary Missing Value Reasons

**Purpose:** Preserve source-reported reasons for missing demographic values (DD07).

**Model:** `Beneficiary`

**Additive Fields:**
```prisma
model Beneficiary {
  // ... existing fields ...

  // Policy-independent: preserve source-reported missing value reasons
  // Does not define valid reason codes; that requires D03 approval
  birthdateReason  String?  @map("birthdate_reason") @db.VarChar(50)
  ageReason        String?  @map("age_reason") @db.VarChar(50)
  sectorReason     String?  @map("sector_reason") @db.VarChar(50)
}
```

**Rationale:**
- Nullable fields preserve source-reported reasons
- Does not define valid reason codes (requires D03)
- Does not change validation logic
- Existing records remain valid (null = no reason recorded)

**Migration:**
```sql
ALTER TABLE public.tagad_beneficiaries
ADD COLUMN birthdate_reason VARCHAR(50),
ADD COLUMN age_reason VARCHAR(50),
ADD COLUMN sector_reason VARCHAR(50);
```

**Dependencies:** D03 (vocabulary approval for reason codes)

**Value:** Low without D03; fields would remain null or contain unvalidated free text

---

### Extension 2: Beneficiary Age Reference Date

**Purpose:** Preserve source-reported reference date for age calculation (DD09, DD10).

**Model:** `Beneficiary`

**Additive Fields:**
```prisma
model Beneficiary {
  // ... existing fields ...

  // Policy-independent: preserve source-reported age reference date
  // Does not define age calculation rules; that requires D03 approval
  ageReferenceDate DateTime? @map("age_reference_date") @db.Date
}
```

**Rationale:**
- Nullable field preserves source-reported reference date
- Does not define age calculation logic (application-level)
- Existing records remain valid (null = no reference date)

**Migration:**
```sql
ALTER TABLE public.tagad_beneficiaries
ADD COLUMN age_reference_date DATE;
```

**Dependencies:** D03 (age calculation rules)

**Value:** Low without D03; reference date without calculation rules has limited utility

---

### Extension 3: Statistical Dataset Owning Office

**Purpose:** Capture explicit dataset ownership distinct from importer affiliation (DD15).

**Model:** `StatisticalDataset`

**Additive Fields:**
```prisma
model StatisticalDataset {
  // ... existing fields ...

  // Policy-independent: explicit owning office distinct from importer
  // Requires D02 for office assignment semantics, D08 for source ownership
  owningOfficeId String? @map("owning_office_id") @db.Uuid

  owningOffice Office? @relation("DatasetOwnedBy", fields: [owningOfficeId], references: [id], onDelete: SetNull)
}
```

**Rationale:**
- Nullable field captures explicit ownership
- Distinguishes from `importedById` (encoder)
- Existing records remain valid (null = ownership not explicitly assigned)

**Migration:**
```sql
ALTER TABLE public.tagad_statistical_datasets
ADD COLUMN owning_office_id UUID REFERENCES public.tagad_offices(id) ON DELETE SET NULL;
```

**Dependencies:** D02 (office assignments), D08 (source ownership)

**Value:** Moderate without D02/D08; ownership without capability matrix has limited enforcement

---

### Extension 4: Barangay Geometry Metadata

**Purpose:** Preserve source geometry metadata (CRS, date, license, checksum) (DD18).

**Model:** `Barangay`

**Additive Fields:**
```prisma
model Barangay {
  // ... existing fields ...

  // Policy-independent: preserve source geometry metadata
  // Does not claim verification authority; that requires D07 approval
  geometryCrs      String?  @map("geometry_crs") @db.VarChar(50)
  geometryDate     DateTime? @map("geometry_date") @db.Date
  geometryLicense  String?  @map("geometry_license") @db.VarChar(255)
  geometryChecksum String?  @map("geometry_checksum") @db.VarChar(64)
}
```

**Rationale:**
- Nullable fields preserve source geometry metadata
- Does not claim verification authority (D07)
- Existing records remain valid (null = metadata not recorded)

**Migration:**
```sql
ALTER TABLE public.tagad_barangays
ADD COLUMN geometry_crs VARCHAR(50),
ADD COLUMN geometry_date DATE,
ADD COLUMN geometry_license VARCHAR(255),
ADD COLUMN geometry_checksum VARCHAR(64);
```

**Dependencies:** D07 (geographic authority and audience)

**Value:** Low without D07; metadata without verification authority and audience rules has limited value

---

### Extension 5: Statistical Indicator Denominator Population

**Purpose:** Preserve population reference for denominator (DD25).

**Model:** `StatisticalIndicator`

**Additive Fields:**
```prisma
model StatisticalIndicator {
  // ... existing fields ...

  // Policy-independent: preserve population reference for denominator
  // Does not define formula execution; that requires D03 approval
  denominatorPopulation String? @map("denominator_population") @db.VarChar(255)
}
```

**Rationale:**
- Nullable field preserves population reference
- Does not define formula execution logic
- Existing records remain valid (null = population not specified)

**Migration:**
```sql
ALTER TABLE public.tagad_statistical_indicators
ADD COLUMN denominator_population VARCHAR(255);
```

**Dependencies:** D03 (formula semantics)

**Value:** Low without D03; population reference without formula execution has limited utility

---

### Extension 6: Statistical Provenance Source Metadata

**Purpose:** Preserve comprehensive source metadata (version, date, received date, reviewer, checksum) (DD31).

**Model:** `StatisticalProvenance`

**Additive Fields:**
```prisma
model StatisticalProvenance {
  // ... existing fields ...

  // Policy-independent: preserve comprehensive source metadata
  // Does not define approval workflow; that requires D08 approval
  sourceVersion  String?   @map("source_version") @db.VarChar(100)
  sourceDate     DateTime? @map("source_date") @db.Date
  receivedDate   DateTime? @map("received_date") @db.Date
  reviewerId     String?   @map("reviewer_id") @db.Uuid
  checksum       String?   @map("checksum") @db.VarChar(64)

  reviewer User? @relation("ProvenanceReviewedBy", fields: [reviewerId], references: [id], onDelete: SetNull)
}
```

**Rationale:**
- Nullable fields preserve source metadata
- Does not define approval workflow (D08)
- Existing records remain valid (null = metadata not recorded)

**Migration:**
```sql
ALTER TABLE public.tagad_statistical_provenance
ADD COLUMN source_version VARCHAR(100),
ADD COLUMN source_date DATE,
ADD COLUMN received_date DATE,
ADD COLUMN reviewer_id UUID REFERENCES public.tagad_users(id) ON DELETE SET NULL,
ADD COLUMN checksum VARCHAR(64);
```

**Dependencies:** D08 (source intake and review)

**Value:** Moderate without D08; metadata without review workflow has limited value

---

### Extension 7: Statistical Observation Correction Lineage

**Purpose:** Preserve correction history (original record, correction reason, reviewer) (DD32).

**Model:** `StatisticalObservation`

**Additive Fields:**
```prisma
model StatisticalObservation {
  // ... existing fields ...

  // Policy-independent: preserve correction lineage
  // Does not define approval rules; that requires D08 approval
  originalRecordId  String? @map("original_record_id") @db.Uuid
  correctionReason String? @map("correction_reason") @db.VarChar(255)
  reviewerId        String? @map("reviewer_id") @db.Uuid

  reviewer User? @relation("ObservationReviewedBy", fields: [reviewerId], references: [id], onDelete: SetNull)
}
```

**Rationale:**
- Nullable fields preserve correction history
- Does not define approval workflow (D08)
- Existing records remain valid (null = no correction)

**Migration:**
```sql
ALTER TABLE public.tagad_statistical_observations
ADD COLUMN original_record_id UUID,
ADD COLUMN correction_reason VARCHAR(255),
ADD COLUMN reviewer_id UUID REFERENCES public.tagad_users(id) ON DELETE SET NULL;
```

**Dependencies:** D08 (correction/release rules)

**Value:** Moderate without D08; lineage without approval rules has limited value

---

## Summary of Hypothetical Extensions

| Extension | Model | New Fields | Dependencies | Value Without Decisions |
| --- | --- | --- | --- | --- |
| Missing Value Reasons | Beneficiary | 3 | D03 | Low |
| Age Reference Date | Beneficiary | 1 | D03 | Low |
| Dataset Owning Office | StatisticalDataset | 1 | D02, D08 | Moderate |
| Geometry Metadata | Barangay | 4 | D07 | Low |
| Denominator Population | StatisticalIndicator | 1 | D03 | Low |
| Source Metadata | StatisticalProvenance | 5 | D08 | Moderate |
| Correction Lineage | StatisticalObservation | 3 | D08 | Moderate |

**Total:** 7 extensions, 18 new fields across 5 models

**Total Dependencies:** D02, D03, D07, D08 (4 decisions)

**Overall Value:** Low to Moderate without institutional decisions

---

## Alternative: No Schema Changes (Recommended)

Given that:

1. All hypothetical extensions require D02, D03, D07, or D08 for functional value
2. Extensions are metadata preservation only, not functional features
3. Existing schema supports baseline GAD planning and tracking
4. Migration cost and complexity for nullable fields is non-trivial
5. Schema bloat without functional use adds risk

**Recommendation:** WP04 should deliver **no schema changes** and instead focus on:

1. Comprehensive documentation of existing model capabilities
2. Clear mapping of proposal requirements to existing models
3. Identification of gaps blocked by D01-D13
4. Readiness assessment for future work packages
5. Decision register with dependencies clearly documented

This aligns with WP04 readiness guidance in <ref_file file="C:\Users\admin\Documents\TAGAD-FOUNDATION\docs\realignment\wp03\WP04_READINESS.md" /> which states: "Next authorized package should begin with these evidence gates, then propose additive nullable structures and reversible source-backed mappings."

Without the evidence gates (D01-D13 decisions), proposing additive structures is premature.

---

## Deferred Structures (Blocked by D01-D13)

The following structures cannot be implemented without institutional decisions:

### Service Activity Model (DD02)
**Blocked by:** D04 (monitoring grain and linkage)
**Purpose:** Track actual occurrences of programs/activities with date/location
**Impact:** Core gap for participation tracking

### Participation Model (DD03)
**Blocked by:** D04 (monitoring grain and linkage), D05 (privacy)
**Purpose:** Link beneficiaries to service activities
**Impact:** Essential for distinct beneficiary counting

### Versioned Sex/Gender Definitions (DD06)
**Blocked by:** D03 (data dictionary)
**Purpose:** Support non-binary categories and source label preservation
**Impact:** Critical for inclusive GAD encoding

### Versioned Age Band Definitions (DD11)
**Blocked by:** D03 (data dictionary)
**Purpose:** Support age band boundaries and inclusion rules
**Impact:** Required for age-disaggregated reporting

### Multi-Value Sector Membership (DD13)
**Blocked by:** D03 (data dictionary)
**Purpose:** Support overlapping sector memberships with versioning
**Impact:** Essential for accurate sector analytics

### Beneficiary Type Classification (DD14)
**Blocked by:** D03 (data dictionary), D04 (classification context)
**Purpose:** Classify recipients in service context
**Impact:** Required for service-specific reporting

### Persona Capability Matrix (DD16)
**Blocked by:** D02 (personas and scope)
**Purpose:** Define permitted actions per persona/office/barangay
**Impact:** Essential for access control and data ownership

### Versioned Service Categories (DD19)
**Blocked by:** D03 (data dictionary), D04 (category mapping)
**Purpose:** Versioned classification of services
**Impact:** Required for service analytics

### Activity Date/Location (DD20, DD21)
**Blocked by:** D04 (activity occurrence grain), D05 (privacy)
**Purpose:** Track actual occurrence details
**Impact:** Required for temporal and geographic analysis

### Versioned Indicator Definitions (DD23)
**Blocked by:** D03 (indicator definitions), D08 (source ownership), D05 (sensitivity)
**Purpose:** Comprehensive indicator metadata with versioning
**Impact:** Critical for standardized reporting

### Report Snapshot Model (DD30)
**Blocked by:** D06 (official reports), D09 (workflow)
**Purpose:** Track report generation with template versions
**Impact:** Required for official output tracking

### Observation Status Vocabulary (DD33)
**Blocked by:** D03 (status vocabulary), D05 (suppression rules)
**Purpose:** Distinguish zero, absent, unknown, invalid, suppressed
**Impact:** Required for accurate missingness handling

### Sensitivity Classification (DD34)
**Blocked by:** D02 (personas), D05 (privacy)
**Purpose:** Classify data sensitivity and permitted audience
**Impact:** Essential for privacy controls

### Suppression Rules (DD35)
**Blocked by:** D05 (suppression rules)
**Purpose:** Implement approved suppression thresholds
**Impact:** Required for confidential data protection

---

## Conclusion

**Recommendation:** Deliver a **design-only PR** for WP04 with no schema changes.

**Rationale:**
1. All policy-independent extensions are metadata preservation with low value without D02/D03/D07/D08
2. Migration cost and complexity outweigh limited benefit
3. Existing schema supports baseline GAD planning and tracking
4. All functional gaps are blocked by D01-D13 institutional decisions
5. Schema changes without functional requirements add risk and complexity

**WP04 Deliverables:**
- Model inventory (completed)
- Proposal-to-model mapping (completed)
- Target data model design (this document)
- Data dictionary gaps analysis
- Migration and preservation plan (conceptual only)
- Decision dependencies documentation
- WP04 verification report

**Next Steps (WP05+):**
- Await D01-D13 institutional decisions
- Implement functional structures (service activities, participation, versioned definitions) after decisions
- Re-evaluate metadata preservation extensions based on functional requirements
- Design additive migrations with clear use cases and benefits

This approach honors the constraint: "Implement only demonstrably policy-independent, additive schema changes. If none can be justified, deliver a design-only PR and explain why."
