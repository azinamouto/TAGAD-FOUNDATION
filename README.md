# TAGAD — Talibon Analytics for Gender and Development

> **Centralized GAD Planning, Beneficiary Tracking, and Statutory Analytics Platform**  
> *Municipality of Talibon, Province of Bohol, Republic of the Philippines*

---

## 1. System Overview

**TAGAD** is the official Gender and Development (GAD) platform engineered for the **Local Government Unit (LGU) of Talibon, Bohol**. It centralizes the complete lifecycle of GAD management across municipal departments (MPDC, MSWDO, MHO, MAO, Mayor's Office) and Talibon's **25 Barangays**.

The system provides:
1. **Public Transparency Portal**: Citizen-facing view of statutory 5% GAD budget utilization, public metrics, and barangay coverage.
2. **Authenticated GAD Workspace**: Role-Based Access Control (RBAC) portal for GAD focal persons, planners, encoders, and municipal administrators.
3. **Statutory PCW Compliance**: Automated generation and tracking of sex-disaggregated indicators and annual GAD Plan and Accomplishment matrices.

---

## 2. Technology Stack

* **Frontend Framework:** React 19 + TypeScript + Vite
* **Styling & Design System:** Tailwind CSS v4 + Lucide Icons + Fontsource Geist
* **Database & Auth:** PostgreSQL + Supabase (Auth, RLS, Storage, Database)
* **API Layer / Development Server:** Express.js + TypeScript
* **ORM / Types:** Prisma + Generated Supabase TypeScript Types (`src/types/database.types.ts`)
* **Reporting Engine:** PDFKit + ExcelJS for Philippine PCW-compliant exports

---

## 3. Project Structure

```text
backend/
├── server.ts             # Express API entrypoint
├── server/               # Controllers, routes, services, middleware
├── prisma/               # Backend Prisma schema and seed
└── tests/                # Backend test suite

frontend/
├── src/                  # React application source
├── public/               # Frontend static assets
└── vite.config.ts        # Frontend Vite configuration

frontend/src/
├── app/                  # Application bootstrap, router, and configuration
│   ├── config/           # Safe environment variables loader
│   ├── providers/        # React context providers
│   └── router/           # Route definitions & public/protected layout routes
│
├── modules/              # Domain-driven feature modules
│   ├── auth/             # Authentication context, services, and protected routes
│   ├── users/            # User profile and office/barangay scope
│   ├── gad/              # GAD planning matrices and indicators
│   ├── programs/         # GAD programs and sector projects
│   ├── projects/         # GAD project matrices
│   ├── budgets/          # 5% statutory budget and office allocations
│   ├── documents/        # Means of Verification (MOV) document registry
│   └── audit/            # Traceable audit logging foundation
│
├── components/           # Reusable UI & Layout Components
│   ├── ui/               # Button, Input, Card, Badge
│   ├── layout/           # TopBar, Sidebar, AppLayout, PublicLayout
│   └── common/           # Logo, LoadingSpinner, StatusBadge
│
├── lib/                  # Shared libraries & utilities
│   ├── supabase/         # Typed Supabase client
│   ├── utils/            # Formatting, class merging (cn)
│   └── validation/       # Input validation logic
│
├── types/                # Synchronized Database and Domain TypeScript types
│   ├── database.types.ts # PostgreSQL / Supabase types
│   └── auth.types.ts     # User profile and session types
│
└── pages/                # Route Page Views
    ├── public/           # LandingPage.tsx
    ├── auth/             # LoginPage.tsx
    ├── dashboard/        # DashboardPage.tsx
    └── ...               # ProgramMonitoring, GADPlan, Accomplishments, DataEncoding, Reports, Users
```

---

## 4. Role-Based Access Control (RBAC)

TAGAD enforces 4 discrete roles:

| Role | Scope | Permissions |
| :--- | :--- | :--- |
| `SUPER_ADMIN` | Global / System | System-wide authority, including publication approval and configuration |
| `ADMIN` | LGU Executive | Cross-office CRUD, approval workflows, user management, and audit logs |
| `ENCODER` | Assigned Office | Create and update permitted records within the assigned office |
| `VIEWER` | Read-only | View approved data, dashboards, and reports without mutation access |

---

## 5. Row Level Security (RLS) Model

Security is enforced at the database level using PostgreSQL Row Level Security:
* **Public Data:** Reference tables (`offices`, `barangays`, `document_types`) and approved programs have public read policies.
* **User Data:** Users can only view and edit their own profiles unless designated as `ADMIN` or `SUPER_ADMIN`.
* **Traceability:** Every record tracks `created_by`, `updated_by`, `created_at`, and `updated_at`.
* **Audit Logs:** Append-only access with admin-only read privileges.

---

## 6. Local Development Setup

1. **Install dependencies:**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Configure environment variables:**
   ```bash
   # Configure backend/.env and frontend/.env
   ```

3. **Initialize database schema & seed admin:**
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

4. **Start the applications in separate terminals:**
   ```bash
   npm run dev:backend
   npm run dev:frontend
   ```

5. **Sign in with default credentials:**
   * **Email:** `admin@talibon.gov.ph`
   * **Password:** `Admin@1234`

---

## 7. Migration & SQL Scripts

SQL migrations are located in:
* `supabase/migrations/20260824000001_sprint1_foundation.sql` (Sprint 1 Foundation Schema + RLS + Triggers + Initial Seeds)
