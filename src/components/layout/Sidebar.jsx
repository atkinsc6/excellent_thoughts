import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Trophy, DollarSign, Target, TrendingUp, Users, MapPin, Settings
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/',            icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/scorecard',   icon: ClipboardList,   label: 'Scorecard Entry' },
  { path: '/leaderboard', icon: Trophy,           label: 'Leaderboard' },
  { path: '/skins',       icon: DollarSign,       label: 'Skins Tracker' },
  { path: '/ctp',         icon: Target,           label: 'CTP Tracker' },
  { path: '/handicap',    icon: TrendingUp,       label: 'Handicap Tracker' },
  { path: '/members',     icon: Users,            label: 'Members' },
  { path: '/courses',     icon: MapPin,           label: 'Courses' },
  { path: '/settings',    icon: Settings,         label: 'League Settings' },
];

export function Sidebar({ league }) {
  const location = useLocation();

  return (
    <aside
      className="hidden lg:flex flex-col w-60 min-h-screen flex-shrink-0 border-r"
      style={{ backgroundColor: 'var(--color-primary)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      {/* Logo area */}
      <div className="px-5 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-primary)' }}
          >
            FO
          </div>
          <div>
            <div className="text-white font-semibold text-sm leading-tight" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px' }}>
              FairwayOS
            </div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {league?.name || 'Golf League'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <NavLink
              key={path}
              to={path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group"
              style={{
                color: isActive ? 'var(--color-accent)' : 'rgba(255,255,255,0.7)',
                backgroundColor: isActive ? 'rgba(184,151,42,0.12)' : 'transparent',
                borderRight: isActive ? '3px solid var(--color-accent)' : '3px solid transparent',
              }}
            >
              <Icon size={17} style={{ flexShrink: 0 }} />
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* Season badge */}
      <div className="px-5 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Season</div>
        <div className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {league?.season || '2025'}
        </div>
      </div>
    </aside>
  );
}
