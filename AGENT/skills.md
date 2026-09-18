# TAGAD Project Skills

## Overview
This document defines specialized skills for working with the TAGAD (Talibon Analytics for Gender and Development) system - a government-grade LGU platform for the Municipality of Talibon, Bohol, Philippines.

## Core Technology Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui
- **Backend**: Express.js + TypeScript + Prisma ORM
- **Database**: PostgreSQL via Supabase with Row Level Security (RLS)
- **Authentication**: JWT with bcryptjs
- **Reporting**: PDFKit + ExcelJS (PCW-compliant exports)
- **Monitoring**: Sentry integration

## Architecture Pattern
**Modular Monolith** with segregated frontend/backend deployment. Frontend communicates with backend exclusively via HTTP/REST API.

## Critical Constraints
- **Security**: Defense-in-depth approach with multi-layer RBAC enforcement
- **Compliance**: Philippine government regulations (RA 10173 Data Privacy Act, PCW guidelines)
- **Data Privacy**: Zero PII exposure on public portal, comprehensive audit trails
- **5% GAD Budget**: Statutory budget tracking and reporting requirements

## File Navigation Patterns

### Frontend Structure
```
frontend/src/
├── app/              # Application bootstrap, router, config
├── modules/          # Domain-driven feature modules (auth, users, programs, budgets, etc.)
├── components/       # Reusable UI components (layout, ui, common)
├── lib/              # Shared libraries (supabase, utils, validation)
├── pages/            # Route page views (public, auth, dashboard)
└── types/            # TypeScript types (database.types.ts, auth.types.ts)
```

### Backend Structure
```
backend/
├── server/
│   ├── controllers/  # Request handlers
│   ├── routes/       # API route definitions
│   ├── services/     # Business logic
│   ├── middleware/   # Custom middleware (auth, RBAC)
│   ├── validators/   # Input validation (Zod schemas)
│   └── lib/          # Core libraries (prisma, jwt, logger)
├── prisma/
│   ├── schema.prisma # Database schema
│   └── seed.ts       # Database seeding
└── supabase/         # Database migrations
```

## Common Development Tasks

### Database Operations
```bash
cd backend
npx prisma generate          # Generate Prisma client
npx prisma db push           # Push schema changes
npx prisma db validate       # Validate schema
npx tsx prisma/seed.ts       # Seed database
```

### Type Checking
```bash
npm run typecheck:backend    # Backend TypeScript validation
npm run typecheck:frontend   # Frontend TypeScript validation
```

### Development Servers
```bash
npm run dev:backend          # Backend on http://localhost:3000
npm run dev:frontend         # Frontend on http://localhost:5173
```

### Building
```bash
npm run build:frontend       # Build frontend to dist/
npm run build:backend        # Backend typecheck
```

## RBAC Roles
- **SUPER_ADMIN**: System-wide authority, publication approval, configuration
- **ADMIN**: Cross-office CRUD, approval workflows, user management, audit logs
- **ENCODER**: Create/update records within assigned office scope
- **VIEWER**: Read-only access to approved data, dashboards, reports

## Security Principles
1. **Never expose secrets in frontend code** - All secrets (DATABASE_URL, JWT_SECRET, API keys) belong in backend/.env
2. **Frontend never accesses database directly** - All data access goes through backend API
3. **RBAC enforcement at multiple layers** - Frontend routes, backend middleware, database RLS
4. **Audit trails for all data changes** - Automatic tracking of created_by, updated_by, timestamps
5. **Input validation with Zod schemas** - Both frontend and backend validation

## API Boundary
- Frontend → Backend: HTTP/REST with JWT Authorization header
- Backend → Database: Prisma ORM queries
- No direct database access from frontend
- No Supabase client in frontend (backend-only)

## Environment Variables
- **Frontend** (frontend/.env): `VITE_API_BASE_URL` only
- **Backend** (backend/.env): `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `SENTRY_DSN`

## Code Style Conventions
- **TypeScript strict mode** enabled
- **Component naming**: PascalCase for React components
- **File naming**: camelCase for utilities, PascalCase for components
- **Import ordering**: External libs, internal modules, relative imports
- **Error handling**: Structured error responses with proper HTTP status codes

## Testing Approach
- Backend tests in `backend/tests/`
- Focus on API endpoints, business logic, data validation
- Use existing test patterns when adding new tests

## Common Patterns
- **Domain modules**: Feature-based organization (auth, users, programs, budgets, etc.)
- **Shared libraries**: Reusable utilities in lib/ directories
- **Type safety**: Database types synchronized from Prisma schema
- **Validation**: Zod schemas for input validation
- **Audit logging**: Automatic tracking via database triggers

## Government Compliance Requirements
- **PCW Compliance**: Philippine Commission on Women guidelines for GAD reporting
- **Data Privacy Act (RA 10173)**: Strict data privacy and protection
- **5% GAD Budget**: Statutory budget allocation tracking
- **25 Barangays**: Complete coverage of Talibon municipality
- **Audit Trails**: Comprehensive logging for accountability

## Performance Considerations
- **Frontend**: Code splitting, lazy loading, Vite optimization
- **Backend**: Connection pooling, efficient queries, rate limiting
- **Database**: Proper indexing, query optimization, RLS policy optimization

## Monitoring & Observability
- **Sentry integration** for error tracking
- **Structured logging** for request tracing
- **Health check endpoints**: `/api/health`, `/api/ready`
- **Performance monitoring** for API responses

## When to Use Specific Tools
- **Prisma**: All database operations (schema, migrations, queries)
- **Zod**: Input validation schemas
- **JWT**: Authentication token management
- **PDFKit/ExcelJS**: Report generation (PCW-compliant exports)
- **Recharts**: Data visualization in frontend
- **Lucide React**: Icon components

## Token Efficiency Tips
1. **Use targeted searches** - Search specific modules/directories rather than entire codebase
2. **Read strategically** - Focus on relevant files based on task context
3. **Leverage existing patterns** - Copy patterns from similar features rather than exploring entire codebase
4. **Check documentation first** - Review existing docs/ files before code exploration
5. **Use architecture knowledge** - Apply understanding of modular structure to navigate efficiently

## Key Documentation Files
- `README.md` - Project overview and setup
- `SYSTEM_ARCHITECTURE.md` - Detailed architecture documentation
- `WORKSPACE.md` - Frontend/backend segregation guide
- `docs/` - Additional documentation (API contracts, migration reports, etc.)

## Development Workflow
1. Understand task context and relevant modules
2. Check existing patterns in similar features
3. Review documentation for domain-specific requirements
4. Implement following established conventions
5. Run typecheck and relevant tests
6. Verify RBAC and security compliance
7. Update documentation if needed