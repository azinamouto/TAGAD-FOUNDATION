import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  FileSpreadsheet,
  CheckSquare,
  Users,
  BarChart3,
  Settings,
  Database,
  Table2,
} from 'lucide-react';
import { useAuth } from '../../modules/auth/AuthContext';
import { formatRole } from '../../lib/utils/cn';

export const Sidebar: React.FC = () => {
  const { user, roles, isAdmin } = useAuth();

  const navigationItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'GAD Programs', path: '/programs', icon: ClipboardList },
    { name: 'GAD Plans Matrix', path: '/gad-plan', icon: FileSpreadsheet },
    { name: 'Accomplishments', path: '/accomplishments', icon: CheckSquare },
    { name: 'Beneficiaries', path: '/data-encoding', icon: Users },
    { name: 'Data Entry Grid', path: '/statistical-data', icon: FileSpreadsheet },
    { name: 'Statistical Catalog', path: '/statistical-catalog', icon: Database },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
  ];

  const adminItems = [
    { name: 'Table Builder', path: '/admin/table-builder', icon: Table2 },
    { name: 'Statistical Catalog', path: '/admin/statistical-catalog', icon: Table2 },
    { name: 'User Management', path: '/users', icon: Settings },
  ];

  return (
    <aside className="w-60 border-r border-border dark:border-border bg-card dark:bg-background flex flex-col h-[calc(100vh-4rem)] sticky top-16 shrink-0">
      {/* User Scope / Organization Header */}
      <div className="p-4 border-b border-border dark:border-border space-y-1">
        <div className="text-xs font-semibold text-foreground dark:text-foreground truncate">
          {user?.full_name || 'System User'}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          {user?.office?.name || user?.office_id || 'Municipality of Talibon'}
        </div>
        <div className="text-[11px] text-muted-foreground font-medium">
          {roles.map((r) => formatRole(r)).join(', ')}
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        <div>
          <div className="px-2 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Workspace
          </div>
          <nav className="space-y-0.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
                      isActive
                        ? 'bg-muted dark:bg-muted text-foreground dark:text-foreground font-semibold'
                        : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-muted/50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Administration Section */}
        {isAdmin && (
          <div>
            <div className="px-2 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Administration
            </div>
            <nav className="space-y-0.5">
              {adminItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
                        isActive
                          ? 'bg-muted dark:bg-muted text-foreground dark:text-foreground font-semibold'
                          : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-muted/50'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;

