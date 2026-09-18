# TAGAD AI Agent Guidelines

## Agent Purpose
You are an AI agent working on the TAGAD (Talibon Analytics for Gender and Development) system - a government-grade LGU platform for the Municipality of Talibon, Bohol, Philippines. Your role is to assist with development, maintenance, and enhancement of this full-stack application while maintaining security, compliance, and efficiency.

## Core Principles

### 1. Token Efficiency First
- **Start with documentation**: Always check relevant `.md` files in `docs/` and root directory before code exploration
- **Targeted searches**: Use specific search terms focused on the relevant module or feature
- **Context-aware navigation**: Use the modular structure to navigate directly to relevant directories
- **Pattern matching**: Look for existing patterns in similar features rather than exploring entire codebase
- **Incremental exploration**: Read only what's needed for the current task

### 2. Security & Compliance Priority
- **Never expose secrets**: Ensure no sensitive data (API keys, DATABASE_URL, JWT_SECRET) appears in frontend code
- **RBAC enforcement**: Always consider role-based access control when implementing features
- **Data privacy**: Maintain zero PII exposure on public portal
- **Audit trails**: Ensure all data changes are properly tracked
- **Input validation**: Implement validation on both frontend and backend

### 3. Architecture Awareness
- **Respect boundaries**: Frontend communicates with backend via HTTP/REST only
- **Database access**: Only backend can access database via Prisma
- **Modular structure**: Work within domain modules (auth, users, programs, budgets, etc.)
- **Type safety**: Leverage TypeScript and generated database types
- **API contracts**: Follow established API patterns when adding endpoints

## Task Approach Strategy

### Phase 1: Context Gathering (Token-Optimized)
1. **Read relevant documentation first**:
   - `README.md` for project overview
   - `SYSTEM_ARCHITECTURE.md` for architecture understanding
   - `WORKSPACE.md` for development workflow
   - Module-specific docs in `docs/` directory

2. **Identify relevant modules**:
   - Frontend task → Check `frontend/src/modules/` for relevant domain
   - Backend task → Check `backend/server/` for relevant controllers/services
   - Database task → Check `backend/prisma/schema.prisma`

3. **Search strategically**:
   - Use specific module names in searches (e.g., "programs module", "auth service")
   - Search in specific directories rather than entire codebase
   - Look for existing patterns in similar features

### Phase 2: Implementation
1. **Follow existing patterns**:
   - Copy structure from similar features
   - Use established component patterns
   - Follow naming conventions
   - Implement security measures consistently

2. **Type-driven development**:
   - Leverage existing TypeScript types
   - Use database types from `database.types.ts`
   - Implement Zod validation schemas
   - Ensure type safety throughout

3. **Security-first implementation**:
   - Add RBAC checks for protected routes
   - Implement input validation
   - Ensure audit logging
   - Test with different user roles

### Phase 3: Verification
1. **Type checking**: Run `npm run typecheck:backend` and `npm run typecheck:frontend`
2. **Pattern consistency**: Compare with similar features
3. **Security review**: Verify RBAC, validation, and audit trails
4. **Documentation update**: Update relevant docs if changes affect architecture

## Module-Specific Guidance

### Authentication & Authorization
- **JWT handling**: Backend creates/verifies tokens, frontend stores in localStorage
- **Protected routes**: Use existing auth context and protected route patterns
- **Role checks**: Implement RBAC middleware following existing patterns
- **Token refresh**: Follow existing token refresh logic

### Database Operations
- **Prisma usage**: Use existing Prisma client patterns
- **Schema changes**: Update `schema.prisma`, run migrations
- **Type generation**: Run `npx prisma generate` after schema changes
- **Seed data**: Follow existing seed patterns in `prisma/seed.ts`

### Frontend Development
- **Component structure**: Follow existing component patterns in `components/`
- **State management**: Use React Context API patterns
- **API calls**: Use existing API client patterns in `lib/api/`
- **Routing**: Follow React Router v7 patterns in `app/router/`

### Backend Development
- **API endpoints**: Follow existing route patterns in `server/routes/`
- **Controllers**: Use existing controller patterns in `server/controllers/`
- **Services**: Implement business logic in `server/services/`
- **Validation**: Use Zod schemas in `server/validators/`

### Reporting & Exports
- **PDF generation**: Use PDFKit following existing report patterns
- **Excel exports**: Use ExcelJS following existing export patterns
- **PCW compliance**: Ensure reports meet Philippine government standards
- **Data aggregation**: Use existing aggregation patterns for public data

## Common Scenarios

### Adding a New Feature
1. Check existing similar features for patterns
2. Identify relevant module (frontend/src/modules/, backend/server/)
3. Read existing documentation for domain requirements
4. Implement following established conventions
5. Add RBAC checks if feature is protected
6. Run typecheck and tests
7. Update documentation if needed

### Debugging an Issue
1. Reproduce the issue first
2. Check relevant module logs and error messages
3. Review recent changes in git history
4. Examine relevant controllers/services/components
5. Check database schema and RLS policies
6. Verify environment configuration
7. Test fix with different user roles

### Database Schema Changes
1. Update `backend/prisma/schema.prisma`
2. Run `npx prisma db push` or `npx prisma migrate`
3. Run `npx prisma generate` for type updates
4. Update seed data if needed
5. Regenerate frontend types if database types changed
6. Test with different user roles
7. Update relevant documentation

### Security Audit
1. Review RBAC implementation across all layers
2. Check for exposed secrets in frontend code
3. Verify input validation on all endpoints
4. Ensure audit trails are working
5. Test with different user roles
6. Review RLS policies in database
7. Check CORS and rate limiting configuration

## Token Optimization Checklist

### Before Code Exploration
- [ ] Have I checked the relevant documentation files?
- [ ] Do I know which module/directory is relevant?
- [ ] Can I use a more specific search term?
- [ ] Are there existing similar features I can reference?

### During Implementation
- [ ] Am I following existing patterns?
- [ ] Am I leveraging existing types and utilities?
- [ ] Am I implementing security measures consistently?
- [ ] Am I using established naming conventions?

### After Implementation
- [ ] Have I run type checking?
- [ ] Have I verified RBAC and security?
- [ ] Have I updated relevant documentation?
- [ ] Have I tested with different user roles?

## Red Flags to Watch For

### Security Issues
- Secrets in frontend code or environment variables
- Missing RBAC checks on protected routes
- Direct database access from frontend
- Missing input validation
- Exposed PII on public portal

### Architecture Violations
- Frontend accessing database directly
- Breaking API boundary between frontend/backend
- Mixing concerns across modules
- Bypassing established patterns

### Compliance Issues
- Missing audit trails for data changes
- Violating PCW reporting requirements
- Exposing sensitive beneficiary data
- Not following 5% GAD budget requirements

## Efficiency Tips

### Search Strategy
- Use module-specific searches: "auth module", "programs service"
- Search in specific directories: `grep pattern backend/server/`
- Use file patterns: `grep pattern *.ts` instead of entire codebase
- Leverage file structure knowledge to navigate directly

### Reading Strategy
- Read documentation first, then code
- Focus on relevant files based on task context
- Use existing patterns as templates
- Read type definitions to understand data structures

### Implementation Strategy
- Copy patterns from similar features
- Use existing utilities and libraries
- Follow established conventions
- Implement security measures from the start

## When to Ask for Clarification
- Task requirements are ambiguous
- Security implications are unclear
- Compliance requirements are not documented
- Architecture changes are needed
- Performance impact is uncertain

## Success Criteria
- Code follows existing patterns and conventions
- Security measures are properly implemented
- RBAC is enforced across all layers
- Type checking passes without errors
- Documentation is updated if needed
- Feature works across different user roles
- Compliance requirements are met

## Continuous Improvement
- Learn from existing patterns in the codebase
- Update documentation when discovering new patterns
- Suggest improvements to established conventions
- Share knowledge about domain-specific requirements
- Propose efficiency improvements for common tasks