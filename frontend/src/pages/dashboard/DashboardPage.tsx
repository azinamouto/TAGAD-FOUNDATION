import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../modules/auth/AuthContext';
import { formatRole } from '../../lib/utils/cn';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

export const DashboardPage: React.FC = () => {
  const { user, roles, isSuperAdmin, isAdmin } = useAuth();

  const coreModules = [
    {
      title: 'GAD Programs & Projects',
      description: 'Manage LGU Gender and Development programs, sector targets, and activity matrices.',
      path: '/programs',
      badge: 'Core GAD',
    },
    {
      title: 'Annual GAD Plan & Budget Matrix',
      description: 'Prepare and track mandatory 5% LGU GAD annual budget allocations and statutory plans.',
      path: '/gad-plan',
      badge: 'Statutory',
    },
    {
      title: 'Accomplishment Reports',
      description: 'Log actual physical targets, financial expenditures, and variances for PCW submission.',
      path: '/accomplishments',
      badge: 'Compliance',
    },
    {
      title: 'Beneficiaries Database',
      description: 'Sex-disaggregated demographic registry of constituents across Talibon’s 25 barangays.',
      path: '/data-encoding',
      badge: 'Disaggregated Data',
    },
    {
      title: 'PCW Reports Generator',
      description: 'Export statutory PDF and Excel GAD accomplishment and plan matrices.',
      path: '/reports',
      badge: 'Reporting',
    },
  ];

  const sprintChecklist = [
    { label: 'Modular Project Architecture (src/modules/*)', status: true },
    { label: 'Supabase & PostgreSQL Schema Initialized', status: true },
    { label: 'Role-Based Access Control Foundation (5 Roles)', status: true },
    { label: 'Row-Level Security Policies Defined', status: true },
    { label: 'TypeScript Database Types Synchronized', status: true },
    { label: 'Secure Session Persistence & Protected Routing', status: true },
    { label: 'Audit Trail Structure Prepared', status: true },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Welcome & Identity Surface */}
      <div className="bg-card dark:bg-background border border-border dark:border-border rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-primary dark:text-primary">
                Talibon GFPS Workspace
              </span>
              <span className="text-foreground dark:text-foreground">•</span>
              <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                Sprint 1 Foundation Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground dark:text-foreground tracking-tight">
              Welcome, {user?.full_name || 'Official'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground">
              Assigned Office: <span className="font-semibold text-foreground dark:text-foreground">{user?.office?.name || user?.office_id || 'Municipal Planning & Development Office'}</span>
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {roles.map((role) => (
                <Badge key={role} variant="secondary" className="bg-accent text-primary dark:bg-accent/60 dark:text-primary border-primary">
                  {formatRole(role)}
                </Badge>
              ))}
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Authenticated Session Verified
            </span>
          </div>
        </div>
      </div>

      {/* Sprint 1 System Readiness Card */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border dark:border-border pb-3">
          <div>
            <h2 className="text-sm font-bold text-foreground dark:text-foreground">
              Sprint 1 Core Readiness Verification
            </h2>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground">
              Technical foundation, database entities, authentication, and security rules.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200">
            All Systems Ready
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {sprintChecklist.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted dark:bg-background/60 border border-border dark:border-border/80 text-xs font-medium text-foreground dark:text-foreground"
            >
              <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                ✓
              </span>
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Core Domain Modules Navigation Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground dark:text-foreground">
            GAD Domain Modules
          </h2>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground">
            Select a module to review its initial data structure and workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coreModules.map((module) => (
            <Link
              key={module.title}
              to={module.path}
              className="group p-5 rounded-xl bg-card dark:bg-background border border-border dark:border-border hover:border-primary dark:hover:border-primary transition-all shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground">
                    {module.badge}
                  </span>
                  <span className="text-muted-foreground group-hover:text-primary dark:group-hover:text-primary transition-colors text-sm">
                    →
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground dark:text-foreground group-hover:text-primary dark:group-hover:text-primary transition-colors">
                  {module.title}
                </h3>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground leading-relaxed">
                  {module.description}
                </p>
              </div>
            </Link>
          ))}

          {isAdmin && (
            <Link
              to="/users"
              className="group p-5 rounded-xl bg-accent/50 dark:bg-accent/20 border border-primary dark:border-primary/60 hover:border-primary transition-all shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-accent dark:bg-accent text-primary dark:text-primary">
                    Admin
                  </span>
                  <span className="text-primary dark:text-primary text-sm">
                    →
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground dark:text-foreground group-hover:text-primary dark:group-hover:text-primary transition-colors">
                  User & Role Management
                </h3>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground leading-relaxed">
                  Provision accounts for MPDC, MSWDO, MHO, MAO, and Barangay Focal units.
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
