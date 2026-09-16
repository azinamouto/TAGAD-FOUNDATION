# TAGAD System Architecture Documentation

> **Talibon Analytics for Gender and Development**  
> *Municipality of Talibon, Province of Bohol, Republic of the Philippines*

---

## Overview

TAGAD is a government-grade Gender and Development (GAD) platform designed for the Local Government Unit (LGU) of Talibon, Bohol. The system centralizes GAD management across municipal departments and 25 Barangays with strict compliance to Philippine government regulations including the Data Privacy Act of 2012 (RA 10173) and PCW guidelines.

### Architecture Pattern
**Modular Monolith** with segregated frontend/backend deployment for scalability and security.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TAGAD SYSTEM ARCHITECTURE                          │
│                  Talibon Analytics for Gender and Development                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            USER INTERFACES                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────────────────────────┐
│   PUBLIC PORTAL      │         │   AUTHENTICATED ADMIN WORKSPACE          │
│   (Anonymous Access) │         │   (RBAC Protected)                       │
└──────────────────────┘         └──────────────────────────────────────────┘
         │                                    │
         │ - Landing Page                     │ - Dashboard
         │ - Public Demographics              │ - Program Monitoring
         │ - Budget Transparency              │ - GAD Planning
         │ - Barangay Coverage                │ - Accomplishments
         │                                    │ - Data Encoding
         │                                    │ - Reports Generation
         │                                    │ - User Management
         └────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER (React 19)                            │
│                         ┌──────────────────────────┐                        │
│                         │  React SPA (Vite Build)   │                        │
│                         │  - TypeScript             │                        │
│                         │  - Tailwind CSS v4        │                        │
│                         │  - React Router v7        │                        │
│                         └──────────────────────────┘                        │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         DOMAIN MODULES                                 │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  • auth/           - Authentication context & protected routes         │  │
│  │  • users/          - User profile & office/barangay scope             │  │
│  │  • programs/       - GAD programs & sector projects                    │  │
│  │  • budgets/        - 5% statutory budget & office allocations          │  │
│  │  • documents/      - Means of Verification (MOV) registry              │  │
│  │  • audit/          - Traceable audit logging foundation                │  │
│  │  • statisticalCatalog/ - Statistical data catalog management          │  │
│  │  • statisticalData/    - Statistical data ingestion & analysis        │  │
│  │  • tableBuilder/   - Dynamic table building capabilities              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      UI COMPONENTS LAYER                              │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  • layout/         - TopBar, Sidebar, AppLayout, PublicLayout         │  │
│  │  • ui/             - Button, Input, Card, Badge (shadcn/ui)           │  │
│  │  • common/         - Logo, LoadingSpinner, StatusBadge                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                       SHARED LIBRARIES                                 │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  • lib/supabase/   - Typed Supabase client                            │  │
│  │  • lib/utils/      - Formatting, class merging (cn)                   │  │
│  │  • lib/validation/ - Input validation logic                           │  │
│  │  • api/            - HTTP client with JWT auth                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP/REST API Calls
                                      │ (JWT Authorization Header)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND LAYER (Express.js)                           │
│                         ┌──────────────────────────┐                        │
│                         │  Express API Server       │                        │
│                         │  - TypeScript             │                        │
│                         │  - Middleware Stack       │                        │
│                         │  - Route Controllers      │                        │
│                         └──────────────────────────┘                        │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      SECURITY MIDDLEWARE                              │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  • Helmet          - Security headers                                 │  │
│  │  • CORS            - Cross-origin resource sharing                    │  │
│  │  • Rate Limiting   - Request throttling                               │  │
│  │  • Request Logger  - Structured request tracing                        │  │
│  │  • JWT Auth        - Token verification & RBAC                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         API ROUTES                                    │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  • /api/auth       - Authentication (login, logout, refresh)         │  │
│  │  • /api/public     - Public data access                              │  │
│  │  • /api/admin      - Admin operations (users, config)                 │  │
│  │  • /api/users      - User management                                  │  │
│  │  • /api/beneficiaries - Beneficiary tracking                          │  │
│  │  • /api/programs   - GAD program management                           │  │
│  │  • /api/gad-plans  - GAD planning matrices                             │  │
│  │  • /api/accomplishments - Accomplishment tracking                     │  │
│  │  • /api/dashboard  - Dashboard analytics                              │  │
│  │  • /api/reports    - PDF/Excel report generation                       │  │
│  │  • /api/statistical-catalog - Statistical catalog management          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      BUSINESS LOGIC LAYER                             │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  • controllers/   - Request handlers & validation                     │  │
│  │  • services/      - Business logic & domain operations                 │  │
│  │  • validators/    - Input validation schemas (Zod)                    │  │
│  │  • middleware/    - Custom middleware (auth, RBAC)                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      DATA ACCESS LAYER                               │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  • Prisma ORM     - Type-safe database queries                        │  │
│  │  • lib/prisma/    - Database client & connection management           │  │
│  │  • lib/jwt/       - JWT token generation & verification               │  │
│  │  • lib/logger/    - Structured logging (Sentry integration)           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Prisma Queries
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE LAYER                                      │
│                         ┌──────────────────────────┐                        │
│                         │  PostgreSQL Database     │                        │
│                         │  (Hosted via Supabase)   │                        │
│                         └──────────────────────────┘                        │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    SECURITY & COMPLIANCE                                │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  • Row Level Security (RLS) - Database-level access control            │  │
│  │  • Foreign Key Constraints  - Data integrity                          │  │
│  │  • Audit Triggers           - Automatic change tracking                │  │
│  │  • Immutable Audit Logs     - Append-only audit trail                 │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      CORE DATA TABLES                                 │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  • users           - User accounts & roles (RBAC)                     │  │
│  │  • offices         - Municipal departments                            │  │
│  │  • barangays       - 25 Barangays of Talibon                          │  │
│  │  • programs        - GAD programs & projects                          │  │
│  │  • beneficiaries    - Program beneficiaries                             │  │
│  │  • budgets         - 5% GAD budget allocations                        │  │
│  │  • gad_plans       - GAD planning matrices                             │  │
│  │  • accomplishments  - Accomplishment tracking                          │  │
│  │  • documents       - Means of Verification (MOV)                       │  │
│  │  • audit_logs      - Immutable audit trail                             │  │
│  │  • statistical_catalog - Statistical data definitions                 │  │
│  │  • statistical_data    - Statistical data records                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL INTEGRATIONS                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐         ┌──────────────────────┐
│   Supabase Auth      │         │   Google Gemini AI    │         │   Sentry Monitoring  │
│   (JWT Management)   │         │   (AI Analytics)     │         │   (Error Tracking)   │
└──────────────────────┘         └──────────────────────┘         └──────────────────────┘
```

---

## Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 6.2
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Routing**: React Router v7
- **State Management**: React Context API
- **Icons**: Lucide React
- **Charts**: Recharts
- **Type Safety**: Zod validation

### Backend
- **Framework**: Express.js 4.22 + TypeScript
- **ORM**: Prisma 5.21
- **Authentication**: JWT (jsonwebtoken) + bcryptjs
- **Security**: Helmet, CORS, express-rate-limit
- **Reporting**: PDFKit, ExcelJS
- **Monitoring**: Sentry integration
- **AI Integration**: Google Gemini API

### Database
- **Database**: PostgreSQL (via Supabase)
- **Security**: Row Level Security (RLS)
- **Access**: Prisma ORM with type-safe queries
- **Compliance**: Audit trails, foreign key constraints

---

## Directory Structure

```
TAGAD-FOUNDATION/
├── frontend/                          # React SPA (independently deployable)
│   ├── src/
│   │   ├── app/                       # Application bootstrap & routing
│   │   │   ├── config/                # Environment configuration
│   │   │   ├── providers/             # React context providers
│   │   │   └── router/                # Route definitions
│   │   ├── modules/                   # Domain-driven feature modules
│   │   │   ├── auth/                  # Authentication & protected routes
│   │   │   ├── users/                 # User management
│   │   │   ├── programs/              # GAD program management
│   │   │   ├── budgets/               # Budget allocation
│   │   │   ├── documents/             # MOV document registry
│   │   │   ├── audit/                 # Audit logging
│   │   │   ├── statisticalCatalog/    # Statistical catalog
│   │   │   ├── statisticalData/       # Statistical data analysis
│   │   │   └── tableBuilder/          # Dynamic table building
│   │   ├── components/                # Reusable UI components
│   │   │   ├── layout/                # Layout components
│   │   │   ├── ui/                    # shadcn/ui components
│   │   │   └── common/                # Common utilities
│   │   ├── lib/                       # Shared libraries
│   │   │   ├── supabase/              # Supabase client
│   │   │   ├── utils/                 # Utilities
│   │   │   └── validation/            # Validation logic
│   │   ├── pages/                     # Route page views
│   │   │   ├── public/                # Public pages
│   │   │   ├── auth/                  # Authentication pages
│   │   │   └── dashboard/             # Admin dashboard
│   │   └── types/                     # TypeScript types
│   ├── public/                        # Static assets
│   ├── index.html                     # SPA entry point
│   ├── vite.config.ts                # Vite configuration
│   └── package.json                   # Frontend dependencies
│
├── backend/                           # Express API Server (independently deployable)
│   ├── server/
│   │   ├── controllers/               # Request handlers
│   │   ├── routes/                    # API route definitions
│   │   ├── services/                  # Business logic
│   │   ├── middleware/                # Custom middleware
│   │   ├── validators/               # Input validation
│   │   ├── lib/                       # Core libraries
│   │   │   ├── prisma/                # Database client
│   │   │   ├── jwt/                   # JWT utilities
│   │   │   └── logger/                # Logging
│   │   └── types/                     # TypeScript types
│   ├── prisma/
│   │   ├── schema.prisma              # Database schema
│   │   └── seed.ts                    # Database seeding
│   ├── supabase/                      # Supabase migrations
│   ├── tests/                         # Backend tests
│   ├── server.ts                      # Backend entry point
│   └── package.json                   # Backend dependencies
│
├── docs/                              # Documentation
│   ├── ARCHITECTURE.md                # Architecture specification
│   ├── BLUEPRINT.md                   # Development blueprint
│   └── STATISTICAL_*.md               # Statistical modules docs
│
├── package.json                       # Root package.json
├── README.md                          # Project overview
└── WORKSPACE.md                       # Workspace documentation
```

---

## Data Flow Examples

### User Login Flow
```
1. User enters credentials → Frontend POST /api/auth/login
2. Backend validates credentials → Creates JWT token
3. Frontend stores JWT in localStorage
4. Subsequent requests include Authorization: Bearer <token>
5. Backend verifies JWT → Enforces RBAC → Returns data
```

### Program Creation Flow
```
1. ENCODER creates program → POST /api/programs
2. Backend validates input → Inserts into programs table
3. Database trigger sets created_by, created_at
4. Audit log entry created automatically
5. Frontend updates UI with new program
```

### Public Data Access
```
1. Anonymous user visits public portal
2. Frontend requests public data → GET /api/public/*
3. Backend applies RLS policies (public read only)
4. Returns aggregated data (no PII)
5. Public dashboard displays budget totals, barangay coverage
```

### Report Generation
```
1. ADMIN requests report → POST /api/reports
2. Backend queries database with RBAC filters
3. Generates PDF/Excel using PDFKit/ExcelJS
4. Returns downloadable file
5. Frontend triggers browser download
```

---

## Role-Based Access Control (RBAC)

TAGAD enforces 4 discrete roles with hierarchical permissions:

| Role | Scope | Permissions |
| :--- | :--- | :--- |
| `SUPER_ADMIN` | Global / System | System-wide authority, including publication approval and configuration |
| `ADMIN` | LGU Executive | Cross-office CRUD, approval workflows, user management, and audit logs |
| `ENCODER` | Assigned Office | Create and update permitted records within the assigned office |
| `VIEWER` | Read-only | View approved data, dashboards, and reports without mutation access |

### RBAC Enforcement Layers
1. **Frontend**: Protected routes hide unauthorized UI elements
2. **Backend**: JWT verification + role-based middleware
3. **Database**: Row Level Security (RLS) policies

---

## Security Architecture

### Defense-in-Depth Approach

**Frontend Security**
- Protected routes prevent unauthorized navigation
- JWT handling with automatic token refresh
- Input validation with Zod schemas
- XSS protection via React's built-in escaping

**Backend Security**
- Helmet security headers
- CORS configuration with allowlist
- Rate limiting to prevent abuse
- JWT verification with token revocation
- Structured request logging for audit trails

**Database Security**
- Row Level Security (RLS) policies
- Foreign key constraints for data integrity
- Automatic audit triggers
- Immutable audit logs (append-only)
- Encrypted connections (TLS)

### Data Privacy Compliance
- **Zero PII Exposure**: Public portal shows only aggregated data
- **Audit Trail**: Every data change is logged with user context
- **Data Retention**: Configurable retention policies
- **Access Control**: Multi-layer RBAC enforcement

---

## Deployment Architecture

### Independent Deployment Strategy

**Frontend Deployment**
```bash
cd frontend
npm run build        # Outputs to frontend/dist/
# Deploy dist/ to static hosting (Vercel, Netlify, S3)
```

**Backend Deployment**
```bash
cd backend
npm run start        # Runs on http://localhost:3000
# Deploy as Node.js service (Railway, Heroku, VPS)
```

**Environment Variables**

Frontend (`frontend/.env`):
- `VITE_API_BASE_URL` - Backend API endpoint

Backend (`backend/.env`):
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `GEMINI_API_KEY` - Google AI API key
- `SENTRY_DSN` - Error tracking DSN

---

## API Boundary

**Frontend communicates with Backend exclusively via HTTP/REST:**

```
Frontend (React SPA)
    ↓ HTTP/REST
Backend Express API
    ↓ 
Prisma ORM
    ↓
PostgreSQL Database
```

### Frontend → Backend URLs
- `VITE_API_BASE_URL` env var controls the API endpoint
- Default: `http://localhost:3000/api` (development)
- Production: Set to your backend URL (e.g., `https://api.example.com/api`)

---

## Key System Characteristics

### Architecture Pattern
- **Modular Monolith** with frontend/backend separation
- Domain-driven design with feature modules
- Type-safe development with TypeScript throughout

### Security Model
- Defense-in-depth approach across all layers
- Multi-layer RBAC enforcement
- Comprehensive audit trails
- Data privacy compliance (RA 10173)

### Data Flow
- Unidirectional from frontend → backend → database
- Frontend never accesses database directly
- All data access goes through backend API
- Backend enforces RBAC at multiple layers

### Compliance Features
- **PCW Compliance**: Philippine Commission on Women guidelines
- **Data Privacy Act**: RA 10173 compliance
- **5% GAD Budget**: Statutory budget tracking
- **25 Barangays**: Complete coverage of Talibon, Bohol

### Monitoring & Observability
- Structured logging with Sentry integration
- Request tracing and performance monitoring
- Error tracking and alerting
- Health check endpoints (`/api/health`, `/api/ready`)

---

## Development Workflow

### Local Development Setup
```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Configure environment variables
# Copy .env.example to .env for both frontend and backend

# Initialize database
cd backend
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts

# Start development servers
npm run dev:backend    # Backend on http://localhost:3000
npm run dev:frontend   # Frontend on http://localhost:5173
```

### Type Checking
```bash
npm run typecheck:backend
npm run typecheck:frontend
```

### Database Operations
```bash
cd backend
npm run db:validate    # Validate Prisma schema
npm run db:migrate     # Deploy migrations
npm run db:seed        # Seed database
```

---

## Performance Considerations

### Frontend Optimization
- Code splitting via React Router
- Lazy loading of route components
- Vite's optimized build pipeline
- Tailwind CSS v4's runtime optimization

### Backend Optimization
- Connection pooling via Prisma
- Efficient database queries with proper indexing
- Rate limiting to prevent abuse
- Caching strategies for frequently accessed data

### Database Optimization
- Proper indexing on foreign keys
- Query optimization with Prisma
- RLS policy optimization
- Connection pooling configuration

---

## Monitoring & Maintenance

### Health Checks
- `/api/health` - Basic system health
- `/api/ready` - Readiness check (database + revocation store)

### Logging
- Structured request logging
- Error tracking via Sentry
- Audit trail for all data changes
- Performance monitoring

### Backup & Recovery
- Automated database backups (Supabase)
- Audit log preservation
- Configuration version control
- Disaster recovery procedures

---

## Future Scalability

### Microservices Readiness
- Clean API boundaries enable service extraction
- Domain modules can be isolated as services
- Database schema supports multi-tenancy

### Feature Expansion
- Modular architecture allows easy feature addition
- Statistical data modules for advanced analytics
- AI integration via Google Gemini
- Extensible reporting engine

### Compliance Evolution
- Configurable RBAC for new requirements
- Extensible audit trail system
- Adaptable RLS policies
- Template-based report generation

---

## Conclusion

The TAGAD system architecture provides a solid foundation for government-grade analytics while maintaining security, compliance, and scalability. The modular monolith approach with segregated frontend/backend deployment offers the right balance of development velocity and operational simplicity, with clear paths for future evolution into microservices if needed.

The defense-in-depth security model ensures data privacy and compliance with Philippine government regulations, while the comprehensive audit trails provide transparency and accountability for all system operations.

---

*Last Updated: September 2026*  
*Version: 2.0.0*