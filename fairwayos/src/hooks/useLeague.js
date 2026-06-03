import { useState, useEffect } from 'react';
import { generateMockData } from '../data/mockData';

const KEYS = {
  league: 'fairwayos_league',
  players: 'fairwayos_players',
  rounds: 'fairwayos_rounds',
  courses: 'fairwayos_courses',
  initialized: 'fairwayos_initialized',
};

function load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.error('localStorage write failed', e); }
}

export function useLeague() {
  const [league, setLeagueState] = useState(null);
  const [players, setPlayersState] = useState([]);
  const [rounds, setRoundsState] = useState([]);
  const [courses, setCoursesState] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialized = load(KEYS.initialized);
    if (!initialized) {
      const mock = generateMockData();
      save(KEYS.league, mock.league);
      save(KEYS.players, mock.players);
      save(KEYS.rounds, mock.rounds);
      save(KEYS.courses, mock.courses);
      save(KEYS.initialized, true);
      setLeagueState(mock.league);
      setPlayersState(mock.players);
      setRoundsState(mock.rounds);
      setCoursesState(mock.courses);
    } else {
      setLeagueState(load(KEYS.league));
      setPlayersState(load(KEYS.players) || []);
      setRoundsState(load(KEYS.rounds) || []);
      setCoursesState(load(KEYS.courses) || []);
    }
    setLoading(false);
  }, []);

  function setLeague(val) {
    const next = typeof val === 'function' ? val(league) : val;
    setLeagueState(next);
    save(KEYS.league, next);
  }

  function setPlayers(val) {
    const next = typeof val === 'function' ? val(players) : val;
    setPlayersState(next);
    save(KEYS.players, next);
  }

  function setRounds(val) {
    const next = typeof val === 'function' ? val(rounds) : val;
    setRoundsState(next);
    save(KEYS.rounds, next);
  }

  function setCourses(val) {
    const next = typeof val === 'function' ? val(courses) : val;
    setCoursesState(next);
    save(KEYS.courses, next);
  }

  function resetData() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    window.location.reload();
  }

  return { league, setLeague, players, setPlayers, rounds, setRounds, courses, setCourses, loading, resetData };
}
