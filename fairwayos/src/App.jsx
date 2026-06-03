import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useLeague } from './hooks/useLeague';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { Dashboard } from './components/screens/Dashboard';
import { ScorecardEntry } from './components/screens/ScorecardEntry';
import { Leaderboard } from './components/screens/Leaderboard';
import { SkinsTracker } from './components/screens/SkinsTracker';
import { CtpTracker } from './components/screens/CtpTracker';
import { HandicapTracker } from './components/screens/HandicapTracker';
import { Members } from './components/screens/Members';
import { Courses } from './components/screens/Courses';
import { LeagueSettings } from './components/screens/LeagueSettings';

function AppShell() {
  const { league, setLeague, players, setPlayers, rounds, setRounds, courses, setCourses, loading } = useLeague();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center">
          <div className="text-4xl font-bold mb-2" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-primary)' }}>
            FairwayOS
          </div>
          <div className="text-sm" style={{ color: 'var(--color-muted)' }}>Loading your league...</div>
        </div>
      </div>
    );
  }

  const sharedProps = { league, setLeague, players, setPlayers, rounds, setRounds, courses, setCourses };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Sidebar league={league} />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Routes>
          <Route path="/" element={<Dashboard {...sharedProps} />} />
          <Route path="/scorecard" element={<ScorecardEntry {...sharedProps} />} />
          <Route path="/leaderboard" element={<Leaderboard {...sharedProps} />} />
          <Route path="/skins" element={<SkinsTracker {...sharedProps} />} />
          <Route path="/ctp" element={<CtpTracker {...sharedProps} />} />
          <Route path="/handicap" element={<HandicapTracker {...sharedProps} />} />
          <Route path="/members" element={<Members {...sharedProps} />} />
          <Route path="/courses" element={<Courses {...sharedProps} />} />
          <Route path="/settings" element={<LeagueSettings {...sharedProps} />} />
        </Routes>
        <MobileNav />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
