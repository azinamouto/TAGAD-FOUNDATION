# TAGAD

**Talibon Gender and Development Management and Sex-Disaggregated Data System**

A web-based information management system under development for the Municipality of Talibon, Bohol, Philippines.

TAGAD is designed to support the organization, management, analysis, and reporting of Gender and Development (GAD) information through a centralized digital platform.

The project emphasizes reliable sex-disaggregated data, accountable GAD program monitoring, accessible reporting, and responsible handling of government information.

**Project Status:** Active Development · GAD-SDD Realignment

---

## Overview

TAGAD aims to provide a structured digital environment for managing GAD-related records and supporting data-informed planning within local government.

The system is being aligned with the *Talibon GAD-SDD Project Proposal*, prioritizing practical municipal workflows over general-purpose census and Community-Based Monitoring System (CBMS) functionality.

Its intended users include authorized municipal personnel involved in GAD planning, data management, program implementation, monitoring, and reporting.

TAGAD is not intended to replace the municipality's CBMS or serve as a comprehensive population census platform.

## Project Scope

The system is organized around six functional areas defined in the project proposal.

| Module | Intended Responsibility |
|---|---|
| User and System Administration | User accounts, authorized access, and system management |
| Data Encoding and Management | Structured collection and management of GAD-related information |
| GAD Program and Service Monitoring | Tracking programs, activities, services, and accomplishments |
| Analytics and Visualization | Sex-disaggregated indicators, barangay statistics, and geographic visualization |
| Reports and Exports | Generation and management of GAD-related reports and supporting documents |
| Security and Privacy | Access restrictions, accountability, and protection of sensitive information |

Implementation maturity varies by module. Inclusion in this table represents project scope, not confirmation that every function is complete.

## Design Principles

TAGAD follows several engineering principles:

- **Data integrity:** Official information must originate from identifiable and verifiable sources.
- **Privacy by design:** Sensitive information must not be exposed without appropriate authorization and disclosure review.
- **Accountability:** Administrative operations and relevant data changes should remain traceable.
- **Maintainability:** Components and services should remain understandable, testable, and reusable.
- **Accessibility:** Interfaces should prioritize clarity, readability, and practical use by municipal personnel.
- **Controlled evolution:** Schema changes, reporting rules, and institutional workflows must be reviewed before adoption.

The system must distinguish unavailable information from verified zero values. Demonstration data must never be presented as official municipal statistics.

## Technology

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Interface | Tailwind CSS, Lucide |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| Data Access | Prisma ORM |
| Supporting Services | Supabase |
| Reports | PDFKit, ExcelJS |
| Testing | Node.js Test Runner, Playwright |

Technology choices may evolve as implementation and operational requirements are validated.

## Repository Structure

```text
TAGAD-FOUNDATION/
├── backend/
│   ├── prisma/          # Database schema and configuration
│   ├── server/          # API routes, services, and middleware
│   ├── tests/           # Backend verification
│   └── server.ts        # API entry point
│
├── frontend/
│   ├── src/             # Application source
│   ├── public/          # Static resources
│   └── tests/           # Frontend verification
│
├── supabase/
│   └── migrations/      # SQL migration history
│
├── docs/
│   ├── requirements/    # Project proposal and requirements
│   ├── realignment/     # Architecture and work packages
│   └── security/        # Security assessments
│
└── README.md
```

## Local Development

### Requirements

- Node.js 22 or a compatible supported version
- npm
- PostgreSQL
- Valid local environment configuration

### Install Dependencies

From the repository root:

```bash
npm ci
npm --prefix backend ci
npm --prefix frontend ci
```

### Configure Environment

Configure the required backend and frontend environment variables using the repository's maintained configuration guidance.

Keep database credentials, signing secrets, and service-role keys outside source control.

Use a dedicated development database. Do not connect local experiments to a production or shared LGU database.

### Run the Applications

Start the backend:

```bash
cd backend
npm run dev
```

In another terminal, start the frontend:

```bash
cd frontend
npm run dev
```

Database initialization must follow the project's reviewed migration procedures. Do not use schema synchronization commands as a substitute for validated migration history.

## Verification

The repository provides automated checks for application behavior and build integrity.

```bash
# Backend
npm --prefix backend test
npm --prefix backend run typecheck
npm --prefix backend run db:validate

# Frontend
npm --prefix frontend test
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

Browser tests require the appropriate Playwright environment:

```bash
cd frontend
npm run test:browser
```

Additional database qualification and migration verification are documented in the repository.

Passing automated tests does not independently establish operational readiness, data accuracy, privacy compliance, or institutional acceptance.

## Security and Data Governance

TAGAD includes application-level security mechanisms such as authenticated access, role-based authorization, request validation, rate limiting, and audit-related controls.

The system currently uses technical roles including `SUPER_ADMIN`, `ADMIN`, `ENCODER`, and `VIEWER`. Final institutional roles and responsibilities remain subject to approved access policies.

Public disclosure rules, confidential records, retention requirements, and official publication procedures require institutional review.

No repository documentation should be interpreted as certification of compliance with the Data Privacy Act, Philippine Commission on Women requirements, or other applicable government standards.

## Development and Realignment

The project is transitioning toward the approved functional scope described in its original GAD-SDD proposal.

Completed engineering activities include:

- Establishment of a proposal-aligned requirements and architecture baseline
- Stabilization of selected application security and data-integrity controls
- Retirement of unnecessary generic CBMS user-interface workflows
- Preservation of reusable statistical infrastructure and historical data dependencies
- Dependency-security remediation and verification work

Remaining development includes database-readiness verification, approved data definitions, GAD-specific workflows, barangay visualization, reporting requirements, and operational acceptance.

Some historical compatibility APIs remain available pending consumer and retention review.

For detailed implementation status and unresolved decisions, consult `docs/realignment/`.

## Project Documentation

| Resource | Purpose |
|---|---|
| [GAD-SDD Proposal](docs/requirements/TALIBON_GAD_SDD_PROPOSAL.md) | Original project scope and objectives |
| [Requirements Traceability](docs/realignment/REQUIREMENTS_TRACEABILITY.md) | Mapping of proposal requirements to implementation |
| [Target Architecture](docs/realignment/TARGET_ARCHITECTURE.md) | Architectural direction |
| [Implementation Work Packages](docs/realignment/IMPLEMENTATION_WORK_PACKAGES.md) | Development sequence and deliverables |
| [Open Decisions](docs/realignment/OPEN_DECISIONS.md) | Outstanding institutional and technical decisions |

## Intended Use

TAGAD is developed for the intended GAD information-management needs of the Municipality of Talibon.

The repository contains development artifacts and supporting technical documentation. Its availability does not imply production deployment, official LGU adoption, or authorization to process confidential government information.

Operational use requires appropriate testing, data governance, institutional review, and deployment authorization.

---

**TAGAD**  
*Gender and Development · Data Integrity · Public Accountability*

Talibon, Bohol, Philippines
