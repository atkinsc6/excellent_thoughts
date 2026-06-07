import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TopBar } from '../layout/TopBar';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useHandicap } from '../../hooks/useHandicap';
import { calcHandicapIndex, calcScorecardBreakdown } from '../../utils/scoring';

const PLAYER_COLORS = ['#1B4332','#B8972A','#2D6A4F','#DC2626','#7C3AED','#0284C7','#D97706','#059669'];

export function HandicapTracker({ players, setPlayers, rounds, courses }) {
  const { getDifferentials, getHandicapTrend, getHandicapIndex } = useHandicap(players, rounds, courses);
  const [tab, setTab] = useState('handicap'); // 'handicap' | 'stats'
  const [selectedPlayer, setSelectedPlayer] = useState(players[0]?.id || '');
  const [statsPlayerId, setStatsPlayerId] = useState(players[0]?.id || '');
  const [editingHcp, setEditingHcp] = useState(null); // playerId
  const [editValue, setEditValue] = useState('');
  const [visiblePlayers, setVisiblePlayers] = useState(players.slice(0, 4).map(p => p.id));

  // Differential history for selected player
  const differentials = useMemo(() => getDifferentials(selectedPlayer), [selectedPlayer, rounds, courses]);

  // Trend chart data — all dates, all visible players
  const trendData = useMemo(() => {
    const allDates = [...new Set(rounds.map(r => r.date))].sort();
    return allDates.map(date => {
      const entry = { date: format(parseISO(date), 'MMM d') };
      visiblePlayers.forEach(pid => {
        const trend = getHandicapTrend(pid);
        const pt = trend.find(t => t.date === date);
        if (pt) entry[pid] = pt.index;
      });
      return entry;
    });
  }, [rounds, visiblePlayers, getHandicapTrend]);

  const toggleVisible = (pid) => {
    setVisiblePlayers(prev =>
      prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]
    );
  };

  const startEdit = (player) => {
    setEditingHcp(player.id);
    setEditValue(String(player.handicapIndex));
  };

  const saveEdit = (pid) => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0 || val > 54) return;
    setPlayers(prev => prev.map(p => p.id === pid ? { ...p, handicapIndex: val } : p));
    setEditingHcp(null);
  };

  const selectedPlayerObj = players.find(p => p.id === selectedPlayer);
  const computedIndex = getHandicapIndex(selectedPlayer);

  const statsPlayer = players.find(p => p.id === statsPlayerId);

  const statsData = useMemo(() => {
    if (!statsPlayerId) return null;
    const playerRounds = rounds.filter(r => r.playerIds?.includes(statsPlayerId) && r.scores);
    if (!playerRounds.length) return null;

    // Per-hole avg delta vs par
    const holeData = Array.from({ length: 18 }, (_, i) => {
      const deltas = playerRounds
        .map(r => {
          const course = courses.find(c => c.id === r.courseId);
          const ps = r.scores?.find(s => s.playerId === statsPlayerId);
          const gross = ps?.grossScores?.[i];
          const par = course?.holes?.[i]?.par;
          return (gross && par) ? gross - par : null;
        })
        .filter(d => d !== null);
      const avg = deltas.length ? deltas.reduce((s, v) => s + v, 0) / deltas.length : 0;
      return { hole: i + 1, avgDelta: parseFloat(avg.toFixed(2)) };
    });

    // Scoring breakdown totals
    let breakdown = { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0, worse: 0 };
    playerRounds.forEach(r => {
      const course = courses.find(c => c.id === r.courseId);
      const ps = r.scores?.find(s => s.playerId === statsPlayerId);
      if (!ps || !course) return;
      const b = calcScorecardBreakdown(ps.grossScores, course.holes);
      Object.keys(breakdown).forEach(k => { breakdown[k] += b[k]; });
    });

    // Par type averages
    const parBuckets = { 3: [], 4: [], 5: [] };
    playerRounds.forEach(r => {
      const course = courses.find(c => c.id === r.courseId);
      const ps = r.scores?.find(s => s.playerId === statsPlayerId);
      if (!ps || !course) return;
      ps.grossScores.forEach((g, i) => {
        const par = course.holes[i]?.par;
        if (g && par && parBuckets[par]) parBuckets[par].push(g);
      });
    });
    const parTypeAvg = {};
    Object.entries(parBuckets).forEach(([par, scores]) => {
      parTypeAvg[par] = scores.length ? (scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1) : null;
    });

    // Std deviation of round gross scores
    const roundGross = playerRounds.map(r => r.scores?.find(s => s.playerId === statsPlayerId)?.totalGross).filter(Boolean);
    const mean = roundGross.reduce((s, v) => s + v, 0) / (roundGross.length || 1);
    const stdDev = roundGross.length > 1
      ? Math.sqrt(roundGross.reduce((s, v) => s + (v - mean) ** 2, 0) / roundGross.length).toFixed(1)
      : null;

    const byNet = (a, b) => (a.scores?.find(s => s.playerId === statsPlayerId)?.totalNet || 999) -
                            (b.scores?.find(s => s.playerId === statsPlayerId)?.totalNet || 999);
    const sortedByNet = [...playerRounds].sort(byNet);
    const bestRound = sortedByNet[0];
    const worstRound = sortedByNet[sortedByNet.length - 1];

    return { holeData, breakdown, parTypeAvg, stdDev, bestRound, worstRound, roundCount: playerRounds.length };
  }, [statsPlayerId, rounds, courses]);

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <TopBar title="Handicap Tracker" subtitle="WHS handicap indices and differential history">
        <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          {[['handicap','Handicap'],['stats','Stats']].map(([v, label]) => (
            <button key={v} onClick={() => setTab(v)}
              className="px-4 py-1.5 text-sm font-medium transition-all"
              style={{ backgroundColor: tab === v ? 'var(--color-primary)' : 'var(--color-surface)', color: tab === v ? 'white' : 'var(--color-muted)' }}>
              {label}
            </button>
          ))}
        </div>
      </TopBar>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* ── Stats Tab ── */}
        {tab === 'stats' && (
          <div className="space-y-6">
            {/* Player selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Player:</label>
              <select
                value={statsPlayerId}
                onChange={e => setStatsPlayerId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              >
                {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {statsData && (
                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{statsData.roundCount} rounds analyzed</span>
              )}
            </div>

            {!statsData ? (
              <Card><p className="py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>No rounds found for this player.</p></Card>
            ) : (
              <>
                {/* Stat summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Std Dev (Gross)', value: statsData.stdDev ?? '—', sub: 'Lower = more consistent' },
                    { label: 'Best Net', value: statsData.bestRound?.scores?.find(s => s.playerId === statsPlayerId)?.totalNet ?? '—', sub: format(parseISO(statsData.bestRound?.date || new Date().toISOString()), 'MMM d') },
                    { label: 'Worst Net', value: statsData.worstRound?.scores?.find(s => s.playerId === statsPlayerId)?.totalNet ?? '—', sub: format(parseISO(statsData.worstRound?.date || new Date().toISOString()), 'MMM d') },
                    { label: 'Par 3 Avg', value: statsData.parTypeAvg[3] ?? '—', sub: `Par 4: ${statsData.parTypeAvg[4] ?? '—'} · Par 5: ${statsData.parTypeAvg[5] ?? '—'}` },
                  ].map((sc, i) => (
                    <Card key={i}>
                      <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>{sc.label}</div>
                      <div className="text-2xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>{sc.value}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{sc.sub}</div>
                    </Card>
                  ))}
                </div>

                {/* Scoring breakdown badges */}
                <Card>
                  <CardHeader><CardTitle>Scoring Breakdown</CardTitle></CardHeader>
                  <div className="flex flex-wrap gap-3 mt-3">
                    {[
                      { label: 'Eagles', value: statsData.breakdown.eagles, color: '#7C3AED' },
                      { label: 'Birdies', value: statsData.breakdown.birdies, color: '#16A34A' },
                      { label: 'Pars', value: statsData.breakdown.pars, color: 'var(--color-primary)' },
                      { label: 'Bogeys', value: statsData.breakdown.bogeys, color: 'var(--color-accent)' },
                      { label: 'Doubles', value: statsData.breakdown.doubles, color: 'var(--color-danger)' },
                      { label: 'Worse', value: statsData.breakdown.worse, color: '#7F1D1D' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex flex-col items-center px-4 py-3 rounded-lg border" style={{ borderColor: 'var(--color-border)', minWidth: '72px' }}>
                        <div className="text-2xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color }}>{value}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Per-hole bar chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Avg Score vs Par by Hole</CardTitle>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Green = under par average, red = over par average</p>
                  </CardHeader>
                  <ResponsiveContainer width="100%" height={240} className="mt-3">
                    <BarChart data={statsData.holeData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="hole" tick={{ fontSize: 10, fill: 'var(--color-muted)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted)' }} tickFormatter={v => v > 0 ? `+${v}` : v} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, border: '1px solid var(--color-border)', borderRadius: '8px' }}
                        formatter={(val) => [val > 0 ? `+${val}` : val, 'Avg vs Par']}
                        labelFormatter={label => `Hole ${label}`}
                      />
                      <Bar dataKey="avgDelta" radius={[3, 3, 0, 0]}>
                        {statsData.holeData.map((entry, i) => (
                          <Cell key={i} fill={entry.avgDelta <= 0 ? '#16A34A' : entry.avgDelta <= 1 ? 'var(--color-accent)' : 'var(--color-danger)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ── Handicap Tab ── */}
        {tab === 'handicap' && <>

        {/* Current Indices Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Current Handicap Indices</CardTitle>
              <Badge variant="default">WHS Method</Badge>
            </div>
          </CardHeader>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  {['Player', 'Stored Index', 'Computed Index', 'Rounds', 'Differentials Used', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map(p => {
                  const diffs = getDifferentials(p.id);
                  const computed = getHandicapIndex(p.id);
                  const isEditing = editingHcp === p.id;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                            {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="font-medium" style={{ color: 'var(--color-text)' }}>{p.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="w-20 px-2 py-1 rounded border text-sm"
                              min="0" max="54" step="0.1"
                              style={{ borderColor: 'var(--color-accent)', color: 'var(--color-text)' }}
                              onKeyDown={e => e.key === 'Enter' && saveEdit(p.id)}
                            />
                            <Button size="sm" variant="primary" onClick={() => saveEdit(p.id)}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingHcp(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <span className="font-semibold text-base" style={{ color: 'var(--color-primary)' }}>{p.handicapIndex}</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-semibold" style={{ color: diffs.length ? 'var(--color-accent)' : 'var(--color-muted)' }}>
                          {diffs.length ? computed : '—'}
                        </span>
                        {diffs.length > 0 && Math.abs(computed - p.handicapIndex) > 0.5 && (
                          <Badge variant="accent" className="ml-2">Updated</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center" style={{ color: 'var(--color-muted)' }}>{diffs.length}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {diffs.slice(-3).map((d, i) => (
                            <Badge key={i} variant="muted">{d.differential}</Badge>
                          ))}
                          {diffs.length > 3 && <span className="text-xs" style={{ color: 'var(--color-muted)' }}>+{diffs.length - 3} more</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {!isEditing && (
                          <Button size="sm" variant="secondary" onClick={() => startEdit(p)}>Override</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Handicap Index Trend</CardTitle>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Click a player's name to toggle visibility</p>
          </CardHeader>
          <div className="flex flex-wrap gap-2 mt-3 mb-4">
            {players.map((p, i) => (
              <button
                key={p.id}
                onClick={() => toggleVisible(p.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
                style={{
                  backgroundColor: visiblePlayers.includes(p.id) ? PLAYER_COLORS[i] : 'var(--color-surface)',
                  color: visiblePlayers.includes(p.id) ? 'white' : 'var(--color-muted)',
                  borderColor: PLAYER_COLORS[i],
                  opacity: visiblePlayers.includes(p.id) ? 1 : 0.5,
                }}
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted)' }} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip contentStyle={{ fontSize: 11, border: '1px solid var(--color-border)', borderRadius: '8px' }} />
              {visiblePlayers.map((pid, i) => {
                const pi = players.findIndex(p => p.id === pid);
                const player = players.find(p => p.id === pid);
                return (
                  <Line
                    key={pid}
                    type="monotone"
                    dataKey={pid}
                    name={player?.name?.split(' ')[0] || pid}
                    stroke={PLAYER_COLORS[pi]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Differential History for selected player */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle>Differential History</CardTitle>
              <select
                value={selectedPlayer}
                onChange={e => setSelectedPlayer(e.target.value)}
                className="px-3 py-1.5 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              >
                {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </CardHeader>
          {selectedPlayerObj && (
            <div className="mt-2 mb-3 flex items-center gap-4 flex-wrap">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Current Index</span>
                <div className="text-3xl font-bold mt-0.5" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-primary)' }}>
                  {selectedPlayerObj.handicapIndex}
                </div>
              </div>
              {differentials.length > 0 && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Computed (WHS)</span>
                  <div className="text-3xl font-bold mt-0.5" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-accent)' }}>
                    {computedIndex}
                  </div>
                </div>
              )}
            </div>
          )}
          {differentials.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No round history for this player.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    {['Date', 'Course', 'Gross', 'Adj. Gross', 'Rating', 'Slope', 'Differential', 'Used?'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...differentials].reverse().map((d, i) => {
                    const course = courses.find(c => c.id === d.courseId);
                    const tee = course?.tees.find(t => t.name === rounds.find(r => r.id === d.roundId)?.tee);
                    // Best 8 of last 20 are "used"
                    const sorted = [...differentials].sort((a, b) => a.differential - b.differential);
                    const best8 = new Set(sorted.slice(0, 8).map(x => x.roundId));
                    const isUsed = best8.has(d.roundId);
                    return (
                      <tr key={d.roundId} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5" style={{ color: 'var(--color-text)' }}>{format(parseISO(d.date), 'MMM d, yyyy')}</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--color-muted)' }}>{d.courseName?.split('(')[0].trim()}</td>
                        <td className="px-3 py-2.5 font-medium" style={{ color: 'var(--color-text)' }}>{d.grossScore}</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--color-muted)' }}>{d.adjustedGross}</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--color-muted)' }}>{tee?.rating || '—'}</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--color-muted)' }}>{tee?.slope || '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className="font-bold" style={{ color: isUsed ? 'var(--color-accent)' : 'var(--color-text)' }}>
                            {d.differential}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {isUsed && <Badge variant="accent">✓ Used</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs" style={{ color: 'var(--color-muted)' }}>
            WHS: Best 8 differentials of last 20 rounds × 0.96, capped at 54.0. Gold values indicate differentials used in current index calculation.
          </p>
        </Card>
        </>}
      </div>
    </div>
  );
}
