import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useLeague } from './hooks/useLeague';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { Dashboard } from './components/screens/Dashboard';
import { RoundWizard } from './components/screens/RoundWizard';
import { Leaderboard } from './components/screens/Leaderboard';
import { SkinsTracker } from './components/screens/SkinsTracker';
import { CtpTracker } from './components/screens/CtpTracker';
import { HandicapTracker } from './components/screens/HandicapTracker';
import { Members } from './components/screens/Members';
import { Courses } from './components/screens/Courses';
import { LeagueSettings } from './components/screens/LeagueSettings';
import { Teams } from './components/screens/Teams';
import { PlayerProfile } from './components/screens/PlayerProfile';
import { Schedule } from './components/screens/Schedule';
import { Payouts } from './components/screens/Payouts';
import { RoundViewer } from './components/screens/RoundViewer';
import { Awards } from './components/screens/Awards';
import { TeeSheet } from './components/screens/TeeSheet';
import { PublicLeague } from './components/screens/PublicLeague';
import { Login } from './components/screens/Login';
import { RyderCup } from './components/screens/RyderCup';

function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return (
    <div className="offline-banner no-print flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium"
      style={{ backgroundColor: 'rgba(184,151,42,0.15)', color: 'var(--color-accent)', borderBottom: '1px solid rgba(184,151,42,0.3)' }}>
      <span className="w-2 h-2 rounded-full bg-current flex-shrink-0" />
      You&rsquo;re offline. Scores will save locally.
    </div>
  );
}

function AppShell() {
  const { user, activeLeagueId, loading: authLoading } = useAuth();
  const leagueData = useLeague(user ? activeLeagueId : null);
  const { league, setLeague, players, setPlayers, rounds, setRounds, courses, setCourses,
          teams, setTeams, activity, setActivity, refreshActivity, schedule, setSchedule,
          archives, setArchives, announcements, setAnnouncements, ryderCups, setRyderCups,
          getNotifReadAt, markNotifsRead, loading: leagueLoading } = leagueData;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center">
          <div className="text-4xl font-bold mb-2" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-primary)' }}>FairwayOS</div>
          <div className="text-sm" style={{ color: 'var(--color-muted)' }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  if (leagueLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center">
          <div className="text-4xl font-bold mb-2" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-primary)' }}>FairwayOS</div>
          <div className="text-sm" style={{ color: 'var(--color-muted)' }}>Loading your league...</div>
        </div>
      </div>
    );
  }

  const sharedProps = {
    league, setLeague, players, setPlayers, rounds, setRounds, courses, setCourses,
    teams, setTeams, activity, setActivity, refreshActivity, schedule, setSchedule,
    archives, setArchives, announcements, setAnnouncements, ryderCups, setRyderCups,
    getNotifReadAt, markNotifsRead,
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Sidebar league={league} activity={activity} getNotifReadAt={getNotifReadAt} markNotifsRead={markNotifsRead} />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <OfflineBanner />
        <Routes>
          <Route path="/" element={<Dashboard {...sharedProps} />} />
          <Route path="/scorecard" element={<RoundWizard {...sharedProps} />} />
          <Route path="/leaderboard" element={<Leaderboard {...sharedProps} />} />
          <Route path="/skins" element={<SkinsTracker {...sharedProps} />} />
          <Route path="/ctp" element={<CtpTracker {...sharedProps} />} />
          <Route path="/handicap" element={<HandicapTracker {...sharedProps} />} />
          <Route path="/members" element={<Members {...sharedProps} />} />
          <Route path="/courses" element={<Courses {...sharedProps} />} />
          <Route path="/settings" element={<LeagueSettings {...sharedProps} />} />
          <Route path="/teams" element={<Teams {...sharedProps} />} />
          <Route path="/profile/:playerId" element={<PlayerProfile {...sharedProps} />} />
          <Route path="/schedule" element={<Schedule {...sharedProps} />} />
          <Route path="/round/:roundId" element={<RoundViewer {...sharedProps} />} />
          <Route path="/payouts" element={<Payouts {...sharedProps} />} />
          <Route path="/awards" element={<Awards {...sharedProps} />} />
          <Route path="/teesheet/:eventId" element={<TeeSheet {...sharedProps} />} />
          <Route path="/ryder-cup" element={<RyderCup {...sharedProps} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <MobileNav />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/public/:leagueId" element={<PublicLeague />} />
          <Route path="/*" element={<AppShell />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
