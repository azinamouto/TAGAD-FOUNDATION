# TAGAD (Talibon Analytics for Gender and Development)
## Master Backend API Contract & Security Specification (Sprint 2)

### 1. Architectural Overview & Design Philosophy

The TAGAD backend exposes a hardened, standardized REST API built on Express, Prisma ORM, and PostgreSQL. It enforces three strict architectural boundaries:

1. **Public Subsystem (`/api/public/*`)**: Unauthenticated, rate-aware, aggregate-only, and guaranteed PII-safe (Zero Personally Identifiable Information).
2. **Authentication Subsystem (`/api/auth/*`)**: JWT issuance, rotation, and profile verification.
3. **Protected Admin & Data Subsystem (`/api/admin/*`)**: Role-Based Access Control (RBAC) and office-scoped multi-tenancy for LGU municipal departments.

---

### 2. Standard Envelope & Error Response Format

All API responses follow a uniform envelope contract.

#### 2.1 Success Response (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "data": { ... } | [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 145,
    "totalPages": 15
  }
}
```

#### 2.2 Error Response (`400`, `401`, `403`, `404`, `422`, `500`)
```json
{
  "success": false,
  "error": {
    "code": "OFFICE_SCOPE_MISMATCH",
    "message": "Encoders cannot create or modify records for other offices.",
    "details": [ ... ]
  }
}
```

#### 2.3 Machine-Readable Error Codes
| Error Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `NO_TOKEN` | 401 | Authorization header missing or format invalid |
| `INVALID_TOKEN` | 401 | JWT signature verification failed |
| `TOKEN_EXPIRED` | 401 | Access token expired |
| `ACCOUNT_INACTIVE` | 401 | User account has been deactivated |
| `INVALID_CREDENTIALS` | 401 | Password or email mismatch |
| `FORBIDDEN` | 403 | User role is insufficient for requested resource |
| `OFFICE_SCOPE_MISMATCH` | 403 | Encoder attempted cross-office record modification |
| `NOT_FOUND` | 404 | Target entity was not found |
| `VALIDATION_ERROR` | 422 | Zod schema validation rejected request payload |
| `CONFLICT` | 409 | Unique constraint violation (e.g. email, office code) |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled internal exception |

---

### 3. Role-Based Access Control (RBAC) & Office Scoping

| Role | Office Scoping Rule | Read Scope | Mutation Scope |
| :--- | :--- | :--- | :--- |
| **`SUPER_ADMIN`** | Unrestricted / Cross-Office | All offices, barangays, users, plans, and governance data | System-wide CRUD and governance authority, including publication approval |
| **`ADMIN`** | Unrestricted / Cross-Office | All offices, barangays, users, plans | Full CRUD on all system entities |
| **`ENCODER`** | Strictly Bound to `user.officeId` | Own office programs & GAD plans; municipal beneficiaries | Create & update records for own office only |
| **`VIEWER`** | Read-Only | All approved GAD plans, programs, aggregated metrics | No mutation access (POST/PUT/DELETE blocked) |

**Enforcement Guarantee:**
The server never trusts client-supplied `officeId` for `ENCODER` users. The effective office scope is derived directly from the verified database record of the authenticated JWT principal.

---

### 4. API Endpoints Reference

#### 4.1 Authentication Subsystem (`/api/auth`)

##### `POST /api/auth/login`
- **Access**: Public
- **Body**:
  ```json
  {
    "email": "admin@talibon.gov.ph",
    "password": "Password123!"
  }
  ```
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi...",
      "user": {
        "id": "763b069d-2fd2-4217-91f1-ecfe458f27aa",
        "email": "admin@talibon.gov.ph",
        "fullName": "Administrator",
        "role": "ADMIN",
        "officeId": null,
        "office": ""
      }
    }
  }
  ```

##### `POST /api/auth/refresh`
- **Access**: Public
- **Body**: `{ "refreshToken": "..." }`
- **Response (200)**: `{ "success": true, "data": { "accessToken": "...", "refreshToken": "..." } }`

##### `GET /api/auth/me`
- **Access**: Authenticated (`Bearer <token>`)
- **Response (200)**: Current authenticated user profile with office & barangay details.

---

#### 4.2 Public Subsystem (`/api/public`)

*All public responses undergo automatic recursive PII sanitization.*

##### `GET /api/public/dashboard?year=2026`
- **Access**: Public
- **Response**: Aggregated municipal totals (total beneficiaries, male/female distribution %, active GAD programs, budget utilization, sector breakdown).

##### `GET /api/public/demographics?year=2026&barangayId=`
- **Access**: Public
- **Response**: Aggregated demographic counts grouped by sex, age brackets, sector, and barangays.

##### `GET /api/public/programs?year=2026&sector=`
- **Access**: Public
- **Response**: List of ACTIVE and COMPLETED programs with high-level budget figures and target vs actual gender indicators.

##### `GET /api/public/accomplishments?year=2026&quarter=1`
- **Access**: Public
- **Response**: Quarterly public accomplishment highlights and beneficiary outcomes.

##### `GET /api/public/gad-plans?year=2026`
- **Access**: Public
- **Response**: Approved municipal GAD plan line items and HGDG allocations.

##### `POST /api/public/feedback`
- **Access**: Public
- **Body**: `{ "name": "Citizen", "email": "citizen@example.com", "subject": "GAD Inquiry", "message": "..." }`

---

#### 4.3 Admin Subsystem (`/api/admin`)

*All admin endpoints require `Authorization: Bearer <accessToken>`.*

##### `GET /api/admin/dashboard?year=2026`
- Returns admin dashboard KPI metrics, GAD plan status pipeline breakdown (DRAFT, SUBMITTED, APPROVED, REVISED), and recent audit log events.

##### `Beneficiaries Management (/api/admin/beneficiaries)`
- `GET /` — Filterable by page, limit, search, sex, sector, barangayId, year.
- `GET /:id` — Detailed individual beneficiary profile.
- `POST /` — Create beneficiary record (Encoders auto-tagged with their office).
- `PUT /:id` — Update beneficiary (Office scope isolation enforced).
- `DELETE /:id` or `DELETE /:id/archive` — Soft-archive beneficiary.

##### `Programs Management (/api/admin/programs)`
- `GET /` — List programs (Encoders scoped to their office).
- `GET /:id` — Detailed program breakdown with accomplishments and plan links.
- `POST /` — Create program (Office scope enforced).
- `PUT /:id` — Update program (Office scope enforced).
- `DELETE /:id` — Delete program.

##### `GAD Plans Management (/api/admin/gad-plans)`
- `GET /` — Get annual GAD Plans and line items.
- `GET /:id` — Get specific plan or item.
- `POST /` — Create GAD Plan item or annual plan header.
- `PUT /:id` — Update GAD Plan item.
- `PATCH /:id/status` — Transition workflow status (`DRAFT` -> `SUBMITTED` -> `APPROVED` -> `REVISED`). *ADMIN or SUPER_ADMIN may set `APPROVED`.*
- `DELETE /:id` — Delete plan or item.

##### `Accomplishments Management (/api/admin/accomplishments)`
- `GET /` — List accomplishments.
- `POST /` — Record accomplishment with actual budget, male/female count, output summary.
- `PUT /:id` — Update accomplishment.
- `DELETE /:id` — Delete accomplishment.

##### `User & System Management (/api/admin/users)` *(ADMIN Only)*
- `GET /` — List all user accounts.
- `POST /` — Provision new user account (with hashed password & role).
- `PUT /:id` — Update user details or role.
- `DELETE /:id` — Deactivate user account.

##### `Audit Logging (/api/admin/audit-logs)` *(ADMIN Only)*
- `GET /` — Query historical transactional audit trails with before/after state diffs, user agent, and IP address.

---

### 5. Automated Audit Trail Specification

Every state-mutating operation automatically writes an immutable log record into the `AuditLog` table containing:
- `userId`: UUID of the authenticated actor
- `action`: E.g., `BENEFICIARY_CREATED`, `PROGRAM_UPDATED`, `GAD_PLAN_STATUS_CHANGED`
- `entityType`: `User`, `Beneficiary`, `Program`, `GADPlan`, `GADAccomplishment`, `Office`
- `entityId`: UUID of target entity
- `beforeState`: JSON snapshot before modification
- `afterState`: JSON snapshot after modification
- `ipAddress`: Client remote IP
- `userAgent`: Client HTTP User-Agent string
- `createdAt`: ISO 8601 Timestamp
