import { useState, useEffect } from 'react';
import { generateMockData } from '../data/mockData';

function leagueKeys(leagueId) {
  return {
    league: `fos_${leagueId}_league`,
    players: `fos_${leagueId}_players`,
    rounds: `fos_${leagueId}_rounds`,
    courses: `fos_${leagueId}_courses`,
    teams: `fos_${leagueId}_teams`,
    activity: `fos_${leagueId}_activity`,
    schedule: `fos_${leagueId}_schedule`,
    archives: `fos_${leagueId}_archives`,
    initialized: `fos_${leagueId}_initialized`,
    notifRead: `fos_${leagueId}_notif_read`,
  };
}

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export function useLeague(leagueId) {
  const [league, setLeagueState] = useState(null);
  const [players, setPlayersState] = useState([]);
  const [rounds, setRoundsState] = useState([]);
  const [courses, setCoursesState] = useState([]);
  const [teams, setTeamsState] = useState([]);
  const [activity, setActivityState] = useState([]);
  const [schedule, setScheduleState] = useState([]);
  const [archives, setArchivesState] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leagueId) { setLoading(false); return; }
    const KEYS = leagueKeys(leagueId);
    const initialized = load(KEYS.initialized);
    if (!initialized) {
      const mock = generateMockData(leagueId);
      save(KEYS.league, mock.league);
      save(KEYS.players, mock.players);
      save(KEYS.rounds, mock.rounds);
      save(KEYS.courses, mock.courses);
      save(KEYS.teams, mock.teams || []);
      save(KEYS.activity, mock.activity || []);
      save(KEYS.schedule, mock.schedule || []);
      save(KEYS.initialized, true);
      setLeagueState(mock.league);
      setPlayersState(mock.players);
      setRoundsState(mock.rounds);
      setCoursesState(mock.courses);
      setTeamsState(mock.teams || []);
      setActivityState(mock.activity || []);
      setScheduleState(mock.schedule || []);
      setArchivesState([]);
    } else {
      setLeagueState(load(KEYS.league));
      setPlayersState(load(KEYS.players) || []);
      setRoundsState(load(KEYS.rounds) || []);
      setCoursesState(load(KEYS.courses) || []);
      setTeamsState(load(KEYS.teams) || []);
      setActivityState(load(KEYS.activity) || []);
      setScheduleState(load(KEYS.schedule) || []);
      setArchivesState(load(KEYS.archives) || []);
    }
    setLoading(false);
  }, [leagueId]);

  const makeSet = (getState, setState, key) => (val) => {
    if (!leagueId) return;
    const next = typeof val === 'function' ? val(getState()) : val;
    setState(next);
    save(leagueKeys(leagueId)[key], next);
  };

  // Expose setters with current state closures
  function setLeague(val) {
    const next = typeof val === 'function' ? val(league) : val;
    setLeagueState(next);
    if (leagueId) save(leagueKeys(leagueId).league, next);
  }
  function setPlayers(val) {
    const next = typeof val === 'function' ? val(players) : val;
    setPlayersState(next);
    if (leagueId) save(leagueKeys(leagueId).players, next);
  }
  function setRounds(val) {
    const next = typeof val === 'function' ? val(rounds) : val;
    setRoundsState(next);
    if (leagueId) save(leagueKeys(leagueId).rounds, next);
  }
  function setCourses(val) {
    const next = typeof val === 'function' ? val(courses) : val;
    setCoursesState(next);
    if (leagueId) save(leagueKeys(leagueId).courses, next);
  }
  function setTeams(val) {
    const next = typeof val === 'function' ? val(teams) : val;
    setTeamsState(next);
    if (leagueId) save(leagueKeys(leagueId).teams, next);
  }
  function setActivity(val) {
    const next = typeof val === 'function' ? val(activity) : val;
    setActivityState(next);
    if (leagueId) save(leagueKeys(leagueId).activity, next);
  }
  function setSchedule(val) {
    const next = typeof val === 'function' ? val(schedule) : val;
    setScheduleState(next);
    if (leagueId) save(leagueKeys(leagueId).schedule, next);
  }
  function setArchives(val) {
    const next = typeof val === 'function' ? val(archives) : val;
    setArchivesState(next);
    if (leagueId) save(leagueKeys(leagueId).archives, next);
  }

  function getNotifReadAt() {
    if (!leagueId) return null;
    return load(leagueKeys(leagueId).notifRead);
  }
  function markNotifsRead() {
    if (!leagueId) return;
    save(leagueKeys(leagueId).notifRead, new Date().toISOString());
  }

  // Reload activity from storage (after logActivity calls)
  function refreshActivity() {
    if (!leagueId) return;
    setActivityState(load(leagueKeys(leagueId).activity) || []);
  }

  function resetData() {
    if (!leagueId) return;
    const KEYS = leagueKeys(leagueId);
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    window.location.reload();
  }

  return {
    league, setLeague,
    players, setPlayers,
    rounds, setRounds,
    courses, setCourses,
    teams, setTeams,
    activity, setActivity, refreshActivity,
    schedule, setSchedule,
    archives, setArchives,
    loading,
    getNotifReadAt, markNotifsRead,
    resetData,
  };
}
