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
    <aside className="w-60 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-[calc(100vh-4rem)] sticky top-16 shrink-0">
      {/* User Scope / Organization Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-1">
        <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
          {user?.full_name || 'System User'}
        </div>
        <div className="text-[11px] text-slate-500 truncate">
          {user?.office?.name || user?.office_id || 'Municipality of Talibon'}
        </div>
        <div className="text-[11px] text-slate-400 font-medium">
          {roles.map((r) => formatRole(r)).join(', ')}
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        <div>
          <div className="px-2 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
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
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Administration Section */}
        {isAdmin && (
          <div>
            <div className="px-2 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
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
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0 text-slate-400" />
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

