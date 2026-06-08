import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Trophy, DollarSign, Target, TrendingUp, Users, MapPin, Settings,
  Users2, CalendarDays, Bell, ChevronDown, Plus, LogIn, LogOut, Check, Award, Download, Shield
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { path: '/',            icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/scorecard',   icon: ClipboardList,   label: 'Scorecard' },
  { path: '/leaderboard', icon: Trophy,           label: 'Leaderboard' },
  { path: '/teams',       icon: Users2,           label: 'Teams' },
  { path: '/skins',       icon: DollarSign,       label: 'Skins' },
  { path: '/ctp',         icon: Target,           label: 'CTP' },
  { path: '/handicap',    icon: TrendingUp,       label: 'Handicap' },
  { path: '/awards',      icon: Award,            label: 'Awards' },
  { path: '/members',     icon: Users,            label: 'Members' },
  { path: '/courses',     icon: MapPin,           label: 'Courses' },
  { path: '/schedule',    icon: CalendarDays,     label: 'Schedule' },
  { path: '/ryder-cup',   icon: Shield,           label: 'Ryder Cup' },
  { path: '/payouts',     icon: DollarSign,       label: 'Payouts' },
  { path: '/settings',    icon: Settings,         label: 'Settings' },
];

export function Sidebar({ league, activity = [], getNotifReadAt, markNotifsRead }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, activeLeagueId, switchLeague, createLeague, joinLeague, logout, getLeagueName } = useAuth();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [newLeagueName, setNewLeagueName] = useState('');
  const [switcherTab, setSwitcherTab] = useState('leagues');
  const [error, setError] = useState('');
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const lastRead = getNotifReadAt?.();
  const unreadCount = lastRead
    ? activity.filter(a => new Date(a.timestamp) > new Date(lastRead)).length
    : activity.length;

  const handleNotifClick = () => {
    setShowNotifs(!showNotifs);
    if (!showNotifs) markNotifsRead?.();
  };

  const handleJoin = () => {
    try {
      setError('');
      joinLeague(joinCode.toUpperCase());
      setShowSwitcher(false);
      setJoinCode('');
    } catch (e) { setError(e.message); }
  };

  const handleCreate = () => {
    if (!newLeagueName.trim()) return;
    createLeague(newLeagueName.trim());
    setShowSwitcher(false);
    setNewLeagueName('');
  };

  const ACTIVITY_ICONS = {
    round_finalized: '🏌️', skin_recorded: '💰', ctp_recorded: '🎯',
    member_joined: '👤', handicap_updated: '📊', round_unlocked: '🔓',
    settings_updated: '⚙️', team_created: '👥',
  };

  return (
    <>
      <aside
        className="hidden lg:flex flex-col w-60 min-h-screen flex-shrink-0 border-r"
        style={{ backgroundColor: 'var(--color-primary)', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        {/* Logo + League Switcher */}
        <div className="px-4 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-primary)' }}>FO</div>
            <div>
              <div className="text-white font-semibold text-sm leading-tight" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '15px' }}>FairwayOS</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Golf League Manager</div>
            </div>
          </div>
          {/* League switcher button */}
          <button
            onClick={() => { setShowSwitcher(!showSwitcher); setSwitcherTab('leagues'); setError(''); }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.9)' }}
          >
            <span className="text-xs font-medium truncate">{league?.name || 'Select League'}</span>
            <ChevronDown size={13} style={{ flexShrink: 0, opacity: 0.7 }} />
          </button>

          {/* Switcher dropdown */}
          {showSwitcher && (
            <div className="mt-2 rounded-lg overflow-hidden border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
                {[['leagues','Leagues'],['join','Join'],['create','Create']].map(([tab, label]) => (
                  <button key={tab} onClick={() => { setSwitcherTab(tab); setError(''); }}
                    className="flex-1 py-1.5 text-xs font-medium transition-all"
                    style={{ backgroundColor: switcherTab === tab ? 'var(--color-primary)' : 'transparent', color: switcherTab === tab ? 'white' : 'var(--color-muted)' }}>
                    {label}
                  </button>
                ))}
              </div>

              {switcherTab === 'leagues' && (
                <div className="p-1.5 space-y-0.5 max-h-36 overflow-y-auto">
                  {(user?.leagueIds || []).map(lid => (
                    <button key={lid} onClick={() => { switchLeague(lid); setShowSwitcher(false); }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs hover:bg-gray-50 transition-colors"
                      style={{ color: 'var(--color-text)' }}>
                      <span className="truncate">{getLeagueName(lid)}</span>
                      {lid === activeLeagueId && <Check size={11} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}
                    </button>
                  ))}
                </div>
              )}

              {switcherTab === 'join' && (
                <div className="p-2 space-y-2">
                  <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="6-char invite code"
                    className="w-full px-2 py-1.5 rounded border text-xs tracking-widest font-mono"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    maxLength={6} />
                  {error && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>}
                  <button onClick={handleJoin}
                    className="w-full py-1.5 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: 'var(--color-primary)' }}>
                    Join League
                  </button>
                </div>
              )}

              {switcherTab === 'create' && (
                <div className="p-2 space-y-2">
                  <input value={newLeagueName} onChange={e => setNewLeagueName(e.target.value)}
                    placeholder="League name"
                    className="w-full px-2 py-1.5 rounded border text-xs"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                  <button onClick={handleCreate}
                    className="w-full py-1.5 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: 'var(--color-primary)' }}>
                    <Plus size={11} className="inline mr-1" />Create League
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
            const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
            return (
              <NavLink key={path} to={path}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                style={{
                  color: isActive ? 'var(--color-accent)' : 'rgba(255,255,255,0.7)',
                  backgroundColor: isActive ? 'rgba(184,151,42,0.12)' : 'transparent',
                  borderRight: isActive ? '3px solid var(--color-accent)' : '3px solid transparent',
                }}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                {label}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer: install prompt + notifications + user */}
        <div className="px-3 pb-4 pt-2 border-t space-y-2" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          {installPrompt && (
            <button
              onClick={() => { installPrompt.prompt(); setInstallPrompt(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
              style={{ color: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(184,151,42,0.1)', border: '1px solid rgba(184,151,42,0.2)' }}
            >
              <Download size={14} style={{ color: 'var(--color-accent)' }} />
              <span>Add to Home Screen</span>
            </button>
          )}
          {/* Notification bell */}
          <button onClick={handleNotifClick}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all relative"
            style={{ color: 'rgba(255,255,255,0.7)', backgroundColor: showNotifs ? 'rgba(184,151,42,0.12)' : 'transparent' }}>
            <Bell size={16} />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-auto min-w-[18px] h-[18px] rounded-full text-xs font-bold flex items-center justify-center px-1"
                style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-primary)' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User + logout */}
          <div className="flex items-center gap-2 px-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: 'rgba(184,151,42,0.3)', color: 'var(--color-accent)' }}>
              {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'ME'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{user?.name}</div>
            </div>
            <button onClick={logout} title="Sign out"
              className="p-1 rounded hover:bg-red-900/30 transition-colors">
              <LogOut size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
          </div>
        </div>
      </aside>

      {/* Notification drawer */}
      {showNotifs && (
        <div className="hidden lg:block fixed left-60 top-0 h-full w-80 z-50 shadow-xl border-r overflow-y-auto"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h3 className="font-semibold text-sm" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>Activity Feed</h3>
            <button onClick={() => setShowNotifs(false)} className="text-xs" style={{ color: 'var(--color-muted)' }}>Close</button>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {activity.length === 0 && (
              <p className="p-4 text-sm text-center" style={{ color: 'var(--color-muted)' }}>No activity yet.</p>
            )}
            {activity.slice(0, 20).map(evt => (
              <div key={evt.id} className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <span className="text-base flex-shrink-0 mt-0.5">{ACTIVITY_ICONS[evt.type] || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs" style={{ color: 'var(--color-text)' }}>{evt.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                      {new Date(evt.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
