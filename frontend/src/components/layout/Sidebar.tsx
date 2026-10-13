import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../modules/auth/AuthContext';
import { formatRole } from '../../lib/utils/cn';

export const Sidebar: React.FC = () => {
  const { user, roles, isAdmin } = useAuth();
  const groups = [
    { title: 'Dashboard and Barangay Statistics', links: [{ name: 'Dashboard', path: '/dashboard' }] },
    { title: 'Data Encoding and Management', links: [{ name: 'Beneficiary Registry', path: '/data-encoding' }] },
    { title: 'GAD Program and Service Monitoring', links: [
      { name: 'Programs and Services', path: '/programs' },
      { name: 'GAD Plans and Budgets', path: '/gad-plan' },
      { name: 'Accomplishments', path: '/accomplishments' },
    ] },
    { title: 'Analytics and Barangay Mapping', links: [{ name: 'Barangay and Sex Statistics', path: '/dashboard#barangay-statistics' }], note: 'Charts available. Interactive mapping is not yet available.' },
    { title: 'Reports and Exports', links: [{ name: 'Working Reports', path: '/reports' }] },
    ...(isAdmin ? [{ title: 'User and System Administration', links: [{ name: 'User Management', path: '/users' }], note: 'Access controls and privacy safeguards apply across the workspace.' }] : []),
  ];

  return (
    <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-card md:h-[calc(100vh-4rem)] md:sticky md:top-16 shrink-0 flex flex-col">
      <div className="p-4 border-b border-border space-y-1">
        <div className="text-xs font-semibold">{user?.full_name || 'System User'}</div>
        <div className="text-[11px] text-muted-foreground">{user?.office?.name || user?.office_id || 'Municipality of Talibon'}</div>
        <div className="text-[11px] text-muted-foreground">{roles.map(formatRole).join(', ')}</div>
      </div>
      <nav aria-label="GAD workspace" className="p-3 space-y-4 md:overflow-y-auto">
        {groups.map(group => (
          <section key={group.title}>
            <h2 className="px-2 mb-1 text-xs font-semibold text-muted-foreground">{group.title}</h2>
            {group.links.map(link => (
              <NavLink key={link.path} to={link.path} className={({ isActive }) =>
                `block rounded px-2.5 py-2 text-sm ${isActive ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
              }>{link.name}</NavLink>
            ))}
            {group.note && <p className="px-2 mt-1 text-xs text-muted-foreground">{group.note}</p>}
          </section>
        ))}
      </nav>
    </aside>
  );
};
export default Sidebar;
