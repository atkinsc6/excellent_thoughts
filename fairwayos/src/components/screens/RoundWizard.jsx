import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight, ChevronLeft, Check, Star, Trophy, DollarSign, Plus, X } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../hooks/useAuth';
import {
  calcCourseHandicap,
  calcPlayingHandicap,
  strokesReceivedPerHole,
  calcNetScore,
  calcStableford,
  calcBetterBallTeamScore,
  calcScrambleHandicap,
  calcMatchPlay,
} from '../../utils/scoring';
import { calcSkins, skinsSummary } from '../../utils/skins';
import { logActivity, ACTIVITY_TYPES } from '../../utils/activity';
import { MatchPlayScorecard } from './MatchPlayScorecard';

const FORMATS = [
  { value: 'individual', label: 'Individual Stroke Play' },
  { value: 'match', label: 'Match Play' },
  { value: 'better_ball', label: 'Team Better Ball' },
  { value: 'scramble', label: 'Scramble' },
  { value: 'chapman', label: 'Chapman' },
];

const TEAM_FORMATS = ['better_ball', 'scramble', 'chapman'];
const STEPS = ['Setup', 'Scorecard', 'Review'];

export function RoundWizard({ league, players, rounds, setRounds, courses, teams, refreshActivity }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const today = format(new Date(), 'yyyy-MM-dd');
  const [step, setStep] = useState(0);

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
  const [selectedFormat, setSelectedFormat] = useState('individual');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(players.map(p => p.id));
  const [playerTees, setPlayerTees] = useState({});

  const [grossScores, setGrossScores] = useState({});
  const [ctpWinners, setCtpWinners] = useState({});
  const [overrideCtpHoles, setOverrideCtpHoles] = useState(false);
  const [customCtpHoles, setCustomCtpHoles] = useState([]);

  // Match play state
  const [matchPairings, setMatchPairings] = useState([]);

  // Better ball / scramble team state
  const [teamPairings, setTeamPairings] = useState([]); // [{ id, label, playerIds }]
  const [scrambleTeamScores, setScrambleTeamScores] = useState({}); // { [teamId]: number[18] }

  const course = useMemo(() => courses.find(c => c.id === selectedCourseId), [courses, selectedCourseId]);
  const selectedPlayers = useMemo(() => players.filter(p => selectedPlayerIds.includes(p.id)), [players, selectedPlayerIds]);
  const activeCtpHoles = overrideCtpHoles ? customCtpHoles : (league?.ctpHoles || []);

  const par3Holes = useMemo(() =>
    (course?.holes || []).filter(h => h.par === 3).map(h => h.number)
  , [course]);

  function getTeeForPlayer(playerId) {
    return playerTees[playerId] || course?.tees?.[0]?.name || 'White';
  }
  function getTeeData(teeName) {
    return course?.tees?.find(t => t.name === teeName) || course?.tees?.[0];
  }
  function getPlayingHandicap(player) {
    const tee = getTeeData(getTeeForPlayer(player.id));
    if (!tee || !course) return 0;
    const courseHcp = calcCourseHandicap(player.handicapIndex || 0, tee.slope, tee.rating, course.par);
    return calcPlayingHandicap(courseHcp, league?.handicapAllowance || 1.0);
  }
  function getNetScores(playerId) {
    const player = players.find(p => p.id === playerId);
    if (!player || !course?.holes) return Array(18).fill(0);
    const ph = getPlayingHandicap(player);
    const strokes = strokesReceivedPerHole(course.holes, ph);
    return Array.from({ length: 18 }, (_, i) => {
      const gross = grossScores[playerId]?.[i];
      if (!gross) return 0;
      return calcNetScore(gross, strokes[i]);
    });
  }
  function getStablefordPoints(playerId) {
    const player = players.find(p => p.id === playerId);
    if (!player || !course?.holes) return Array(18).fill(0);
    const ph = getPlayingHandicap(player);
    const strokes = strokesReceivedPerHole(course.holes, ph);
    return Array.from({ length: 18 }, (_, i) => {
      const gross = grossScores[playerId]?.[i];
      if (!gross) return 0;
      return calcStableford(gross, course.holes[i]?.par || 4, strokes[i]);
    });
  }

  const skinsPreview = useMemo(() => {
    if (!course?.holes || selectedPlayers.length < 2 || TEAM_FORMATS.includes(selectedFormat) || selectedFormat === 'match') return [];
    const playerScoreData = selectedPlayers.map(p => ({
      playerId: p.id,
      grossScores: Array.from({ length: 18 }, (_, i) => grossScores[p.id]?.[i] || 0),
      netScores: getNetScores(p.id),
    }));
    return calcSkins(course.holes, playerScoreData, league?.skinsType === 'gross' ? 'gross' : 'net');
  }, [grossScores, selectedPlayers, course, league, selectedFormat]);

  function setGross(playerId, holeIdx, val) {
    const num = parseInt(val) || 0;
    setGrossScores(prev => ({
      ...prev,
      [playerId]: Object.assign(Array(18).fill(0), prev[playerId] || [], { [holeIdx]: num }),
    }));
  }

  function setScrambleScore(teamId, holeIdx, val) {
    const num = parseInt(val) || 0;
    setScrambleTeamScores(prev => ({
      ...prev,
      [teamId]: Object.assign(Array(18).fill(0), prev[teamId] || [], { [holeIdx]: num }),
    }));
  }

  function togglePlayer(playerId) {
    setSelectedPlayerIds(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  }

  // Initialize default team pairings for team formats
  function initTeamPairings() {
    if (teamPairings.length > 0) return;
    const half = Math.ceil(selectedPlayers.length / 2);
    setTeamPairings([
      { id: 't1', label: 'Team 1', playerIds: selectedPlayers.slice(0, half).map(p => p.id) },
      { id: 't2', label: 'Team 2', playerIds: selectedPlayers.slice(half).map(p => p.id) },
    ]);
  }

  // Initialize default match pairings
  function initMatchPairings() {
    if (matchPairings.length > 0) return;
    const pairs = [];
    for (let i = 0; i < selectedPlayers.length - 1; i += 2) {
      pairs.push({ player1Id: selectedPlayers[i].id, player2Id: selectedPlayers[i + 1]?.id || '' });
    }
    setMatchPairings(pairs);
  }

  function buildRound() {
    const scores = selectedPlayers.map(p => {
      const ph = getPlayingHandicap(p);
      const grossArr = Array.from({ length: 18 }, (_, i) => grossScores[p.id]?.[i] || 0);
      const netArr = getNetScores(p.id);
      const sfArr = getStablefordPoints(p.id);
      return {
        playerId: p.id,
        grossScores: grossArr,
        playingHandicap: ph,
        netScores: netArr,
        stablefordPoints: sfArr,
        totalGross: grossArr.reduce((s, v) => s + v, 0),
        totalNet: netArr.reduce((s, v) => s + v, 0),
        totalStableford: sfArr.reduce((s, v) => s + v, 0),
      };
    });

    const ctpResults = Object.entries(ctpWinners)
      .filter(([, wid]) => wid)
      .map(([hole, winnerId]) => ({ hole: parseInt(hole), winnerId, distance: '' }));

    const primaryTee = getTeeForPlayer(selectedPlayers[0]?.id || '');
    const round = {
      id: `round-${Date.now()}`,
      date: selectedDate,
      courseId: selectedCourseId,
      tee: primaryTee,
      playerIds: selectedPlayerIds,
      format: selectedFormat,
      scores,
      ctpResults,
      ctpHoles: overrideCtpHoles ? customCtpHoles : undefined,
      finalized: true,
      finalizedAt: new Date().toISOString(),
    };

    if (selectedFormat === 'match') {
      const matchResult = {
        pairs: matchPairings.filter(p => p.player1Id && p.player2Id).map(pair => {
          const p1Score = scores.find(s => s.playerId === pair.player1Id);
          const p2Score = scores.find(s => s.playerId === pair.player2Id);
          const { holeResults, runningStatus, conclusion } = calcMatchPlay(p1Score?.netScores || [], p2Score?.netScores || []);
          return {
            player1Id: pair.player1Id,
            player2Id: pair.player2Id,
            holeResults,
            conclusion: conclusion || (runningStatus.concluded ? runningStatus.conclusion : null),
            winnerId: runningStatus.leader === 'player1' ? pair.player1Id : runningStatus.leader === 'player2' ? pair.player2Id : null,
          };
        }),
      };
      round.matchResult = matchResult;
    }

    if (TEAM_FORMATS.includes(selectedFormat)) {
      round.teamPairings = teamPairings;
      if (selectedFormat === 'scramble' || selectedFormat === 'chapman') {
        round.scrambleTeamScores = scrambleTeamScores;
      }
    }

    if (selectedFormat === 'individual') {
      round.skinsResults = skinsPreview.map(s => ({ hole: s.hole, winnerId: s.winnerId, carryover: s.carryover, gross: league?.skinsType === 'gross' }));
    }

    return round;
  }

  function handleFinalize() {
    const round = buildRound();
    setRounds(prev => [...prev, round]);
    logActivity(
      league?.id,
      ACTIVITY_TYPES.ROUND_FINALIZED,
      `Round at ${course?.name || 'Unknown Course'} finalized — ${selectedPlayers.length} players`
    );
    refreshActivity?.();
    navigate('/leaderboard');
  }

  // Better ball: per-hole best net per team
  const betterBallTeamScores = useMemo(() => {
    if (selectedFormat !== 'better_ball' || !course?.holes) return {};
    const allScores = selectedPlayers.map(p => ({
      playerId: p.id,
      grossScores: Array.from({ length: 18 }, (_, i) => grossScores[p.id]?.[i] || 0),
      netScores: getNetScores(p.id),
    }));
    const result = {};
    teamPairings.forEach(team => {
      result[team.id] = calcBetterBallTeamScore(team.playerIds, allScores, course.holes);
    });
    return result;
  }, [grossScores, teamPairings, selectedPlayers, course, selectedFormat]);

  const summaryRows = useMemo(() => {
    if (!course) return [];
    if (selectedFormat === 'match') {
      return matchPairings.filter(pair => pair.player1Id && pair.player2Id).map(pair => {
        const p1 = players.find(p => p.id === pair.player1Id);
        const p2 = players.find(p => p.id === pair.player2Id);
        const p1Net = getNetScores(pair.player1Id);
        const p2Net = getNetScores(pair.player2Id);
        const { runningStatus, conclusion } = calcMatchPlay(p1Net, p2Net);
        return { type: 'match', pair, p1, p2, runningStatus, conclusion };
      });
    }
    const skins = selectedFormat === 'individual' ? skinsSummary(skinsPreview) : {};
    return selectedPlayers.map(p => {
      const grossArr = Array.from({ length: 18 }, (_, i) => grossScores[p.id]?.[i] || 0);
      const netArr = getNetScores(p.id);
      const sfArr = getStablefordPoints(p.id);
      const skinsWon = skins[p.id] || 0;
      const ctpWins = Object.values(ctpWinners).filter(wid => wid === p.id).length;
      return {
        id: p.id, name: p.name,
        gross: grossArr.reduce((s, v) => s + v, 0),
        net: netArr.reduce((s, v) => s + v, 0),
        stableford: sfArr.reduce((s, v) => s + v, 0),
        skinsWon, skinsAmount: skinsWon * (league?.skinsEntry || 5) * selectedPlayers.length, ctpWins,
      };
    }).sort((a, b) => a.net - b.net);
  }, [grossScores, selectedPlayers, course, skinsPreview, ctpWinners, league, selectedFormat, matchPairings]);

  const isTeamFormat = TEAM_FORMATS.includes(selectedFormat);
  const isMatchFormat = selectedFormat === 'match';
  const isScramble = selectedFormat === 'scramble' || selectedFormat === 'chapman';

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>
            Enter Round
          </h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: i < step ? 'var(--color-accent)' : i === step ? 'var(--color-primary)' : 'var(--color-border)', color: i <= step ? 'white' : 'var(--color-muted)' }}>
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span className="text-sm font-medium" style={{ color: i === step ? 'var(--color-text)' : 'var(--color-muted)' }}>{s}</span>
              {i < STEPS.length - 1 && <ChevronRight size={14} style={{ color: 'var(--color-border)' }} className="mx-1" />}
            </div>
          ))}
        </div>

        {/* Step 1: Setup */}
        {step === 0 && (
          <Card>
            <CardHeader><CardTitle>Event Setup</CardTitle></CardHeader>
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>Date</label>
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>Course</label>
                  <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>Format</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FORMATS.map(f => (
                    <button key={f.value} onClick={() => setSelectedFormat(f.value)}
                      className="px-3 py-2 rounded-lg border text-xs font-medium transition-all"
                      style={{ borderColor: selectedFormat === f.value ? 'var(--color-accent)' : 'var(--color-border)', backgroundColor: selectedFormat === f.value ? 'rgba(184,151,42,0.1)' : 'transparent', color: selectedFormat === f.value ? 'var(--color-accent)' : 'var(--color-text)' }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-muted)' }}>Players & Tees</label>
                <div className="space-y-2">
                  {players.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                      <input type="checkbox" checked={selectedPlayerIds.includes(p.id)} onChange={() => togglePlayer(p.id)} className="rounded" />
                      <span className="flex-1 text-sm font-medium" style={{ color: 'var(--color-text)' }}>{p.name}</span>
                      {selectedPlayerIds.includes(p.id) && course?.tees && (
                        <select value={getTeeForPlayer(p.id)} onChange={e => setPlayerTees(prev => ({ ...prev, [p.id]: e.target.value }))}
                          className="px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                          {course.tees.map(t => <option key={t.name} value={t.name}>{t.name} ({t.rating}/{t.slope})</option>)}
                        </select>
                      )}
                      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>HCP {p.handicapIndex || 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Match play: pairing widget */}
              {isMatchFormat && selectedPlayers.length >= 2 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Match Pairings</label>
                    <button onClick={() => { initMatchPairings(); }} className="text-xs px-2 py-1 rounded border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>Auto-pair</button>
                  </div>
                  <div className="space-y-2">
                    {matchPairings.map((pair, pi) => (
                      <div key={pi} className="flex items-center gap-2 p-2.5 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                        <select value={pair.player1Id} onChange={e => setMatchPairings(prev => prev.map((p, i) => i === pi ? { ...p, player1Id: e.target.value } : p))}
                          className="flex-1 px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                          <option value="">Select player…</option>
                          {selectedPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>vs</span>
                        <select value={pair.player2Id} onChange={e => setMatchPairings(prev => prev.map((p, i) => i === pi ? { ...p, player2Id: e.target.value } : p))}
                          className="flex-1 px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                          <option value="">Select player…</option>
                          {selectedPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <button onClick={() => setMatchPairings(prev => prev.filter((_, i) => i !== pi))}><X size={14} style={{ color: 'var(--color-muted)' }} /></button>
                      </div>
                    ))}
                    <button onClick={() => setMatchPairings(prev => [...prev, { player1Id: '', player2Id: '' }])}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}>
                      <Plus size={12} /> Add Match
                    </button>
                  </div>
                </div>
              )}

              {/* Team formats: team pairing widget */}
              {isTeamFormat && selectedPlayers.length >= 2 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Team Assignments</label>
                    <button onClick={initTeamPairings} className="text-xs px-2 py-1 rounded border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>Auto-split</button>
                  </div>
                  <div className="space-y-3">
                    {teamPairings.map((team, ti) => (
                      <div key={team.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <input value={team.label} onChange={e => setTeamPairings(prev => prev.map((t, i) => i === ti ? { ...t, label: e.target.value } : t))}
                            className="px-2 py-1 rounded border text-xs font-medium flex-1" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                          {teamPairings.length > 2 && (
                            <button onClick={() => setTeamPairings(prev => prev.filter((_, i) => i !== ti))}><X size={13} style={{ color: 'var(--color-muted)' }} /></button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {team.playerIds.map(pid => {
                            const p = selectedPlayers.find(pl => pl.id === pid);
                            return (
                              <span key={pid} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                                style={{ backgroundColor: 'rgba(27,67,50,0.1)', color: 'var(--color-primary)' }}>
                                {p?.name?.split(' ')[0] || pid}
                                <button onClick={() => setTeamPairings(prev => prev.map((t, i) => i === ti ? { ...t, playerIds: t.playerIds.filter(id => id !== pid) } : t))}>
                                  <X size={10} />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                        <select value="" onChange={e => { if (!e.target.value) return; setTeamPairings(prev => prev.map((t, i) => i === ti && !t.playerIds.includes(e.target.value) ? { ...t, playerIds: [...t.playerIds, e.target.value] } : t)); }}
                          className="w-full px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                          <option value="">+ Add player…</option>
                          {selectedPlayers.filter(p => !teamPairings.some(t => t.playerIds.includes(p.id))).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                    <button onClick={() => setTeamPairings(prev => [...prev, { id: `t${Date.now()}`, label: `Team ${prev.length + 1}`, playerIds: [] }])}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}>
                      <Plus size={12} /> Add Team
                    </button>
                  </div>
                </div>
              )}

              {/* CTP hole override */}
              {par3Holes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>CTP Holes This Round</label>
                    <button onClick={() => { setOverrideCtpHoles(v => !v); if (!overrideCtpHoles) setCustomCtpHoles([...par3Holes]); }}
                      className="text-xs px-2 py-1 rounded border"
                      style={{ borderColor: overrideCtpHoles ? 'var(--color-accent)' : 'var(--color-border)', backgroundColor: overrideCtpHoles ? 'rgba(184,151,42,0.1)' : 'transparent', color: overrideCtpHoles ? 'var(--color-accent)' : 'var(--color-muted)' }}>
                      {overrideCtpHoles ? 'Override on' : 'Use league default'}
                    </button>
                  </div>
                  {overrideCtpHoles ? (
                    <div className="flex flex-wrap gap-2">
                      {par3Holes.map(h => {
                        const selected = customCtpHoles.includes(h);
                        return (
                          <button key={h} onClick={() => setCustomCtpHoles(prev => selected ? prev.filter(n => n !== h) : [...prev, h])}
                            className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                            style={{ borderColor: selected ? 'var(--color-accent)' : 'var(--color-border)', backgroundColor: selected ? 'rgba(184,151,42,0.12)' : 'transparent', color: selected ? 'var(--color-accent)' : 'var(--color-muted)' }}>
                            Hole {h} (par 3)
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      {(league?.ctpHoles?.length ?? 0) > 0 ? `League defaults: holes ${league.ctpHoles.join(', ')}` : 'No CTP holes configured in league settings.'}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <button onClick={() => setStep(1)} disabled={!selectedCourseId || selectedPlayerIds.length === 0}
                  className="px-5 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--color-primary)' }}>
                  Next: Scorecard <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: Scorecard */}
        {step === 1 && course && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold" style={{ color: 'var(--color-text)', fontFamily: 'Cormorant Garamond, serif', fontSize: '18px' }}>{course.name}</div>
                <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{selectedDate} · {selectedPlayers.length} players · {FORMATS.find(f => f.value === selectedFormat)?.label}</div>
              </div>
            </div>

            {/* Match Play scorecard */}
            {isMatchFormat && (
              <MatchPlayScorecard
                pairs={matchPairings.filter(p => p.player1Id && p.player2Id)}
                selectedPlayers={selectedPlayers}
                course={course}
                grossScores={grossScores}
                setGross={setGross}
                getNetScores={getNetScores}
              />
            )}

            {/* Scramble / Chapman: one score per team per hole */}
            {isScramble && teamPairings.length > 0 && (
              <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                <table className="text-xs" style={{ minWidth: `${180 + teamPairings.length * 80}px` }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                      <td className="px-3 py-2 font-medium" style={{ minWidth: '60px' }}>Hole</td>
                      <td className="px-2 py-2 text-center" style={{ minWidth: '36px' }}>Par</td>
                      {teamPairings.map(t => (
                        <td key={t.id} className="px-2 py-2 text-center font-medium" style={{ minWidth: '80px' }}>{t.label}</td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 18 }, (_, i) => {
                      const hole = course.holes?.[i];
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: i % 2 === 0 ? 'var(--color-surface)' : 'rgba(249,246,240,0.5)' }}>
                          <td className="px-3 py-1.5 font-medium" style={{ color: 'var(--color-text)' }}>{i + 1}</td>
                          <td className="px-2 py-1.5 text-center font-medium" style={{ color: 'var(--color-primary)' }}>{hole?.par || 4}</td>
                          {teamPairings.map(t => {
                            const score = scrambleTeamScores[t.id]?.[i] || '';
                            const teamHcp = calcScrambleHandicap(t.playerIds, players);
                            return (
                              <td key={t.id} className="px-1 py-1 text-center">
                                <input
                                  type="number" min="1" max="20" value={score}
                                  onChange={e => setScrambleScore(t.id, i, e.target.value)}
                                  placeholder="—"
                                  className="w-12 h-10 text-center rounded-xl border text-base font-bold font-mono"
                                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    <tr style={{ backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 600 }}>
                      <td className="px-3 py-2">Total</td>
                      <td className="px-2 py-2 text-center">{course.par}</td>
                      {teamPairings.map(t => {
                        const total = (scrambleTeamScores[t.id] || []).reduce((s, v) => s + (v || 0), 0);
                        const teamHcp = calcScrambleHandicap(t.playerIds, players);
                        const net = total ? total - teamHcp : 0;
                        return (
                          <td key={t.id} className="px-2 py-2 text-center">
                            <div>{total || '—'}</div>
                            {total > 0 && <div className="text-xs opacity-70">net {net} (hcp {teamHcp})</div>}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Individual / Better Ball: standard scorecard */}
            {!isMatchFormat && !isScramble && (
              <>
                {/* Mobile: card-per-hole */}
                <div className="block md:hidden space-y-2">
                  {Array.from({ length: 18 }, (_, i) => {
                    const hole = course.holes?.[i];
                    const holeNum = i + 1;
                    const isCtp = activeCtpHoles.includes(holeNum);
                    const skinsHole = skinsPreview[i];
                    return (
                      <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                        <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold">Hole {holeNum}</span>
                            {isCtp && (
                              <button onClick={() => { const current = ctpWinners[holeNum]; const idx = selectedPlayers.findIndex(p => p.id === current); const next = selectedPlayers[(idx + 1) % selectedPlayers.length]; setCtpWinners(prev => ({ ...prev, [holeNum]: next?.id || null })); }}>
                                <Star size={14} style={{ color: ctpWinners[holeNum] ? 'var(--color-accent)' : 'rgba(255,255,255,0.5)' }} fill={ctpWinners[holeNum] ? 'var(--color-accent)' : 'none'} />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs font-medium opacity-80">
                            <span>Par {hole?.par || 4}</span><span>SI {hole?.strokeIndex || holeNum}</span>
                            {skinsHole?.carryover && !skinsHole.winnerId && (
                              <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-primary)' }}>Carry</span>
                            )}
                          </div>
                        </div>
                        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                          {selectedPlayers.map(p => {
                            const gross = grossScores[p.id]?.[i] || '';
                            const netArr = getNetScores(p.id);
                            const net = gross ? netArr[i] : null;
                            const isSkinsWinner = skinsHole?.winnerId === p.id;
                            const isBBCounting = selectedFormat === 'better_ball' && teamPairings.some(t => {
                              const bbScore = betterBallTeamScores[t.id];
                              return bbScore?.holeScores?.[i]?.countingPlayerId === p.id;
                            });
                            return (
                              <div key={p.id} className="flex items-center justify-between px-4 py-3"
                                style={{ backgroundColor: isBBCounting ? 'rgba(22,163,74,0.08)' : isSkinsWinner ? 'rgba(22,163,74,0.06)' : 'transparent' }}>
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                                    {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{p.name.split(' ')[0]}</div>
                                    {net !== null && <div className="text-xs" style={{ color: net < (hole?.par || 4) ? '#16a34a' : net > (hole?.par || 4) ? 'var(--color-danger)' : 'var(--color-muted)' }}>net {net}</div>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isBBCounting && <span className="text-xs font-bold" style={{ color: '#16a34a' }}>Counting</span>}
                                  {isSkinsWinner && !isBBCounting && <span className="text-xs font-bold" style={{ color: '#16a34a' }}>Skin</span>}
                                  <input
                                    type="number" inputMode="numeric" min="1" max="20" value={gross}
                                    onChange={e => setGross(p.id, i, e.target.value)} placeholder="—"
                                    className="w-14 h-12 text-center rounded-xl border text-xl font-bold font-mono"
                                    style={{ borderColor: isBBCounting ? '#16a34a' : isSkinsWinner ? '#16a34a' : 'var(--color-border)', backgroundColor: isBBCounting ? 'rgba(22,163,74,0.12)' : isSkinsWinner ? 'rgba(22,163,74,0.08)' : 'var(--color-bg)', color: 'var(--color-text)', touchAction: 'manipulation' }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Better Ball team score for this hole */}
                        {selectedFormat === 'better_ball' && teamPairings.map(team => {
                          const bbScore = betterBallTeamScores[team.id]?.holeScores?.[i];
                          if (!bbScore?.countingPlayerId) return null;
                          return (
                            <div key={team.id} className="px-4 py-1.5 text-xs font-medium flex items-center justify-between" style={{ backgroundColor: 'rgba(22,163,74,0.06)', borderTop: '1px solid rgba(22,163,74,0.15)' }}>
                              <span style={{ color: 'var(--color-muted)' }}>{team.label}</span>
                              <span style={{ color: '#16a34a', fontWeight: 700 }}>{bbScore.net}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  {/* Mobile running totals */}
                  <div className="sticky bottom-16 rounded-xl border shadow-lg overflow-hidden" style={{ borderColor: 'var(--color-primary)', backgroundColor: 'var(--color-primary)' }}>
                    <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white opacity-70">Running Totals</div>
                    <div className="grid gap-0 divide-x" style={{ gridTemplateColumns: `repeat(${selectedPlayers.length}, 1fr)`, borderColor: 'rgba(255,255,255,0.2)' }}>
                      {selectedPlayers.map(p => {
                        const grossTotal = (grossScores[p.id] || []).reduce((s, v) => s + (v || 0), 0);
                        const netTotal = getNetScores(p.id).reduce((s, v) => s + v, 0);
                        return (
                          <div key={p.id} className="px-3 py-2 text-center">
                            <div className="text-xs text-white opacity-60 truncate">{p.name.split(' ')[0]}</div>
                            <div className="text-lg font-bold text-white">{grossTotal || '—'}</div>
                            {grossTotal > 0 && <div className="text-xs opacity-60 text-white">net {netTotal}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Desktop: table */}
                <div className="hidden md:block overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                  <table className="text-xs" style={{ minWidth: `${200 + selectedPlayers.length * 70}px` }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                        <td className="px-3 py-2 font-medium sticky left-0" style={{ backgroundColor: 'var(--color-primary)', minWidth: '80px' }}>Hole</td>
                        <td className="px-2 py-2 text-center" style={{ minWidth: '36px' }}>Par</td>
                        <td className="px-2 py-2 text-center" style={{ minWidth: '36px' }}>SI</td>
                        {selectedPlayers.map(p => (
                          <td key={p.id} className="px-2 py-2 text-center font-medium" style={{ minWidth: '70px' }}>{p.name.split(' ')[0]}</td>
                        ))}
                        {selectedFormat === 'better_ball' && teamPairings.map(t => (
                          <td key={t.id} className="px-2 py-2 text-center font-medium text-xs opacity-80" style={{ minWidth: '60px' }}>{t.label}</td>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 18 }, (_, i) => {
                        const hole = course.holes?.[i];
                        const holeNum = i + 1;
                        const isCtp = activeCtpHoles.includes(holeNum);
                        const skinsHole = skinsPreview[i];
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: i % 2 === 0 ? 'var(--color-surface)' : 'rgba(249,246,240,0.5)' }}>
                            <td className="px-3 py-1.5 font-medium sticky left-0" style={{ backgroundColor: 'inherit', color: 'var(--color-text)' }}>
                              <div className="flex items-center gap-1.5">
                                {holeNum}
                                {isCtp && (
                                  <button onClick={() => { const current = ctpWinners[holeNum]; const idx = selectedPlayers.findIndex(p => p.id === current); const next = selectedPlayers[(idx + 1) % selectedPlayers.length]; setCtpWinners(prev => ({ ...prev, [holeNum]: next?.id || null })); }} title="CTP hole">
                                    <Star size={11} style={{ color: ctpWinners[holeNum] ? 'var(--color-accent)' : 'var(--color-muted)' }} fill={ctpWinners[holeNum] ? 'var(--color-accent)' : 'none'} />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-center font-medium" style={{ color: 'var(--color-primary)' }}>{hole?.par || 4}</td>
                            <td className="px-2 py-1.5 text-center" style={{ color: 'var(--color-muted)' }}>{hole?.strokeIndex || i + 1}</td>
                            {selectedPlayers.map(p => {
                              const gross = grossScores[p.id]?.[i] || '';
                              const netArr = getNetScores(p.id);
                              const net = gross ? netArr[i] : '';
                              const isSkinsWinner = skinsHole?.winnerId === p.id;
                              const isCarryover = skinsHole?.carryover;
                              const isBBCounting = selectedFormat === 'better_ball' && teamPairings.some(t => betterBallTeamScores[t.id]?.holeScores?.[i]?.countingPlayerId === p.id);
                              return (
                                <td key={p.id} className="px-1 py-1" style={{ textAlign: 'center' }}>
                                  <div className="flex flex-col items-center gap-0.5">
                                    <input
                                      type="number" min="1" max="20" value={gross}
                                      onChange={e => setGross(p.id, i, e.target.value)}
                                      className="w-10 text-center rounded border py-0.5 text-xs font-mono"
                                      style={{ borderColor: isBBCounting ? '#16a34a' : isSkinsWinner ? '#16a34a' : isCarryover && gross ? '#9CA3AF' : 'var(--color-border)', backgroundColor: isBBCounting ? 'rgba(22,163,74,0.12)' : isSkinsWinner ? 'rgba(22,163,74,0.1)' : 'transparent', color: 'var(--color-text)' }}
                                    />
                                    {net !== '' && <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{net}</span>}
                                  </div>
                                </td>
                              );
                            })}
                            {selectedFormat === 'better_ball' && teamPairings.map(t => {
                              const bbScore = betterBallTeamScores[t.id]?.holeScores?.[i];
                              return (
                                <td key={t.id} className="px-1 py-1 text-center text-xs font-bold" style={{ color: bbScore?.net ? '#16a34a' : 'var(--color-muted)' }}>
                                  {bbScore?.net || '—'}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                      {/* Totals row */}
                      <tr style={{ backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 600 }}>
                        <td className="px-3 py-2 sticky left-0" style={{ backgroundColor: 'var(--color-primary)' }}>Total</td>
                        <td className="px-2 py-2 text-center">{course.par}</td>
                        <td />
                        {selectedPlayers.map(p => {
                          const grossTotal = (grossScores[p.id] || []).reduce((s, v) => s + (v || 0), 0);
                          const netTotal = getNetScores(p.id).reduce((s, v) => s + v, 0);
                          return (
                            <td key={p.id} className="px-2 py-2 text-center">
                              <div>{grossTotal || '—'}</div>
                              {grossTotal > 0 && <div className="text-xs opacity-70">{netTotal}</div>}
                            </td>
                          );
                        })}
                        {selectedFormat === 'better_ball' && teamPairings.map(t => {
                          const total = betterBallTeamScores[t.id]?.totalNet || 0;
                          return <td key={t.id} className="px-2 py-2 text-center">{total || '—'}</td>;
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* CTP assignments */}
            {activeCtpHoles.length > 0 && (
              <Card>
                <CardHeader><CardTitle>CTP Winners</CardTitle></CardHeader>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {activeCtpHoles.map(hole => (
                    <div key={hole}>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>Hole {hole}</label>
                      <select value={ctpWinners[hole] || ''} onChange={e => setCtpWinners(prev => ({ ...prev, [hole]: e.target.value || null }))}
                        className="w-full px-2 py-1.5 rounded-lg border text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                        <option value="">No winner</option>
                        {selectedPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {!isMatchFormat && !isScramble && selectedPlayers.some(p => !(grossScores[p.id] || []).some(s => s > 0)) && (
              <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(184,151,42,0.1)', color: 'var(--color-accent)', border: '1px solid rgba(184,151,42,0.3)' }}>
                Some players have no scores entered. You can still review, but totals will be incomplete.
              </div>
            )}
            <div className="flex justify-between">
              <button onClick={() => setStep(0)} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
                <ChevronLeft size={14} /> Back
              </button>
              <button onClick={() => setStep(2)} className="px-5 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2" style={{ backgroundColor: 'var(--color-primary)' }}>
                Review <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 2 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Round Summary</CardTitle>
                  <Badge variant="default">{course?.name}</Badge>
                </div>
              </CardHeader>

              {/* Match play summary */}
              {isMatchFormat ? (
                <div className="space-y-3 mt-3">
                  {summaryRows.map((row, i) => (
                    <div key={i} className="p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{row.p1?.name?.split(' ')[0]}</span>
                          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>vs</span>
                          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{row.p2?.name?.split(' ')[0]}</span>
                        </div>
                        <Badge variant={row.runningStatus.concluded ? 'accent' : 'default'}>
                          {row.runningStatus.concluded
                            ? (row.conclusion === 'all_square' ? 'All Square' : row.conclusion)
                            : row.runningStatus.thru === 0 ? 'Not started' : `Thru ${row.runningStatus.thru}`}
                        </Badge>
                      </div>
                      {/* Hole-by-hole grid */}
                      <div className="flex gap-1 flex-wrap">
                        {(calcMatchPlay(getNetScores(row.pair.player1Id), getNetScores(row.pair.player2Id)).holeResults || []).map((result, hi) => (
                          <span key={hi} className="w-6 h-5 inline-flex items-center justify-center rounded text-xs"
                            style={{ backgroundColor: result === 'W' ? 'rgba(22,163,74,0.15)' : result === 'L' ? 'rgba(220,38,38,0.1)' : result === 'H' ? 'rgba(107,114,128,0.08)' : 'transparent', color: result === 'W' ? '#16a34a' : result === 'L' ? 'var(--color-danger)' : 'var(--color-muted)', fontSize: '9px', fontWeight: 700 }}>
                            {result ?? hi + 1}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : isScramble ? (
                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                        {['Team', 'Gross', 'HCP', 'Net'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {teamPairings.map((team, i) => {
                        const total = (scrambleTeamScores[team.id] || []).reduce((s, v) => s + (v || 0), 0);
                        const hcp = calcScrambleHandicap(team.playerIds, players);
                        return (
                          <tr key={team.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                {i === 0 && <Trophy size={12} style={{ color: 'var(--color-accent)' }} />}
                                <span className="font-medium" style={{ color: 'var(--color-text)' }}>{team.label}</span>
                              </div>
                              <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                                {team.playerIds.map(pid => players.find(p => p.id === pid)?.name?.split(' ')[0]).filter(Boolean).join(', ')}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center" style={{ color: 'var(--color-muted)' }}>{total || '—'}</td>
                            <td className="px-3 py-2.5 text-center" style={{ color: 'var(--color-muted)' }}>{hcp}</td>
                            <td className="px-3 py-2.5 text-center font-medium" style={{ color: 'var(--color-primary)' }}>{total ? total - hcp : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                        {['Player', 'Gross', 'Net', 'Stableford', ...(selectedFormat === 'individual' ? ['Skins', 'Skins $'] : []), 'CTP'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {summaryRows.map((row, i) => (
                        <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              {i === 0 && <Trophy size={12} style={{ color: 'var(--color-accent)' }} />}
                              <span className="font-medium" style={{ color: 'var(--color-text)' }}>{row.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center" style={{ color: 'var(--color-muted)' }}>{row.gross || '—'}</td>
                          <td className="px-3 py-2.5 text-center font-medium" style={{ color: 'var(--color-primary)' }}>{row.net || '—'}</td>
                          <td className="px-3 py-2.5 text-center" style={{ color: 'var(--color-text)' }}>{row.stableford}</td>
                          {selectedFormat === 'individual' && (
                            <>
                              <td className="px-3 py-2.5 text-center" style={{ color: 'var(--color-muted)' }}>{row.skinsWon}</td>
                              <td className="px-3 py-2.5 text-center font-medium" style={{ color: 'var(--color-accent)' }}>{row.skinsAmount > 0 ? `$${row.skinsAmount}` : '—'}</td>
                            </>
                          )}
                          <td className="px-3 py-2.5 text-center">
                            {row.ctpWins > 0 ? <Badge variant="accent">{row.ctpWins}</Badge> : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Better ball team totals */}
                  {selectedFormat === 'better_ball' && teamPairings.length > 0 && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-muted)' }}>Team Scores</div>
                      <div className="grid grid-cols-2 gap-3">
                        {teamPairings.map((team, i) => {
                          const total = betterBallTeamScores[team.id]?.totalNet || 0;
                          return (
                            <div key={team.id} className="p-3 rounded-lg" style={{ backgroundColor: i === 0 ? 'rgba(27,67,50,0.06)' : 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                              <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{team.label}</div>
                              <div className="text-2xl font-bold mt-1" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-primary)' }}>{total || '—'}</div>
                              <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>team net</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {Object.values(ctpWinners).some(Boolean) && (
              <Card>
                <CardHeader><CardTitle>CTP Results</CardTitle></CardHeader>
                <div className="space-y-2">
                  {Object.entries(ctpWinners).filter(([, wid]) => wid).map(([hole, winnerId]) => {
                    const winner = players.find(p => p.id === winnerId);
                    return (
                      <div key={hole} className="flex items-center gap-3 py-1.5">
                        <span className="w-16 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Hole {hole}</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{winner?.name || 'Unknown'}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
                <ChevronLeft size={14} /> Back
              </button>
              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}>Cancel</button>
                <button onClick={handleFinalize} className="px-6 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2" style={{ backgroundColor: 'var(--color-accent)' }}>
                  <Check size={15} /> Finalize Round
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
