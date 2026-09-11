# TAGAD SYSTEM ARCHITECTURE SPECIFICATION

## 1. Architectural Philosophy

TAGAD adopts a **Modular Monolith** architecture designed for government-grade reliability, data traceability, and strict compliance with the **Data Privacy Act of 2012** (RA 10173) and PCW guidelines.

```text
[ Citizen / Public Browser ]        [ GAD Focal / Admin Personnel ]
            │                                      │
            ▼                                      ▼
  Public Portal Route (/)             Protected Routes (/dashboard, /programs)
            │                                      │
            └──────────────┐      ┌────────────────┘
                           ▼      ▼
                  [ React 19 Frontend ]
                 (Vite + Tailwind CSS)
                           │
                  [ Domain Modules ]
           (Auth, Programs, Budgets, Audit)
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
 [ Supabase Auth & Storage ]     [ PostgreSQL Database ]
                                 ├── Row Level Security (RLS)
                                 ├── RBAC Roles
                                 ├── Foreign Key Constraints
                                 └── Immutable Audit Trail
```

---

## 2. Dual-Sided Portal Boundary

1. **Public Side (`/` and `#demographics`, `#programs`)**:
   * Anonymous access allowed.
   * Exposes aggregated numbers only (Budget totals, barangay counts).
   * **Zero PII Exposure**: Individual beneficiary names, contact info, and internal remarks are inaccessible.

2. **Authenticated Administrative Workspace (`/dashboard`, `/programs`, etc.)**:
   * Requires authenticated session (Supabase Auth / JWT).
   * Verified by `ProtectedRoute` on frontend and PostgreSQL RLS on database.
   * Full CRUD operations restricted by role (`SUPER_ADMIN`, `ADMIN`, `ENCODER`, `VIEWER`).

---

## 3. Data Ownership & Auditability

Every mutable table adheres to the universal metadata contract:
* `id`: UUID Primary Key
* `created_at`: UTC Timestamp (auto-populated by PostgreSQL `NOW()`)
* `updated_at`: UTC Timestamp (maintained via `BEFORE UPDATE` database trigger)
* `created_by`: Foreign key to `public.users(id)`
* `updated_by`: Foreign key to `public.users(id)`

All critical state changes trigger an entry into `public.audit_logs` capturing user ID, action type, before/after JSON state, and client context.
