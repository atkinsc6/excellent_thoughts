import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight, ChevronLeft, Check, Star, Trophy, DollarSign } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../hooks/useAuth';
import {
  calcCourseHandicap,
  calcPlayingHandicap,
  strokesReceivedPerHole,
  calcNetScore,
  calcStableford,
} from '../../utils/scoring';
import { calcSkins, skinsSummary } from '../../utils/skins';
import { logActivity, ACTIVITY_TYPES } from '../../utils/activity';

const FORMATS = [
  { value: 'individual', label: 'Individual Stroke Play' },
  { value: 'better_ball', label: 'Team Better Ball' },
  { value: 'scramble', label: 'Scramble' },
  { value: 'chapman', label: 'Chapman' },
];

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

  const course = useMemo(() => courses.find(c => c.id === selectedCourseId), [courses, selectedCourseId]);
  const selectedPlayers = useMemo(() => players.filter(p => selectedPlayerIds.includes(p.id)), [players, selectedPlayerIds]);

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
    if (!course?.holes || selectedPlayers.length < 2) return [];
    const playerScoreData = selectedPlayers.map(p => ({
      playerId: p.id,
      grossScores: Array.from({ length: 18 }, (_, i) => grossScores[p.id]?.[i] || 0),
      netScores: getNetScores(p.id),
    }));
    const type = league?.skinsType === 'gross' ? 'gross' : 'net';
    return calcSkins(course.holes, playerScoreData, type);
  }, [grossScores, selectedPlayers, course, league]);

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

    return {
      id: `round-${Date.now()}`,
      date: selectedDate,
      courseId: selectedCourseId,
      tee: primaryTee,
      playerIds: selectedPlayerIds,
      scores,
      ctpResults,
      skinsResults: skinsPreview.map(s => ({ hole: s.hole, winnerId: s.winnerId, carryover: s.carryover, gross: league?.skinsType === 'gross' })),
      finalized: true,
      finalizedAt: new Date().toISOString(),
    };
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

  function togglePlayer(playerId) {
    setSelectedPlayerIds(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  }

  function setGross(playerId, holeIdx, val) {
    const num = parseInt(val) || 0;
    setGrossScores(prev => ({
      ...prev,
      [playerId]: Object.assign(Array(18).fill(0), prev[playerId] || [], { [holeIdx]: num }),
    }));
  }

  const summaryRows = useMemo(() => {
    if (!course) return [];
    const skins = skinsSummary(skinsPreview);
    return selectedPlayers.map(p => {
      const grossArr = Array.from({ length: 18 }, (_, i) => grossScores[p.id]?.[i] || 0);
      const netArr = getNetScores(p.id);
      const sfArr = getStablefordPoints(p.id);
      const skinsWon = skins[p.id] || 0;
      const ctpWins = Object.values(ctpWinners).filter(wid => wid === p.id).length;
      return {
        id: p.id,
        name: p.name,
        gross: grossArr.reduce((s, v) => s + v, 0),
        net: netArr.reduce((s, v) => s + v, 0),
        stableford: sfArr.reduce((s, v) => s + v, 0),
        skinsWon,
        skinsAmount: skinsWon * (league?.skinsEntry || 5) * selectedPlayers.length,
        ctpWins,
      };
    }).sort((a, b) => a.net - b.net);
  }, [grossScores, selectedPlayers, course, skinsPreview, ctpWinners, league]);

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
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: i < step ? 'var(--color-accent)' : i === step ? 'var(--color-primary)' : 'var(--color-border)',
                  color: i <= step ? 'white' : 'var(--color-muted)',
                }}
              >
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span className="text-sm font-medium" style={{ color: i === step ? 'var(--color-text)' : 'var(--color-muted)' }}>{s}</span>
              {i < STEPS.length - 1 && (
                <ChevronRight size={14} style={{ color: 'var(--color-border)' }} className="mx-1" />
              )}
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
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>Course</label>
                  <select
                    value={selectedCourseId}
                    onChange={e => setSelectedCourseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>Format</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FORMATS.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setSelectedFormat(f.value)}
                      className="px-3 py-2 rounded-lg border text-xs font-medium transition-all"
                      style={{
                        borderColor: selectedFormat === f.value ? 'var(--color-accent)' : 'var(--color-border)',
                        backgroundColor: selectedFormat === f.value ? 'rgba(184,151,42,0.1)' : 'transparent',
                        color: selectedFormat === f.value ? 'var(--color-accent)' : 'var(--color-text)',
                      }}
                    >
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
                      <input
                        type="checkbox"
                        checked={selectedPlayerIds.includes(p.id)}
                        onChange={() => togglePlayer(p.id)}
                        className="rounded"
                      />
                      <span className="flex-1 text-sm font-medium" style={{ color: 'var(--color-text)' }}>{p.name}</span>
                      {selectedPlayerIds.includes(p.id) && course?.tees && (
                        <select
                          value={getTeeForPlayer(p.id)}
                          onChange={e => setPlayerTees(prev => ({ ...prev, [p.id]: e.target.value }))}
                          className="px-2 py-1 rounded border text-xs"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        >
                          {course.tees.map(t => (
                            <option key={t.name} value={t.name}>{t.name} ({t.rating}/{t.slope})</option>
                          ))}
                        </select>
                      )}
                      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>HCP {p.handicapIndex || 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(1)}
                  disabled={!selectedCourseId || selectedPlayerIds.length === 0}
                  className="px-5 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
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
                <div className="font-semibold" style={{ color: 'var(--color-text)', fontFamily: 'Cormorant Garamond, serif', fontSize: '18px' }}>
                  {course.name}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  {selectedDate} · {selectedPlayers.length} players
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
              <table className="text-xs" style={{ minWidth: `${200 + selectedPlayers.length * 70}px` }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                    <td className="px-3 py-2 font-medium sticky left-0" style={{ backgroundColor: 'var(--color-primary)', minWidth: '80px' }}>Hole</td>
                    <td className="px-2 py-2 text-center" style={{ minWidth: '36px' }}>Par</td>
                    <td className="px-2 py-2 text-center" style={{ minWidth: '36px' }}>SI</td>
                    {selectedPlayers.map(p => (
                      <td key={p.id} className="px-2 py-2 text-center font-medium" style={{ minWidth: '70px' }}>
                        {p.name.split(' ')[0]}
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 18 }, (_, i) => {
                    const hole = course.holes?.[i];
                    const holeNum = i + 1;
                    const isCtp = league?.ctpHoles?.includes(holeNum);
                    const skinsHole = skinsPreview[i];
                    return (
                      <tr
                        key={i}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          backgroundColor: i % 2 === 0 ? 'var(--color-surface)' : 'rgba(249,246,240,0.5)',
                        }}
                      >
                        <td className="px-3 py-1.5 font-medium sticky left-0" style={{ backgroundColor: 'inherit', color: 'var(--color-text)' }}>
                          <div className="flex items-center gap-1.5">
                            {holeNum}
                            {isCtp && (
                              <button
                                onClick={() => {
                                  const current = ctpWinners[holeNum];
                                  const idx = selectedPlayers.findIndex(p => p.id === current);
                                  const next = selectedPlayers[(idx + 1) % selectedPlayers.length];
                                  setCtpWinners(prev => ({ ...prev, [holeNum]: next?.id || null }));
                                }}
                                title="CTP hole — click to assign winner"
                              >
                                <Star
                                  size={11}
                                  style={{ color: ctpWinners[holeNum] ? 'var(--color-accent)' : 'var(--color-muted)' }}
                                  fill={ctpWinners[holeNum] ? 'var(--color-accent)' : 'none'}
                                />
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
                          return (
                            <td key={p.id} className="px-1 py-1" style={{ textAlign: 'center' }}>
                              <div className="flex flex-col items-center gap-0.5">
                                <input
                                  type="number"
                                  min="1"
                                  max="20"
                                  value={gross}
                                  onChange={e => setGross(p.id, i, e.target.value)}
                                  className="w-10 text-center rounded border py-0.5 text-xs font-mono"
                                  style={{
                                    borderColor: isSkinsWinner ? '#16a34a' : isCarryover && gross ? '#9CA3AF' : 'var(--color-border)',
                                    backgroundColor: isSkinsWinner ? 'rgba(22,163,74,0.1)' : 'transparent',
                                    color: 'var(--color-text)',
                                  }}
                                />
                                {net !== '' && (
                                  <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{net}</span>
                                )}
                              </div>
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
                  </tr>
                </tbody>
              </table>
            </div>

            {/* CTP assignments if any */}
            {(league?.ctpHoles?.length > 0) && (
              <Card>
                <CardHeader><CardTitle>CTP Winners</CardTitle></CardHeader>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {league.ctpHoles.map(hole => (
                    <div key={hole}>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>
                        Hole {hole}
                      </label>
                      <select
                        value={ctpWinners[hole] || ''}
                        onChange={e => setCtpWinners(prev => ({ ...prev, [hole]: e.target.value || null }))}
                        className="w-full px-2 py-1.5 rounded-lg border text-sm"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      >
                        <option value="">No winner</option>
                        {selectedPlayers.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep(0)}
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5"
                style={{ color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
              >
                <ChevronLeft size={14} /> Back
              </button>
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                      {['Player', 'Gross', 'Net', 'Stableford', 'Skins', 'Skins $', 'CTP'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
                          {h}
                        </th>
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
                        <td className="px-3 py-2.5 text-center" style={{ color: 'var(--color-muted)' }}>{row.skinsWon}</td>
                        <td className="px-3 py-2.5 text-center font-medium" style={{ color: 'var(--color-accent)' }}>
                          {row.skinsAmount > 0 ? `$${row.skinsAmount}` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {row.ctpWins > 0 ? (
                            <Badge variant="accent">{row.ctpWins}</Badge>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5"
                style={{ color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
              >
                <ChevronLeft size={14} /> Back
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep(0); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinalize}
                  className="px-6 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
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
