import React from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, UserRound } from 'lucide-react';
import { useAuth } from '../../modules/auth/AuthContext';
import { formatRole } from '../../lib/utils/cn';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
import { workspacePath } from './Sidebar';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard', '/barangay-statistics': 'Provisional Barangay Counts',
  '/data-encoding': 'Beneficiary Registry', '/programs': 'Programs and Services',
  '/accomplishments': 'Accomplishments', '/gad-plan': 'GAD Plans and Budgets',
  '/reports': 'Working Reports', '/users': 'User Management',
};
export const TopBar: React.FC<{ onOpenNavigation: () => void }> = ({ onOpenNavigation }) => {
  const { user, roles, logout } = useAuth();
  const { pathname } = useLocation();
  return (
    <header className="workspace-header">
      <div className="workspace-heading">
        <button className="workspace-icon-button mobile-navigation-toggle" onClick={onOpenNavigation} aria-label="Open navigation" aria-haspopup="dialog"><Menu size={20} /></button>
        <div><p className="font-semibold">{titles[workspacePath(pathname)] || 'GAD Workspace'}</p><p className="text-sm text-muted-foreground">Personal portal / GAD workspace</p></div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger className="workspace-account" aria-label="Account menu">
          <UserRound size={18} aria-hidden="true" />
          <span className="min-w-0 text-left"><span className="block font-medium">{user?.full_name || user?.email}</span><span className="block text-sm text-muted-foreground">{roles.map(formatRole).join(', ')}</span></span>
          <ChevronDown size={16} className="shrink-0" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="portal-theme max-w-[calc(100vw-2rem)] min-w-56 p-2">
          {user?.office?.name && <p className="px-2 py-3 text-sm break-words">{user.office.name}</p>}
          <DropdownMenuItem onClick={() => logout()} className="min-h-11 cursor-pointer px-3"><LogOut size={18} aria-hidden="true" />Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};
