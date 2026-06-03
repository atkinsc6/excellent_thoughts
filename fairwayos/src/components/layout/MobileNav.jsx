import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Trophy, DollarSign, Users } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/',            icon: LayoutDashboard, label: 'Home' },
  { path: '/scorecard',   icon: ClipboardList,   label: 'Score' },
  { path: '/leaderboard', icon: Trophy,           label: 'Board' },
  { path: '/skins',       icon: DollarSign,       label: 'Skins' },
  { path: '/members',     icon: Users,            label: 'Members' },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex border-t"
      style={{ backgroundColor: 'var(--color-primary)', borderColor: 'rgba(255,255,255,0.1)' }}
    >
      {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
        const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
        return (
          <NavLink
            key={path}
            to={path}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
            style={{ color: isActive ? 'var(--color-accent)' : 'rgba(255,255,255,0.6)' }}
          >
            <Icon size={20} />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
