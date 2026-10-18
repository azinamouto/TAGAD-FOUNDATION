import React, { Suspense, useEffect, useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';

export const AppLayout: React.FC = () => {
  const drawer = useRef<HTMLDialogElement>(null);
  const location = useLocation();
  const closeDrawer = () => {
    drawer.current?.close();
    document.body.style.overflow = '';
  };
  useLayoutEffect(() => { closeDrawer(); }, [location]);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const resize = () => { if (query.matches) closeDrawer(); };
    query.addEventListener('change', resize);
    return () => { query.removeEventListener('change', resize); document.body.style.overflow = ''; };
  }, []);
  return (
    <div className="portal-theme workspace-shell">
      <a className="workspace-skip" href="#workspace-content">Skip to content</a>
      <div className="desktop-navigation"><Sidebar /></div>
      <dialog ref={drawer} className="workspace-drawer" aria-label="Workspace navigation" onClose={() => { if (!drawer.current?.open) document.body.style.overflow = ''; }} onClick={event => { if (event.target === drawer.current) closeDrawer(); }} onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = drawer.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
        <button className="workspace-icon-button drawer-close" onClick={closeDrawer} aria-label="Close navigation"><X size={20} /></button>
        <Sidebar onNavigate={closeDrawer} />
      </dialog>
      <div className="workspace-body">
        <TopBar onOpenNavigation={() => { drawer.current?.showModal(); document.body.style.overflow = 'hidden'; }} />
        <main id="workspace-content" tabIndex={-1} className="workspace-content"><Suspense fallback={<p role="status" className="text-muted-foreground">Loading page…</p>}><Outlet /></Suspense></main>
      </div>
    </div>
  );
};
