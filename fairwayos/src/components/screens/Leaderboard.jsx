import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { partitionRoundsByHalf } from '../../utils/scoring';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TopBar } from '../layout/TopBar';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';

export function Leaderboard({ players, rounds, courses, teams = [], league }) {
  const [view, setView] = useState('season'); // 'season' | 'round' | 'teams'
  const [selectedRoundId, setSelectedRoundId] = useState(rounds[rounds.length - 1]?.id || '');
  const [scoreType, setScoreType] = useState('net'); // 'gross' | 'net' | 'stableford'

  const sortedRounds = useMemo(() => [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date)), [rounds]);

  // Halves partitioning
  const { firstHalf, secondHalf } = useMemo(() =>
    partitionRoundsByHalf(rounds, league?.halvesBreakpoint)
  , [rounds, league]);

  // Active round set for season-style views
  const activeRounds = useMemo(() => {
    if (view === '1h') return firstHalf;
    if (view === '2h') return secondHalf;
    return rounds;
  }, [view, rounds, firstHalf, secondHalf]);

  // Season leaderboard
  const seasonData = useMemo(() => {
    return players.map(p => {
      const pr = activeRounds.filter(r => r.playerIds.includes(p.id));
      const totalGross = pr.reduce((s, r) => s + (r.scores?.find(sc => sc.playerId === p.id)?.totalGross || 0), 0);
      const totalNet   = pr.reduce((s, r) => s + (r.scores?.find(sc => sc.playerId === p.id)?.totalNet   || 0), 0);
      const totalStab  = pr.reduce((s, r) => s + (r.scores?.find(sc => sc.playerId === p.id)?.totalStableford || 0), 0);
      const n = pr.length;
      const allGross = pr.flatMap(r => r.scores?.find(sc => sc.playerId === p.id)?.grossScores || []);
      const birdies = pr.reduce((s, r) => {
        const ps = r.scores?.find(sc => sc.playerId === p.id);
        if (!ps) return s;
        const course = courses.find(c => c.id === r.courseId);
        return s + ps.grossScores.filter((g, i) => g < course?.holes[i]?.par).length;
      }, 0);
      const eagles = pr.reduce((s, r) => {
        const ps = r.scores?.find(sc => sc.playerId === p.id);
        if (!ps) return s;
        const course = courses.find(c => c.id === r.courseId);
        return s + ps.grossScores.filter((g, i) => g <= course?.holes[i]?.par - 2).length;
      }, 0);
      return {
        id: p.id,
        name: p.name,
        rounds: n,
        avgGross: n ? (totalGross / n).toFixed(1) : '-',
        avgNet: n ? (totalNet / n).toFixed(1) : '-',
        totalStab,
        bestGross: pr.length ? Math.min(...pr.map(r => r.scores?.find(sc => sc.playerId === p.id)?.totalGross || 999)) : '-',
        bestNet: pr.length ? Math.min(...pr.map(r => r.scores?.find(sc => sc.playerId === p.id)?.totalNet || 999)) : '-',
        birdies,
        eagles,
        sortValue: scoreType === 'gross' ? (n ? totalGross / n : 999)
          : scoreType === 'net' ? (n ? totalNet / n : 999)
          : (n ? -totalStab / n : 999),
      };
    }).sort((a, b) => a.sortValue - b.sortValue);
  }, [players, activeRounds, courses, scoreType]);

  // Single round leaderboard
  const roundData = useMemo(() => {
    const round = rounds.find(r => r.id === selectedRoundId);
    if (!round) return [];
    const course = courses.find(c => c.id === round.courseId);
    return [...(round.scores || [])].map(ps => {
      const player = players.find(p => p.id === ps.playerId);
      const par = course?.par || 72;
      const vsParGross = ps.totalGross - par;
      const vsParNet = ps.totalNet - par;
      return {
        id: ps.playerId,
        name: player?.name || 'Unknown',
        gross: ps.totalGross,
        net: ps.totalNet,
        stableford: ps.totalStableford,
        vsParGross,
        vsParNet,
        playingHcp: ps.playingHandicap,
        sortValue: scoreType === 'gross' ? ps.totalGross
          : scoreType === 'net' ? ps.totalNet
          : -ps.totalStableford,
      };
    }).sort((a, b) => a.sortValue - b.sortValue);
  }, [rounds, selectedRoundId, players, courses, scoreType]);

  // Team standings
  const teamStandingsData = useMemo(() => {
    if (!teams.length) return [];
    return teams.map(team => {
      let wins = 0, losses = 0, ties = 0, totalNet = 0, roundCount = 0;
      let lowRound = Infinity, lowRoundDate = null;
      rounds.forEach(r => {
        const teamScores = team.playerIds
          .map(pid => r.scores?.find(s => s.playerId === pid)).filter(Boolean);
        if (!teamScores.length) return;
        const teamBest = Math.min(...teamScores.map(s => s.totalNet));
        totalNet += teamBest;
        roundCount++;
        if (teamBest < lowRound) { lowRound = teamBest; lowRoundDate = r.date; }
        const otherTeams = teams.filter(t => t.id !== team.id);
        otherTeams.forEach(opp => {
          const oppScores = opp.playerIds
            .map(pid => r.scores?.find(s => s.playerId === pid)).filter(Boolean);
          if (!oppScores.length) return;
          const oppBest = Math.min(...oppScores.map(s => s.totalNet));
          if (teamBest < oppBest) wins++;
          else if (teamBest > oppBest) losses++;
          else ties++;
        });
      });
      const contributors = team.playerIds.map(pid => {
        const p = players.find(pl => pl.id === pid);
        const pr = rounds.filter(r => r.playerIds.includes(pid));
        const totalPlayerNet = pr.reduce((s, r) => s + (r.scores?.find(sc => sc.playerId === pid)?.totalNet || 0), 0);
        return { player: p, rounds: pr.length, avgNet: pr.length ? Math.round(totalPlayerNet / pr.length * 10) / 10 : 0 };
      }).filter(c => c.player).sort((a, b) => a.avgNet - b.avgNet);
      return { ...team, wins, losses, ties, avgNet: roundCount ? Math.round(totalNet / roundCount * 10) / 10 : 0, roundCount, lowRound: lowRound === Infinity ? null : lowRound, lowRoundDate, contributors };
    }).sort((a, b) => b.wins - a.wins || a.avgNet - b.avgNet);
  }, [teams, rounds, players]);

  const tableData = (view === 'season' || view === '1h' || view === '2h') ? seasonData : roundData;
  const selectedRound = rounds.find(r => r.id === selectedRoundId);
  const selectedCourse = selectedRound ? courses.find(c => c.id === selectedRound.courseId) : null;

  // Season stat cards
  const seasonStats = useMemo(() => {
    let lowGross = { score: Infinity, player: null };
    let lowNet = { score: Infinity, player: null };
    let totalBirdies = 0, totalEagles = 0;
    players.forEach(p => {
      const pr = activeRounds.filter(r => r.playerIds.includes(p.id));
      pr.forEach(r => {
        const ps = r.scores?.find(sc => sc.playerId === p.id);
        const course = courses.find(c => c.id === r.courseId);
        if (!ps || !course) return;
        if (ps.totalGross < lowGross.score) lowGross = { score: ps.totalGross, player: p };
        if (ps.totalNet < lowNet.score) lowNet = { score: ps.totalNet, player: p };
        ps.grossScores.forEach((g, i) => {
          const par = course.holes[i]?.par || 4;
          if (g < par) totalBirdies++;
          if (g <= par - 2) totalEagles++;
        });
      });
    });
    return { lowGross, lowNet, totalBirdies, totalEagles };
  }, [players, activeRounds, courses]);

  const scoreLabels = { gross: 'Gross', net: 'Net', stableford: 'Stableford' };
  const vsParDisplay = (val) => {
    if (val === undefined || val === null) return '-';
    if (val === 0) return 'E';
    return val > 0 ? `+${val}` : `${val}`;
  };
  const vsParColor = (val) => val < 0 ? '#16A34A' : val > 0 ? 'var(--color-danger)' : 'var(--color-muted)';

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <TopBar title="Leaderboard" subtitle={`Season ${rounds.length ? new Date(rounds[0]?.date).getFullYear() : '2025'} standings`}>
        <div className="flex gap-2 flex-wrap">
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
            {[
              ['season','Season'],
              ...(league?.splitIntoHalves ? [['1h','1st Half'],['2h','2nd Half']] : []),
              ['round','Round'],
              ['teams','Teams'],
            ].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1.5 text-sm font-medium transition-all"
                style={{
                  backgroundColor: view === v ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: view === v ? 'white' : 'var(--color-muted)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
            {['gross', 'net', 'stableford'].map(v => (
              <button
                key={v}
                onClick={() => setScoreType(v)}
                className="px-3 py-1.5 text-sm font-medium capitalize transition-all"
                style={{
                  backgroundColor: scoreType === v ? 'var(--color-accent)' : 'var(--color-surface)',
                  color: scoreType === v ? 'white' : 'var(--color-muted)',
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </TopBar>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Season stat cards */}
        {(view === 'season' || view === '1h' || view === '2h') && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Scoring Avg', value: seasonData[0]?.avgNet, sub: 'Best avg net' },
              { label: 'Best Round', value: seasonStats.lowGross.score, sub: seasonStats.lowGross.player?.name },
              { label: 'Total Birdies', value: seasonStats.totalBirdies, sub: 'All players' },
              { label: 'Total Eagles', value: seasonStats.totalEagles, sub: 'All players' },
            ].map((sc, i) => (
              <Card key={i}>
                <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>{sc.label}</div>
                <div className="text-3xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-primary)' }}>{sc.value}</div>
                {sc.sub && <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{sc.sub}</div>}
              </Card>
            ))}
          </div>
        )}

        {/* Round selector */}
        {view === 'round' && (
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Select Round:</label>
            <select
              value={selectedRoundId}
              onChange={e => setSelectedRoundId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border text-sm"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
            >
              {sortedRounds.map(r => {
                const c = courses.find(cc => cc.id === r.courseId);
                return (
                  <option key={r.id} value={r.id}>
                    {format(parseISO(r.date), 'MMM d, yyyy')} — {c?.name?.split('(')[0].trim() || 'Unknown'}
                  </option>
                );
              })}
            </select>
            {selectedCourse && (
              <Badge variant="default">{selectedCourse.name}</Badge>
            )}
          </div>
        )}

        {/* Teams view */}
        {view === 'teams' && (
          <div className="space-y-4">
            {teamStandingsData.length === 0 ? (
              <Card><p className="py-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>No teams configured yet. Set them up in the Teams section.</p></Card>
            ) : teamStandingsData.map((team, i) => (
              <Card key={team.id}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                      style={{ backgroundColor: team.color || 'var(--color-primary)', color: 'white' }}>
                      {team.initials || team.name.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-base" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)', fontSize: '18px' }}>{team.name}</h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs font-medium" style={{ color: '#16A34A' }}>{team.wins}W</span>
                        <span className="text-xs font-medium" style={{ color: 'var(--color-danger)' }}>{team.losses}L</span>
                        <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>{team.ties}T</span>
                        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>· avg net {team.avgNet || '—'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {i === 0 && <Badge variant="accent">Season Leader</Badge>}
                    {team.lowRound && (
                      <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                        Low round: <span className="font-medium" style={{ color: 'var(--color-text)' }}>{team.lowRound}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                  <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-muted)' }}>Contributors</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {team.contributors.map(c => (
                      <div key={c.player.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                          {c.player.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{c.player.name.split(' ')[0]}</div>
                          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{c.avgNet} avg</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Main table */}
        {view !== 'teams' && <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide w-10" style={{ color: 'var(--color-muted)' }}>#</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Player</th>
                  {(view === 'season' || view === '1h' || view === '2h') ? (
                    <>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Rounds</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Avg Gross</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Avg Net</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Stableford</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Eagles</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Birdies</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Gross</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>vs Par</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>HCP</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Net</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>vs Par</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Stableford</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, i) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3">
                      <span
                        className="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold"
                        style={{
                          backgroundColor: i === 0 ? 'rgba(184,151,42,0.2)' : i === 1 ? 'rgba(156,163,175,0.2)' : i === 2 ? 'rgba(180,83,9,0.2)' : 'transparent',
                          color: i === 0 ? 'var(--color-accent)' : i < 3 ? 'var(--color-muted)' : 'var(--color-muted)',
                        }}
                      >{i + 1}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                          {row.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="font-medium" style={{ color: 'var(--color-text)' }}>{row.name}</span>
                        {i === 0 && <Badge variant="accent">Leader</Badge>}
                      </div>
                    </td>
                    {(view === 'season' || view === '1h' || view === '2h') ? (
                      <>
                        <td className="px-3 py-3 text-center" style={{ color: 'var(--color-muted)' }}>{row.rounds}</td>
                        <td className="px-3 py-3 text-center" style={{ color: 'var(--color-text)' }}>{row.avgGross}</td>
                        <td className="px-3 py-3 text-center font-semibold" style={{ color: 'var(--color-primary)' }}>{row.avgNet}</td>
                        <td className="px-3 py-3 text-center" style={{ color: 'var(--color-text)' }}>{row.totalStab}</td>
                        <td className="px-3 py-3 text-center" style={{ color: row.eagles > 0 ? '#7C3AED' : 'var(--color-muted)' }}>{row.eagles}</td>
                        <td className="px-3 py-3 text-center" style={{ color: row.birdies > 0 ? '#16A34A' : 'var(--color-muted)' }}>{row.birdies}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-3 text-center" style={{ color: 'var(--color-text)' }}>{row.gross}</td>
                        <td className="px-3 py-3 text-center font-medium" style={{ color: vsParColor(row.vsParGross) }}>{vsParDisplay(row.vsParGross)}</td>
                        <td className="px-3 py-3 text-center" style={{ color: 'var(--color-muted)' }}>{row.playingHcp}</td>
                        <td className="px-3 py-3 text-center font-semibold" style={{ color: 'var(--color-primary)' }}>{row.net}</td>
                        <td className="px-3 py-3 text-center font-medium" style={{ color: vsParColor(row.vsParNet) }}>{vsParDisplay(row.vsParNet)}</td>
                        <td className="px-3 py-3 text-center" style={{ color: 'var(--color-text)' }}>{row.stableford}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>}
      </div>
    </div>
  );
}
