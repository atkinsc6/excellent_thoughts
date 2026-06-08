import { useState, useEffect, createContext, useContext } from 'react';
import { generateMockData } from '../data/mockData';
import { logActivity, ACTIVITY_TYPES } from '../utils/activity';

const GLOBAL = {
  users: 'fos_users',
  session: 'fos_session',
};

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function leagueKey(lid, suffix) { return `fos_${lid}_${suffix}`; }

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [activeLeagueId, setActiveLeagueIdState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = load(GLOBAL.session);
    if (session?.userId) {
      const users = load(GLOBAL.users) || [];
      const u = users.find(u => u.id === session.userId);
      if (u) {
        setUserState(u);
        setActiveLeagueIdState(session.leagueId || u.leagueIds?.[0] || null);
      }
    }
    setLoading(false);
  }, []);

  function _persistUser(u) {
    const users = load(GLOBAL.users) || [];
    const existing = users.findIndex(x => x.id === u.id);
    const updated = existing >= 0 ? users.map(x => x.id === u.id ? u : x) : [...users, u];
    save(GLOBAL.users, updated);
    setUserState(u);
  }

  function _seedLeague(leagueId, leagueName) {
    if (load(leagueKey(leagueId, 'initialized'))) return;
    const mock = generateMockData(leagueId, leagueName);
    save(leagueKey(leagueId, 'league'), mock.league);
    save(leagueKey(leagueId, 'players'), mock.players);
    save(leagueKey(leagueId, 'rounds'), mock.rounds);
    save(leagueKey(leagueId, 'courses'), mock.courses);
    save(leagueKey(leagueId, 'teams'), mock.teams || []);
    save(leagueKey(leagueId, 'activity'), mock.activity || []);
    save(leagueKey(leagueId, 'schedule'), mock.schedule || []);
    save(leagueKey(leagueId, 'initialized'), true);
    logActivity(leagueId, ACTIVITY_TYPES.LEAGUE_CREATED, `League "${leagueName}" created`);
  }

  function _blankLeague(leagueId, leagueName) {
    if (load(leagueKey(leagueId, 'initialized'))) return;
    const newLeague = {
      id: leagueId,
      name: leagueName || 'My Golf League',
      season: new Date().getFullYear().toString(),
      startDate: new Date().toISOString().slice(0, 10),
      endDate: `${new Date().getFullYear()}-12-31`,
      scoringFormats: ['stroke'],
      handicapSystem: 'whs',
      handicapAllowance: 0.95,
      skinsType: 'net',
      skinsEnabled: true,
      skinsEntry: 5,
      ctpEnabled: true,
      ctpHoles: [3, 7, 12, 16],
      pointsTable: [
        { place: 1, points: 10 }, { place: 2, points: 8 },
        { place: 3, points: 6 }, { place: 4, points: 4 }, { place: 5, points: 2 }
      ],
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      isPublic: false,
      onboardingComplete: false,
    };
    save(leagueKey(leagueId, 'league'), newLeague);
    save(leagueKey(leagueId, 'players'), []);
    save(leagueKey(leagueId, 'rounds'), []);
    save(leagueKey(leagueId, 'courses'), []);
    save(leagueKey(leagueId, 'teams'), []);
    save(leagueKey(leagueId, 'activity'), []);
    save(leagueKey(leagueId, 'schedule'), []);
    save(leagueKey(leagueId, 'initialized'), true);
  }

  function register({ name, email, password, leagueName }) {
    const users = load(GLOBAL.users) || [];
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }
    const leagueId = `league_${Date.now()}`;
    const userId = `user_${Date.now()}`;
    const newUser = {
      id: userId, name, email,
      passwordHash: btoa(unescape(encodeURIComponent(password))),
      leagueIds: [leagueId],
      createdAt: new Date().toISOString(),
    };
    _blankLeague(leagueId, leagueName || 'My Golf League');
    _persistUser(newUser);
    const session = { userId, leagueId };
    save(GLOBAL.session, session);
    setActiveLeagueIdState(leagueId);
  }

  function registerDemo({ name, email, password, leagueName }) {
    const users = load(GLOBAL.users) || [];
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      // Demo user already exists — just log them in
      login({ email, password });
      return;
    }
    const leagueId = `league_${Date.now()}`;
    const userId = `user_${Date.now()}`;
    const newUser = {
      id: userId, name, email,
      passwordHash: btoa(unescape(encodeURIComponent(password))),
      leagueIds: [leagueId],
      createdAt: new Date().toISOString(),
    };
    _seedLeague(leagueId, leagueName || 'Westside Golf League');
    _persistUser(newUser);
    const session = { userId, leagueId };
    save(GLOBAL.session, session);
    setActiveLeagueIdState(leagueId);
  }

  function login({ email, password }) {
    const users = load(GLOBAL.users) || [];
    const u = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!u) throw new Error('No account found with this email.');
    const hash = btoa(unescape(encodeURIComponent(password)));
    if (u.passwordHash !== hash) throw new Error('Incorrect password.');
    const leagueId = u.leagueIds?.[0] || null;
    save(GLOBAL.session, { userId: u.id, leagueId });
    setUserState(u);
    setActiveLeagueIdState(leagueId);
  }

  function logout() {
    localStorage.removeItem(GLOBAL.session);
    setUserState(null);
    setActiveLeagueIdState(null);
  }

  function joinLeague(code) {
    const allKeys = Object.keys(localStorage);
    let foundLeagueId = null;
    for (const key of allKeys) {
      if (key.match(/^fos_[^_]+_league$/)) {
        try {
          const league = JSON.parse(localStorage.getItem(key));
          if (league?.inviteCode === code.toUpperCase()) {
            foundLeagueId = key.replace(/^fos_/, '').replace(/_league$/, '');
            break;
          }
        } catch {}
      }
    }
    if (!foundLeagueId) throw new Error('League not found. Check the invite code and try again.');
    if (user.leagueIds?.includes(foundLeagueId)) throw new Error('You are already in this league.');
    const updated = { ...user, leagueIds: [...(user.leagueIds || []), foundLeagueId] };
    _persistUser(updated);
    switchLeague(foundLeagueId);
    return foundLeagueId;
  }

  function switchLeague(leagueId) {
    if (!user) return;
    save(GLOBAL.session, { userId: user.id, leagueId });
    setActiveLeagueIdState(leagueId);
  }

  function createLeague(leagueName) {
    if (!user) return;
    const leagueId = `league_${Date.now()}`;
    _blankLeague(leagueId, leagueName);
    const updated = { ...user, leagueIds: [...(user.leagueIds || []), leagueId] };
    _persistUser(updated);
    save(GLOBAL.session, { userId: user.id, leagueId });
    setActiveLeagueIdState(leagueId);
    return leagueId;
  }

  // Get league name for a leagueId (for switcher display)
  function getLeagueName(leagueId) {
    try {
      const l = JSON.parse(localStorage.getItem(`fos_${leagueId}_league`));
      return l?.name || 'Unknown League';
    } catch { return 'Unknown League'; }
  }

  return (
    <AuthContext.Provider value={{
      user, activeLeagueId, loading,
      register, registerDemo, login, logout, joinLeague, switchLeague, createLeague, getLeagueName,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
