import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChartColumn, CheckCircle2, ClipboardPen, FileSpreadsheet, FileText, FolderKanban, LayoutDashboard, Settings, Landmark, Users } from 'lucide-react';
import { useAuth } from '../../modules/auth/AuthContext';

export function workspacePath(path: string) {
  return path.replace(/^\/admin(?=\/)/, '').replace(/^\/beneficiaries$/, '/data-encoding');
}

export const Sidebar: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const current = workspacePath(location.pathname) + location.hash;
  const groups = [
    { title: 'Sex-Disaggregated Barangay Statistics', links: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Provisional Barangay Counts', path: '/barangay-statistics', icon: ClipboardPen },
      { name: 'Barangay and Sex Statistics', path: '/dashboard#barangay-statistics', icon: ChartColumn },
    ], note: 'Interactive mapping is not yet available.' },
    { title: 'GAD Data Management', links: [{ name: 'Beneficiary Registry', path: '/data-encoding', icon: Users }] },
    { title: 'Programs and Services', links: [
      { name: 'Programs and Services', path: '/programs', icon: FolderKanban },
      { name: 'Accomplishments', path: '/accomplishments', icon: CheckCircle2 },
    ] },
    { title: 'GAD Planning and Reports', links: [
      { name: 'GAD Plans and Budgets', path: '/gad-plan', icon: FileSpreadsheet },
      { name: 'Working Reports', path: '/reports', icon: FileText },
    ] },
    ...(isAdmin ? [{ title: 'Administration', links: [{ name: 'User Management', path: '/users', icon: Settings }] }] : []),
  ];
  return (
    <aside className="workspace-sidebar">
      <Link to="/dashboard" onClick={onNavigate} className="workspace-brand" aria-label="TAGAD dashboard">
        <span className="brand-icon"><Landmark size={22} aria-hidden="true" /></span>
        <span><strong>TAGAD</strong><small>Municipality of Talibon</small></span>
      </Link>
      <nav aria-label="GAD workspace" className="workspace-navigation">
        {groups.map(group => (
          <section key={group.title} className={group.title === 'Administration' ? 'navigation-admin' : undefined}>
            <h2>{group.title}</h2>
            {group.links.map(({ icon: Icon, ...link }) => {
              const active = current === link.path || (link.path === '/dashboard' && workspacePath(location.pathname) === '/dashboard' && location.hash !== '#barangay-statistics');
              return <Link key={link.path} to={link.path} onClick={onNavigate} aria-current={active ? 'page' : undefined} className="workspace-nav-link">
                <Icon size={18} aria-hidden="true" /><span>{link.name}</span>
              </Link>;
            })}
            {group.note && <p className="navigation-note">{group.note}</p>}
          </section>
        ))}
      </nav>
      <div className="workspace-sidebar-footer">Gender and Development<br /><span>Administrative workspace</span></div>
    </aside>
  );
};
export default Sidebar;
