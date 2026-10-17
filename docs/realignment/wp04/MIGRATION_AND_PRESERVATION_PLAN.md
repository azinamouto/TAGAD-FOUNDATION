# WP04 Migration and Preservation Plan

**Status:** Conceptual migration plan (no migrations recommended for WP04).  
**Date:** 2026-10-17  
**Purpose:** Document preservation strategy and migration approach for future schema changes.  
**Constraint:** Isolated PostgreSQL replay, preservation checks, backup/restore verification. Never rewrite applied migrations.  
**Sources:**
- WP03 Baseline: <ref_file file="C:\Users\admin\Documents\TAGAD-FOUNDATION\docs\realignment\wp03\WP03_VERIFICATION.md" />
- WP03 Preservation: <ref_file file="C:\Users\admin\Documents\TAGAD-FOUNDATION\docs\realignment\wp03\DATA_PRESERVATION_MATRIX.md" />
- Target Data Model: <ref_file file="C:\Users\admin\Documents\TAGAD-FOUNDATION\docs\realignment\wp04\TARGET_DATA_MODEL.md" />

## Recommendation: No Migrations for WP04

Based on the target data model analysis, **no schema migrations are recommended for WP04**. The reasoning:

1. **All hypothetical extensions are metadata preservation only** - add nullable fields with low value without D02/D03/D07/D08 decisions
2. **Migration cost outweighs benefit** - creating and testing migrations for nullable fields is non-trivial
3. **Schema bloat without functional use** - adding fields that may never be populated adds complexity
4. **Existing schema is stable** - WP03 established a verified baseline with preservation evidence

Therefore, this document serves as a **conceptual plan** for future work packages (WP05+) when institutional decisions are available and functional requirements justify schema changes.

---

## Migration Strategy Principles

When migrations are authorized in future work packages:

1. **Additive Only:** All migrations add nullable columns or new tables; never drop or alter existing columns
2. **Reversible:** All migrations can be rolled back with `DROP COLUMN` or `DROP TABLE` without data loss
3. **Isolated Replay:** Test migrations in isolated PostgreSQL environment before production
4. **Preservation Verification:** Run preservation checks before and after migration
5. **Backup/Restore:** Verify backup/restore procedures for each migration
6. **Never Rewrite Applied Migrations:** Do not modify migration files that have been applied to production

---

## Conceptual Migration Framework

### Migration Naming Convention

Follow WP03 pattern: `YYYYMMDDHHMMSS_descriptive_name.sql`

Example: `20261017120000_add_age_reference_date.sql`

### Migration Structure Template

```sql
-- ==============================================================================
-- TAGAD SYSTEM — MIGRATION: [Description]
-- Date: YYYY-MM-DD
-- Purpose: [Brief purpose]
-- Dependencies: [Previous migrations, if any]
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ADDITIVE CHANGES (COLUMNS/TABLES)
-- ------------------------------------------------------------------------------

-- Example: Add nullable column
ALTER TABLE public.tagad_beneficiaries
ADD COLUMN age_reference_date DATE;

-- Example: Add new table
CREATE TABLE IF NOT EXISTS public.tagad_service_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... fields ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. INDEXES (if needed for performance)
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_tagad_beneficiaries_age_ref_date
  ON public.tagad_beneficiaries(age_reference_date);

-- ------------------------------------------------------------------------------
-- 3. COMMENTS (document purpose and policy dependencies)
-- ------------------------------------------------------------------------------

COMMENT ON COLUMN public.tagad_beneficiaries.age_reference_date
IS 'Policy-independent: preserves source-reported age reference date. Age calculation rules require D03 approval.';

-- ------------------------------------------------------------------------------
-- 4. ROLLBACK PROCEDURE (document for future reference)
-- ------------------------------------------------------------------------------

-- Rollback commands (for emergency rollback):
-- DROP INDEX IF EXISTS idx_tagad_beneficiaries_age_ref_date;
-- ALTER TABLE public.tagad_beneficiaries DROP COLUMN IF EXISTS age_reference_date;
```

---

## Conceptual Migrations for Hypothetical Extensions

### Migration 1: Beneficiary Missing Value Reasons

**File:** `20261017120001_add_beneficiary_missing_value_reasons.sql`

**Purpose:** Add nullable fields to preserve source-reported reasons for missing demographic values (DD07).

**SQL:**
```sql
-- Add nullable fields for missing value reasons
ALTER TABLE public.tagad_beneficiaries
ADD COLUMN birthdate_reason VARCHAR(50),
ADD COLUMN age_reason VARCHAR(50),
ADD COLUMN sector_reason VARCHAR(50);

-- Add comments
COMMENT ON COLUMN public.tagad_beneficiaries.birthdate_reason
IS 'Policy-independent: preserves source-reported reason for missing birthdate. Valid reason codes require D03 approval.';
COMMENT ON COLUMN public.tagad_beneficiaries.age_reason
IS 'Policy-independent: preserves source-reported reason for missing age. Valid reason codes require D03 approval.';
COMMENT ON COLUMN public.tagad_beneficiaries.sector_reason
IS 'Policy-independent: preserves source-reported reason for missing sector. Valid reason codes require D03 approval.';
```

**Rollback:**
```sql
ALTER TABLE public.tagad_beneficiaries
DROP COLUMN IF EXISTS birthdate_reason,
DROP COLUMN IF EXISTS age_reason,
DROP COLUMN IF EXISTS sector_reason;
```

**Preservation Check:**
- Verify all existing beneficiaries have NULL values for new columns
- Verify existing data is unchanged
- Verify all indexes and constraints remain valid

**Dependencies:** D03 (vocabulary approval for reason codes)

**Risk:** Low (nullable columns, no defaults)

---

### Migration 2: Beneficiary Age Reference Date

**File:** `20261017120002_add_age_reference_date.sql`

**Purpose:** Add nullable field to preserve source-reported age reference date (DD09, DD10).

**SQL:**
```sql
-- Add nullable field for age reference date
ALTER TABLE public.tagad_beneficiaries
ADD COLUMN age_reference_date DATE;

-- Add comment
COMMENT ON COLUMN public.tagad_beneficiaries.age_reference_date
IS 'Policy-independent: preserves source-reported age reference date. Age calculation rules require D03 approval.';
```

**Rollback:**
```sql
ALTER TABLE public.tagad_beneficiaries
DROP COLUMN IF EXISTS age_reference_date;
```

**Preservation Check:**
- Verify all existing beneficiaries have NULL for new column
- Verify existing data is unchanged
- Verify all indexes and constraints remain valid

**Dependencies:** D03 (age calculation rules)

**Risk:** Low (nullable column, no defaults)

---

### Migration 3: Statistical Dataset Owning Office

**File:** `20261017120003_add_dataset_owning_office.sql`

**Purpose:** Add nullable foreign key to capture explicit dataset ownership (DD15).

**SQL:**
```sql
-- Add nullable foreign key for owning office
ALTER TABLE public.tagad_statistical_datasets
ADD COLUMN owning_office_id UUID REFERENCES public.tagad_offices(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN public.tagad_statistical_datasets.owning_office_id
IS 'Policy-independent: explicit owning office distinct from importer. Capability matrix requires D02 approval. Source ownership requires D08 approval.';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_stat_dataset_owning_office
  ON public.tagad_statistical_datasets(owning_office_id);
```

**Rollback:**
```sql
DROP INDEX IF EXISTS idx_stat_dataset_owning_office;
ALTER TABLE public.tagad_statistical_datasets
DROP COLUMN IF EXISTS owning_office_id;
```

**Preservation Check:**
- Verify all existing datasets have NULL for new column
- Verify existing data is unchanged
- Verify foreign key constraint is valid
- Verify index is created

**Dependencies:** D02 (office assignments), D08 (source ownership)

**Risk:** Low (nullable foreign key, no defaults)

---

### Migration 4: Barangay Geometry Metadata

**File:** `20261017120004_add_barangay_geometry_metadata.sql`

**Purpose:** Add nullable fields to preserve source geometry metadata (DD18).

**SQL:**
```sql
-- Add nullable fields for geometry metadata
ALTER TABLE public.tagad_barangays
ADD COLUMN geometry_crs VARCHAR(50),
ADD COLUMN geometry_date DATE,
ADD COLUMN geometry_license VARCHAR(255),
ADD COLUMN geometry_checksum VARCHAR(64);

-- Add comments
COMMENT ON COLUMN public.tagad_barangays.geometry_crs
IS 'Policy-independent: preserves source CRS. Verification authority requires D07 approval.';
COMMENT ON COLUMN public.tagad_barangays.geometry_date
IS 'Policy-independent: preserves source geometry date. Verification authority requires D07 approval.';
COMMENT ON COLUMN public.tagad_barangays.geometry_license
IS 'Policy-independent: preserves source geometry license. Verification authority requires D07 approval.';
COMMENT ON COLUMN public.tagad_barangays.geometry_checksum
IS 'Policy-independent: preserves source geometry checksum. Verification authority requires D07 approval.';
```

**Rollback:**
```sql
ALTER TABLE public.tagad_barangays
DROP COLUMN IF EXISTS geometry_crs,
DROP COLUMN IF EXISTS geometry_date,
DROP COLUMN IF EXISTS geometry_license,
DROP COLUMN IF EXISTS geometry_checksum;
```

**Preservation Check:**
- Verify all existing barangays have NULL for new columns
- Verify existing data is unchanged
- Verify all indexes and constraints remain valid

**Dependencies:** D07 (geographic authority and audience)

**Risk:** Low (nullable columns, no defaults)

---

### Migration 5: Statistical Indicator Denominator Population

**File:** `20261017120005_add_indicator_denominator_population.sql`

**Purpose:** Add nullable field to preserve population reference for denominator (DD25).

**SQL:**
```sql
-- Add nullable field for denominator population
ALTER TABLE public.tagad_statistical_indicators
ADD COLUMN denominator_population VARCHAR(255);

-- Add comment
COMMENT ON COLUMN public.tagad_statistical_indicators.denominator_population
IS 'Policy-independent: preserves population reference for denominator. Formula execution requires D03 approval.';
```

**Rollback:**
```sql
ALTER TABLE public.tagad_statistical_indicators
DROP COLUMN IF EXISTS denominator_population;
```

**Preservation Check:**
- Verify all existing indicators have NULL for new column
- Verify existing data is unchanged
- Verify all indexes and constraints remain valid

**Dependencies:** D03 (formula semantics)

**Risk:** Low (nullable column, no defaults)

---

### Migration 6: Statistical Provenance Source Metadata

**File:** `20261017120006_add_provenance_source_metadata.sql`

**Purpose:** Add nullable fields to preserve comprehensive source metadata (DD31).

**SQL:**
```sql
-- Add nullable fields for source metadata
ALTER TABLE public.tagad_statistical_provenance
ADD COLUMN source_version VARCHAR(100),
ADD COLUMN source_date DATE,
ADD COLUMN received_date DATE,
ADD COLUMN reviewer_id UUID REFERENCES public.tagad_users(id) ON DELETE SET NULL,
ADD COLUMN checksum VARCHAR(64);

-- Add comments
COMMENT ON COLUMN public.tagad_statistical_provenance.source_version
IS 'Policy-independent: preserves source version. Review workflow requires D08 approval.';
COMMENT ON COLUMN public.tagad_statistical_provenance.source_date
IS 'Policy-independent: preserves source date. Review workflow requires D08 approval.';
COMMENT ON COLUMN public.tagad_statistical_provenance.received_date
IS 'Policy-independent: preserves received date. Review workflow requires D08 approval.';
COMMENT ON COLUMN public.tagad_statistical_provenance.reviewer_id
IS 'Policy-independent: preserves reviewer. Review workflow requires D08 approval.';
COMMENT ON COLUMN public.tagad_statistical_provenance.checksum
IS 'Policy-independent: preserves source checksum. Review workflow requires D08 approval.';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_stat_provenance_reviewer
  ON public.tagad_statistical_provenance(reviewer_id);
```

**Rollback:**
```sql
DROP INDEX IF EXISTS idx_stat_provenance_reviewer;
ALTER TABLE public.tagad_statistical_provenance
DROP COLUMN IF EXISTS source_version,
DROP COLUMN IF EXISTS source_date,
DROP COLUMN IF EXISTS received_date,
DROP COLUMN IF EXISTS reviewer_id,
DROP COLUMN IF EXISTS checksum;
```

**Preservation Check:**
- Verify all existing provenance records have NULL for new columns
- Verify existing data is unchanged
- Verify foreign key constraint is valid
- Verify index is created

**Dependencies:** D08 (source intake and review)

**Risk:** Low (nullable columns, nullable foreign key, no defaults)

---

### Migration 7: Statistical Observation Correction Lineage

**File:** `20261017120007_add_observation_correction_lineage.sql`

**Purpose:** Add nullable fields to preserve correction history (DD32).

**SQL:**
```sql
-- Add nullable fields for correction lineage
ALTER TABLE public.tagad_statistical_observations
ADD COLUMN original_record_id UUID,
ADD COLUMN correction_reason VARCHAR(255),
ADD COLUMN reviewer_id UUID REFERENCES public.tagad_users(id) ON DELETE SET NULL;

-- Add comments
COMMENT ON COLUMN public.tagad_statistical_observations.original_record_id
IS 'Policy-independent: preserves original record ID for corrections. Approval workflow requires D08 approval.';
COMMENT ON COLUMN public.tagad_statistical_observations.correction_reason
IS 'Policy-independent: preserves correction reason. Approval workflow requires D08 approval.';
COMMENT ON COLUMN public.tagad_statistical_observations.reviewer_id
IS 'Policy-independent: preserves reviewer. Approval workflow requires D08 approval.';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_stat_observation_original_record
  ON public.tagad_statistical_observations(original_record_id);
CREATE INDEX IF NOT EXISTS idx_stat_observation_reviewer
  ON public.tagad_statistical_observations(reviewer_id);
```

**Rollback:**
```sql
DROP INDEX IF EXISTS idx_stat_observation_reviewer;
DROP INDEX IF EXISTS idx_stat_observation_original_record;
ALTER TABLE public.tagad_statistical_observations
DROP COLUMN IF EXISTS original_record_id,
DROP COLUMN IF EXISTS correction_reason,
DROP COLUMN IF EXISTS reviewer_id;
```

**Preservation Check:**
- Verify all existing observations have NULL for new columns
- Verify existing data is unchanged
- Verify foreign key constraint is valid
- Verify indexes are created

**Dependencies:** D08 (correction/release rules)

**Risk:** Low (nullable columns, nullable foreign key, no defaults)

---

## Preservation Verification Procedure

### Pre-Migration Checks

1. **Database Backup**
   ```bash
   pg_dump -U postgres -d tagad_db -F c -f pre_migration_backup.dump
   ```

2. **Schema Snapshot**
   ```bash
   pg_dump -U postgres -d tagad_db --schema-only -f pre_migration_schema.sql
   ```

3. **Data Count Verification**
   ```sql
   -- Count records in affected tables
   SELECT COUNT(*) FROM tagad_beneficiaries;
   SELECT COUNT(*) FROM tagad_statistical_datasets;
   SELECT COUNT(*) FROM tagad_barangays;
   SELECT COUNT(*) FROM tagad_statistical_indicators;
   SELECT COUNT(*) FROM tagad_statistical_provenance;
   SELECT COUNT(*) FROM tagad_statistical_observations;
   ```

4. **Checksum Verification**
   ```sql
   -- Generate checksums for critical tables
   SELECT md5(string_agg(id::text, '' ORDER BY id)) FROM tagad_beneficiaries;
   ```

### Post-Migration Checks

1. **Schema Validation**
   ```bash
   # Verify new columns exist
   psql -U postgres -d tagad_db -c "\d tagad_beneficiaries"
   ```

2. **Data Integrity Check**
   ```sql
   -- Verify no data loss
   SELECT COUNT(*) FROM tagad_beneficiaries;
   -- Should match pre-migration count
   ```

3. **Null Check**
   ```sql
   -- Verify new columns are NULL for existing records
   SELECT COUNT(*) FROM tagad_beneficiaries WHERE age_reference_date IS NOT NULL;
   -- Should be 0
   ```

4. **Foreign Key Validation**
   ```sql
   -- Verify foreign key constraints are valid
   SELECT COUNT(*) FROM tagad_statistical_datasets
   WHERE owning_office_id IS NOT NULL
   AND owning_office_id NOT IN (SELECT id FROM tagad_offices);
   -- Should be 0
   ```

5. **Index Verification**
   ```sql
   -- Verify indexes are created
   SELECT indexname FROM pg_indexes
   WHERE tablename = 'tagad_beneficiaries'
   AND indexname = 'idx_tagad_beneficiaries_age_ref_date';
   ```

### Restore Test

1. **Restore from Backup**
   ```bash
   pg_restore -U postgres -d tagad_db_restore -f pre_migration_backup.dump
   ```

2. **Verify Restore**
   ```sql
   -- Compare record counts
   SELECT COUNT(*) FROM tagad_beneficiaries;
   -- Should match pre-migration count
   ```

---

## Migration Replay Procedure (Isolated PostgreSQL)

### 1. Setup Isolated Environment

```bash
# Create isolated PostgreSQL instance
docker run --name tagad-isolated -e POSTGRES_PASSWORD=testpass -p 5433:5432 -d postgres:15

# Create database
docker exec -it tagad-isolated psql -U postgres -c "CREATE DATABASE tagad_db;"
```

### 2. Replay All Migrations

```bash
# Apply migrations in order
for migration in backend/supabase/migrations/*.sql; do
  echo "Applying $migration"
  docker exec -i tagad-isolated psql -U postgres -d tagad_db < "$migration"
done
```

### 3. Verify Schema

```bash
# Generate schema diff
docker exec -it tagad-isolated pg_dump -U postgres -d tagad_db --schema-only > isolated_schema.sql

# Compare with production schema
diff production_schema.sql isolated_schema.sql
```

### 4. Clean Up

```bash
# Stop and remove isolated instance
docker stop tagad-isolated
docker rm tagad-isolated
```

---

## Migration Ledger

Maintain a migration ledger to track all applied migrations:

| Migration File | Date | Description | Status | Rollback Available |
| --- | --- | --- | --- | --- |
| 20260824000001_sprint1_foundation.sql | 2026-08-24 | Sprint 1 foundation | Applied | Yes |
| 20260824000002_canonical_domain_model.sql | 2026-08-24 | Canonical domain model | Applied | Yes |
| 20260831000001_add_super_admin_role.sql | 2026-08-31 | Add SUPER_ADMIN role | Applied | Yes |
| 20260831000002_statistical_domain.sql | 2026-08-31 | Statistical domain | Applied | Yes |
| 20260914141827_deny_tagad_data_api_access.sql | 2026-09-14 | Deny TAGAD data API access | Applied | Yes |
| 20260914230700_barangay_geography.sql | 2026-09-14 | Barangay geography | Applied | Yes |
| 20260916041906_feedback_review.sql | 2026-09-16 | Feedback review | Applied | Yes |
| 20261017000001_revoked_tokens.sql | 2026-10-17 | Revoked tokens | Applied | Yes |

**Total Applied Migrations:** 8

**Note:** No migrations added in WP04 (design-only delivery).

---

## Conclusion

**WP04 Recommendation:** No migrations.

**Rationale:**
1. All hypothetical extensions are metadata preservation with low value without D02/D03/D07/D08
2. Migration cost and complexity outweigh limited benefit
3. Existing schema is stable and verified (WP03 baseline)
4. Schema bloat without functional use adds risk

**Future Migration Strategy (WP05+):**
1. Implement functional structures after D01-D13 decisions
2. Use additive-only migrations (nullable columns, new tables)
3. Follow isolated replay procedure before production
4. Perform preservation checks before and after each migration
5. Verify backup/restore procedures
6. Maintain migration ledger
7. Never rewrite applied migrations

**Preservation Commitment:**
- All existing data will be preserved
- No destructive migrations will be applied
- All migrations will be reversible
- Backup/restore procedures will be verified
- Isolated replay will be performed before production deployment
