# SPRINT 1 — SCHEMA SOURCE OF TRUTH REPORT
**Project:** Talibon Analytics for Gender and Development (TAGAD)  
**Document Version:** 1.0.0  
**Date:** August 24, 2026  
**Status:** Canonical Reference

---

## 1. Current Runtime Database

The TAGAD platform currently operates in a dual runtime environment:
1. **Local Development Runtime**: Express backend (`server.ts`, `server/lib/prisma.ts`, `server/controllers/*`) connects via Prisma ORM (`prisma/schema.prisma`) using the SQLite provider (`prisma/dev.db`). Legacy endpoints (`/api/beneficiaries`, `/api/programs`, `/api/gad-plans`, `/api/accomplishments`, `/api/users`, `/api/reports`) read/write directly to SQLite using autoincrement integer IDs.
2. **Cloud/Production Target**: Supabase PostgreSQL hosting the foundational schema (`supabase/migrations/20260824000001_sprint1_foundation.sql`). The frontend (`src/modules/auth/authService.ts`) supports direct Supabase Auth/PostgreSQL reads when environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are present, falling back to Express/SQLite when unconfigured.

---

## 2. Schema Sources Audit

Four competing schema definitions currently exist across the repository:

| Schema Source | Format & Engine | Identifier Type | Roles Supported | Entity Structure |
| :--- | :--- | :--- | :--- | :--- |
| **1. Legacy Prisma Schema** (`prisma/schema.prisma`) | SQLite / Prisma | `Int @default(autoincrement())` | String: `ADMIN`, `ENCODER` | 5 Flat Models: `User`, `Beneficiary`, `Program`, `GADPlan`, `GADAccomplishment`. Flattened strings for offices and barangays. |
| **2. Historical Supabase Migration 1** (`backend/supabase/migrations/20260824000001_...`) | PostgreSQL DDL | `UUID DEFAULT gen_random_uuid()` | Historical role values; superseded by the canonical Prisma enum | Historical normalized tables and policies. |
| **3. Canonical Database Types** (`frontend/src/types/database.types.ts`) | TypeScript Definitions | `string` (UUID) | `SUPER_ADMIN`, `ADMIN`, `ENCODER`, `VIEWER` | Mirrors the current backend role contract. |
| **4. Current Frontend Types** (`frontend/src/types/*.ts`) | TypeScript Interfaces | `string` (UUID) | `SUPER_ADMIN`, `ADMIN`, `ENCODER`, `VIEWER` | Matches the current PostgreSQL/Prisma application model. |

---

## 3. Canonical Model Proposal (Blueprint v2 Specification)

The single canonical TAGAD domain model consolidates all entities under a unified PostgreSQL + Prisma + Supabase standard:

```mermaid
erDiagram
    Office ||--o{ User : employs
    Office ||--o{ Beneficiary : manages
    Office ||--o{ Program : implements
    Office ||--o{ GADPlan : submits
    Barangay ||--o{ Household : contains
    Household ||--o{ Beneficiary : contains
    User ||--o{ UserRole : assigned
    User ||--o{ AuditLog : acts
    
    GADPlan ||--o{ GADPlanItem : contains
    GADPlanItem }o--o| Program : references
    Program ||--o{ GADAccomplishment : reports
    GADAccomplishment ||--o{ MOVAttachment : attaches

    User {
        uuid id PK
        string email UK
        string passwordHash
        boolean isActive
        uuid officeId FK
        datetime createdAt
        datetime updatedAt
    }
    Office {
        uuid id PK
        string code UK
        string name
        string headName
        boolean isActive
    }
    Barangay {
        uuid id PK
        string name UK
        string code UK
        string captainName
        string gadFocalPerson
    }
    Household {
        uuid id PK
        string householdNo UK
        uuid barangayId FK
        string purok
        boolean is4Ps
        boolean isIndigent
    }
    Beneficiary {
        uuid id PK
        uuid householdId FK
        uuid officeId FK
        uuid barangayId FK
        string firstName
        string lastName
        enum sex "MALE | FEMALE"
        int age
        string sector
        boolean isArchived
        uuid encodedBy FK
    }
    GADPlan {
        uuid id PK
        uuid officeId FK
        int fiscalYear
        decimal totalBudget
        decimal gadBudget
        enum status "DRAFT | SUBMITTED | APPROVED | REVISED"
    }
    GADPlanItem {
        uuid id PK
        uuid gadPlanId FK
        uuid programId FK
        string genderIssue
        string gadResult
        string activity
        string performanceIndicator
        string targetGroup
        string timeline
        decimal budget
        string fundSource
    }
    Program {
        uuid id PK
        uuid officeId FK
        string title
        string description
        string sector
        decimal budgetTarget
        decimal budgetActual
        int fiscalYear
        enum status "DRAFT | ACTIVE | COMPLETED | CANCELLED"
        int targetMale
        int targetFemale
        int actualMale
        int actualFemale
    }
    GADAccomplishment {
        uuid id PK
        uuid programId FK
        uuid gadPlanItemId FK
        int fiscalYear
        int quarter
        string actualOutput
        int actualMale
        int actualFemale
        decimal budgetActual
        string outputSummary
        string remarks
        string varianceExplanation
    }
    MOVAttachment {
        uuid id PK
        uuid accomplishmentId FK
        string storagePath
        string fileName
        string fileType
        int fileSizeBytes
        uuid uploadedBy FK
        datetime uploadedAt
    }
    AuditLog {
        uuid id PK
        uuid userId FK
        string action
        string entityType
        uuid entityId
        json beforeState
        json afterState
        string ipAddress
        string userAgent
        datetime createdAt
    }
```

---

## 4. Migration Strategy

To transition from legacy SQLite to canonical PostgreSQL without data loss or downtime:

1. **Non-Destructive Dual-Engine Support**: Retain legacy tables while deploying canonical PostgreSQL DDL.
2. **Deterministic Seed & Key Mapping**: Migration scripts generate canonical UUIDs for existing records (`MPDC`, `admin@talibon.gov.ph`, 25 Barangays).
3. **Foreign Key Integrity**: Preserve relational integrity during batch export/import from SQLite `dev.db` to Supabase PostgreSQL.
4. **Adapter Layer**: The service layer translates incoming legacy payload IDs to UUIDs until client pages are updated in subsequent sprints.

---

## 5. Entity Mapping Matrix

| Legacy Model (`prisma/dev.db`) | Migration 1 Table (`supabase/migrations`) | Canonical Blueprint v2 Model | Notes / Resolution |
| :--- | :--- | :--- | :--- |
| `User` | `public.users` | `User` (`tagad_users`) | Maps `name` $\rightarrow$ `fullName`, password hash, linked to `Office`. |
| `[N/A]` | `public.roles` | `Role` | Canonical native enum `ADMIN`, `ENCODER`, `VIEWER`. |
| `[N/A]` | `public.user_roles` | `UserRole` | Multi-role assignment table linking `User` and `Role`. |
| `[String office]` | `public.offices` | `Office` (`tagad_offices`) | Normalized LGU department entity with 5 core offices seeded. |
| `[String barangay]` | `public.barangays` | `Barangay` (`tagad_barangays`) | Normalized registry of Talibon's 25 barangays. |
| `[N/A]` | `[N/A]` | `Household` (`tagad_households`) | Household clustering for 4Ps, indigent, and demographic grouping. |
| `Beneficiary` | `[N/A]` | `Beneficiary` (`tagad_beneficiaries`) | Sex-disaggregated demographic registry linked to Household, Barangay, Office. |
| `GADPlan` | `public.budgets` | `GADPlan` (`tagad_gad_plans`) | Annual statutory GAD Plan header (Fiscal Year, 5% Budget Allocation). |
| `GADPlan` (flattened) | `public.gad_activities` | `GADPlanItem` (`tagad_gad_plan_items`) | Detailed GPB line item matrix (Gender Issue, GAD Result, Activity, Budget). |
| `Program` | `public.gad_programs` / `projects` | `Program` (`tagad_programs`) | Operational GAD program/project implementation entity. |
| `GADAccomplishment` | `public.expenditures` | `GADAccomplishment` (`tagad_accomplishments`) | Quarterly performance result (Target vs Actual, Male/Female, Budget Used). |
| `[N/A]` | `public.documents` | `MOVAttachment` (`tagad_mov_attachments`) | Means of Verification files linked to Supabase Storage. |
| `[N/A]` | `public.audit_logs` | `AuditLog` (`tagad_audit_logs`) | Immutable audit trail for sensitive administrative mutations. |

---

## 6. ID Migration Strategy (Integer $\rightarrow$ UUID)

1. **UUIDv4 / v5 Generation**:
   - For seeded reference entities (`Offices`, `Barangays`), deterministic UUIDs are assigned based on unique codes (e.g. `uuid_generate_v5(namespace, 'TLB-POB')`).
   - For existing users and beneficiaries, standard UUIDv4 random identifiers are generated during extraction.
2. **Legacy ID Cross-Reference Map**:
   - A migration translation dictionary (`legacy_id_map`) maintains `(legacy_table, legacy_int_id) -> canonical_uuid` during migration execution to remap foreign keys (`encodedBy`, `gadPlanId`, `programId`).

---

## 7. Relationship Hierarchy Specification

Enforcing the strict modeling distinction required by Blueprint v2:

$$\text{GADPlan} \xrightarrow{1:N} \text{GADPlanItem} \xrightarrow{N:1 \text{ (optional)}} \text{Program} \xrightarrow{1:N} \text{GADAccomplishment} \xrightarrow{1:N} \text{MOVAttachment}$$

- **`GADPlan`**: The approved municipal/departmental annual planning document containing total GAD budget allocation.
- **`GADPlanItem`**: The specific budget and planning line item within the GPB.
- **`Program`**: The operational program, project, or capacity development activity being executed on the ground.
- **`GADAccomplishment`**: The quarterly or annual actual implementation report (Actual Male/Female count, Actual Budget Used, Variance).
- **`MOVAttachment`**: The physical evidence (signed attendance sheet, geotagged photo, disbursement voucher) validating the accomplishment.

---

## 8. Role Model Consolidation

Historical migration roles are superseded by the 4 canonical roles in the current Prisma schema:

```text
[ SUPER_ADMIN ]      ──────>  System-wide authority, including publication approval
[ ADMIN ]            ──────>  Cross-office administration and user management
[ ENCODER ]          ──────>  Office-scoped data entry for permitted records
[ VIEWER ]           ──────>  Read-only access to approved data and reports
```

---

## 9. Risk Assessment & Mitigations

| Risk Domain | Potential Breaking Point | Mitigation Applied |
| :--- | :--- | :--- |
| **Authentication** | Mismatched token payloads between legacy Express JWT and Supabase Auth. | AuthContext and `authMiddleware.ts` support dual token verification and canonical role normalization. |
| **Existing API Endpoints** | Controllers expecting integer query parameters (`/programs/:id`). | Controllers cast parameter inputs safely and support both UUID string format and legacy ID lookups. |
| **Existing Data** | Data loss during SQLite $\rightarrow$ PostgreSQL cutover. | Database migrations are strictly additive with full table retention and transactional seeding. |
| **Frontend UI Forms** | Forms submitting string office names instead of UUID `officeId`. | Backend services accept both office code strings (`"MPDC"`, `"MSWDO"`) and UUIDs via resolver helper. |
| **Prisma Engine** | Prisma validation failures with PostgreSQL features on SQLite. | `schema.prisma` is aligned with PostgreSQL datasource and standard Prisma types. |
