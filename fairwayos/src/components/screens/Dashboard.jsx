import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, TrendingDown, DollarSign, Target, CalendarDays, Medal, Users2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useHandicap } from '../../hooks/useHandicap';
import { seasonSkinsTotals } from '../../utils/skins';
import { partitionRoundsByHalf } from '../../utils/scoring';

const PLAYER_COLORS = ['#1B4332','#B8972A','#2D6A4F','#DC2626','#7C3AED','#0284C7','#D97706','#059669'];

const ACTIVITY_ICONS = {
  round_finalized: '🏌️', skin_recorded: '💰', ctp_recorded: '🎯',
  member_joined: '👤', handicap_updated: '📊', round_unlocked: '🔓',
  settings_updated: '⚙️', team_created: '👥', league_created: '🏆',
};

export function Dashboard({ league, players, rounds, courses, teams = [], activity = [], schedule = [] }) {
  const { getDifferentials, getHandicapTrend } = useHandicap(players, rounds, courses);

  const stats = useMemo(() => {
    if (!rounds.length) return null;
    let lowGross = { score: Infinity, player: null, round: null };
    let lowNet = { score: Infinity, player: null, round: null };
    const skinsTotals = seasonSkinsTotals(rounds);
    let ctpLeader = { playerId: null, count: 0 };

    rounds.forEach(r => {
      r.scores?.forEach(ps => {
        if (ps.totalGross < lowGross.score) {
          lowGross = { score: ps.totalGross, player: players.find(p => p.id === ps.playerId), round: r };
        }
        if (ps.totalNet < lowNet.score) {
          lowNet = { score: ps.totalNet, player: players.find(p => p.id === ps.playerId), round: r };
        }
      });
      r.ctpResults?.forEach(ctp => {
        // tally ctp
      });
    });

    // CTP leader
    const ctpCounts = {};
    rounds.forEach(r => r.ctpResults?.forEach(c => { ctpCounts[c.winnerId] = (ctpCounts[c.winnerId] || 0) + 1; }));
    const topCtp = Object.entries(ctpCounts).sort((a, b) => b[1] - a[1])[0];
    if (topCtp) {
      ctpLeader = { player: players.find(p => p.id === topCtp[0]), count: topCtp[1] };
    }

    const totalSkinsPot = Object.values(skinsTotals).reduce((s, v) => s + v, 0) * (league?.skinsEntry || 5);
    const topSkinsPlayer = Object.entries(skinsTotals).sort((a, b) => b[1] - a[1])[0];

    return { lowGross, lowNet, totalSkinsPot, ctpLeader, skinsTotals, topSkinsPlayer };
  }, [rounds, players, league]);

  // Standings: sorted by avg net
  const standings = useMemo(() => {
    return players.map(p => {
      const playerRounds = rounds.filter(r => r.playerIds.includes(p.id));
      const totalGross = playerRounds.reduce((s, r) => {
        const ps = r.scores?.find(sc => sc.playerId === p.id);
        return s + (ps?.totalGross || 0);
      }, 0);
      const totalNet = playerRounds.reduce((s, r) => {
        const ps = r.scores?.find(sc => sc.playerId === p.id);
        return s + (ps?.totalNet || 0);
      }, 0);
      const skins = (stats?.skinsTotals || {})[p.id] || 0;
      const n = playerRounds.length;

      // Points: rank in each round by net score, award points
      let points = 0;
      rounds.forEach(r => {
        if (!r.playerIds.includes(p.id)) return;
        const sorted = [...(r.scores || [])].sort((a, b) => a.totalNet - b.totalNet);
        const rank = sorted.findIndex(s => s.playerId === p.id) + 1;
        const pts = league?.pointsTable?.find(pt => pt.place === rank)?.points || 0;
        points += pts;
      });

      return {
        id: p.id,
        name: p.name,
        rounds: n,
        avgGross: n ? Math.round(totalGross / n * 10) / 10 : 0,
        avgNet: n ? Math.round(totalNet / n * 10) / 10 : 0,
        points,
        skins,
      };
    }).sort((a, b) => b.points - a.points || a.avgNet - b.avgNet);
  }, [players, rounds, stats, league]);

  // Season halves
  const { firstHalf, secondHalf } = useMemo(() =>
    partitionRoundsByHalf(rounds, league?.halvesBreakpoint)
  , [rounds, league]);

  const buildHalfStandings = (roundSubset) =>
    players.map(p => {
      const pr = roundSubset.filter(r => r.playerIds.includes(p.id));
      const totalNet = pr.reduce((s, r) => s + (r.scores?.find(sc => sc.playerId === p.id)?.totalNet || 0), 0);
      let points = 0;
      roundSubset.forEach(r => {
        if (!r.playerIds.includes(p.id)) return;
        const sorted = [...(r.scores || [])].sort((a, b) => a.totalNet - b.totalNet);
        const rank = sorted.findIndex(s => s.playerId === p.id) + 1;
        const pts = league?.pointsTable?.find(pt => pt.place === rank)?.points || 0;
        points += pts;
      });
      return { id: p.id, name: p.name, rounds: pr.length, avgNet: pr.length ? Math.round(totalNet / pr.length * 10) / 10 : 0, points };
    }).filter(r => r.rounds > 0).sort((a, b) => b.points - a.points || a.avgNet - b.avgNet);

  const firstHalfStandings = useMemo(() => buildHalfStandings(firstHalf), [firstHalf, players, league]);
  const secondHalfStandings = useMemo(() => buildHalfStandings(secondHalf), [secondHalf, players, league]);

  // Recent round
  const recentRound = useMemo(() => {
    if (!rounds.length) return null;
    const r = [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const course = courses.find(c => c.id === r.courseId);
    const top3 = [...(r.scores || [])].sort((a, b) => a.totalNet - b.totalNet).slice(0, 3).map(ps => ({
      player: players.find(p => p.id === ps.playerId),
      gross: ps.totalGross,
      net: ps.totalNet,
    }));
    return { ...r, courseName: course?.name, top3 };
  }, [rounds, courses, players]);

  // Handicap trend: use getHandicapTrend per player
  const hcpTrendData = useMemo(() => {
    const trackedPlayers = players.slice(0, 3);
    const allPoints = {};
    trackedPlayers.forEach(p => {
      const trend = getHandicapTrend(p.id);
      trend.forEach(pt => {
        if (!allPoints[pt.date]) allPoints[pt.date] = { date: format(parseISO(pt.date), 'MMM d') };
        allPoints[pt.date][p.id] = pt.index;
      });
    });
    return Object.values(allPoints).sort((a, b) => a.date.localeCompare(b.date));
  }, [players, getHandicapTrend]);

  // Team standings
  const teamStandings = useMemo(() => {
    if (!teams.length) return [];
    return teams.map(team => {
      let wins = 0, losses = 0, ties = 0, totalNet = 0, roundCount = 0;
      rounds.forEach(r => {
        const teamScores = team.playerIds
          .map(pid => r.scores?.find(s => s.playerId === pid))
          .filter(Boolean);
        if (!teamScores.length) return;
        const teamBest = Math.min(...teamScores.map(s => s.totalNet));
        totalNet += teamBest;
        roundCount++;
        const otherTeams = teams.filter(t => t.id !== team.id);
        otherTeams.forEach(opp => {
          const oppScores = opp.playerIds
            .map(pid => r.scores?.find(s => s.playerId === pid))
            .filter(Boolean);
          if (!oppScores.length) return;
          const oppBest = Math.min(...oppScores.map(s => s.totalNet));
          if (teamBest < oppBest) wins++;
          else if (teamBest > oppBest) losses++;
          else ties++;
        });
      });
      return {
        ...team,
        wins, losses, ties,
        avgNet: roundCount ? Math.round(totalNet / roundCount * 10) / 10 : 0,
        roundCount,
      };
    }).sort((a, b) => b.wins - a.wins || a.avgNet - b.avgNet);
  }, [teams, rounds]);

  // Upcoming event — derived from schedule
  const todayStr = new Date().toISOString().slice(0, 10);
  const nextEvent = useMemo(() =>
    [...(schedule || [])].filter(e => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date))[0] || null
  , [schedule, todayStr]);

  const statCards = [
    {
      label: 'Rounds Played',
      value: rounds.length,
      icon: CalendarDays,
      color: 'var(--color-primary)',
    },
    {
      label: 'Low Gross',
      value: stats?.lowGross.score || '-',
      sub: stats?.lowGross.player?.name || '',
      icon: TrendingDown,
      color: 'var(--color-primary)',
    },
    {
      label: 'Low Net',
      value: stats?.lowNet.score || '-',
      sub: stats?.lowNet.player?.name || '',
      icon: Medal,
      color: 'var(--color-accent)',
    },
    {
      label: 'Skins Pot',
      value: `$${stats?.totalSkinsPot || 0}`,
      icon: DollarSign,
      color: 'var(--color-accent)',
    },
    {
      label: 'CTP Leader',
      value: stats?.ctpLeader?.player?.name?.split(' ')[0] || '-',
      sub: stats?.ctpLeader?.count ? `${stats.ctpLeader.count} wins` : '',
      icon: Target,
      color: 'var(--color-primary)',
    },
  ];

  const medalColors = ['var(--color-accent)', '#9CA3AF', '#B45309'];
  const medalLabels = ['1st', '2nd', '3rd'];

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Season Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statCards.map((sc, i) => (
            <Card key={i} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
                  {sc.label}
                </span>
                <sc.icon size={15} style={{ color: sc.color, opacity: 0.7 }} />
              </div>
              <div className="text-2xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>
                {sc.value}
              </div>
              {sc.sub && <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{sc.sub}</div>}
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Round Card */}
          {recentRound && (
            <Card className="lg:col-span-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Most Recent Round</CardTitle>
                  <Badge variant="default">{format(parseISO(recentRound.date), 'MMM d')}</Badge>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{recentRound.courseName}</p>
              </CardHeader>
              <div className="space-y-2 mt-3">
                {recentRound.top3.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: medalColors[i], color: i === 0 ? 'var(--color-primary)' : 'white' }}>
                      {medalLabels[i]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate" style={{ color: 'var(--color-text)' }}>
                        {entry.player?.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{entry.net} net</div>
                      <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{entry.gross} gross</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Upcoming Event */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Next Event</CardTitle>
            </CardHeader>
            {nextEvent ? (
              <div className="flex items-start gap-4 mt-2">
                <div className="rounded-xl p-3 flex-shrink-0" style={{ backgroundColor: 'rgba(27,67,50,0.08)' }}>
                  <CalendarDays size={24} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                  <div className="font-semibold text-base" style={{ color: 'var(--color-text)', fontFamily: 'Cormorant Garamond, serif' }}>
                    {nextEvent.name}
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {format(parseISO(nextEvent.date), 'MMMM d, yyyy')}
                  </div>
                  {nextEvent.courseId && (
                    <div className="text-sm mt-1" style={{ color: 'var(--color-text)' }}>
                      {courses.find(c => c.id === nextEvent.courseId)?.name || ''}
                    </div>
                  )}
                  {nextEvent.notes && (
                    <div className="mt-1 text-xs" style={{ color: 'var(--color-muted)' }}>{nextEvent.notes}</div>
                  )}
                  {nextEvent.format && nextEvent.format !== 'individual' && (
                    <div className="mt-2">
                      <Badge variant="accent">{nextEvent.format.replace('_', ' ')}</Badge>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 mt-4 text-sm" style={{ color: 'var(--color-muted)' }}>
                <CalendarDays size={20} style={{ opacity: 0.4 }} />
                No upcoming events. Add one in Schedule.
              </div>
            )}
          </Card>

          {/* Handicap Trend */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Handicap Trend</CardTitle>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Top 3 players, last 6 rounds</p>
            </CardHeader>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={hcpTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted)' }} />
                <Tooltip contentStyle={{ fontSize: 11, border: '1px solid var(--color-border)' }} />
                {players.slice(0, 3).map((p, i) => (
                  <Line
                    key={p.id}
                    type="monotone"
                    dataKey={p.id}
                    name={p.name.split(' ')[0]}
                    stroke={PLAYER_COLORS[i]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Standings Table + Team Standings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Season Standings</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    {['Rank', 'Player', 'Rounds', 'Avg Gross', 'Avg Net', 'Points', 'Skins'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, i) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5">
                        <span className="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold"
                          style={{
                            backgroundColor: i < 3 ? 'rgba(184,151,42,0.15)' : 'transparent',
                            color: i < 3 ? 'var(--color-accent)' : 'var(--color-muted)',
                          }}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                            {row.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="font-medium" style={{ color: 'var(--color-text)' }}>{row.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center" style={{ color: 'var(--color-muted)' }}>{row.rounds}</td>
                      <td className="px-3 py-2.5 text-center" style={{ color: 'var(--color-text)' }}>{row.avgGross}</td>
                      <td className="px-3 py-2.5 text-center font-medium" style={{ color: 'var(--color-primary)' }}>{row.avgNet}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="font-bold" style={{ color: 'var(--color-accent)' }}>{row.points}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center" style={{ color: 'var(--color-muted)' }}>{row.skins}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-4">
            {/* Team Standings */}
            {teamStandings.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users2 size={16} style={{ color: 'var(--color-primary)' }} />
                    <CardTitle>Team Standings</CardTitle>
                  </div>
                </CardHeader>
                <div className="space-y-3 mt-1">
                  {teamStandings.map((team, i) => (
                    <div key={team.id} className="p-3 rounded-lg" style={{ backgroundColor: i === 0 ? 'rgba(184,151,42,0.06)' : 'var(--color-bg)', border: `1px solid ${i === 0 ? 'var(--color-accent)' : 'var(--color-border)'}` }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: team.color || 'var(--color-primary)', color: 'white' }}>
                          {team.initials || team.name.slice(0, 2)}
                        </div>
                        <span className="font-semibold text-sm" style={{ color: 'var(--color-text)', fontFamily: 'Cormorant Garamond, serif', fontSize: '15px' }}>{team.name}</span>
                        {i === 0 && <Badge variant="accent">Leader</Badge>}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-base font-bold" style={{ color: '#16A34A' }}>{team.wins}</div>
                          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>W</div>
                        </div>
                        <div>
                          <div className="text-base font-bold" style={{ color: 'var(--color-danger)' }}>{team.losses}</div>
                          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>L</div>
                        </div>
                        <div>
                          <div className="text-base font-bold" style={{ color: 'var(--color-muted)' }}>{team.ties}</div>
                          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>T</div>
                        </div>
                      </div>
                      <div className="mt-1.5 text-xs text-center" style={{ color: 'var(--color-muted)' }}>
                        Avg net {team.avgNet || '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              {activity.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--color-muted)' }}>No activity yet.</p>
              ) : (
                <div className="space-y-2 mt-1">
                  {activity.slice(0, 6).map(evt => (
                    <div key={evt.id} className="flex items-start gap-2.5 py-1.5">
                      <span className="text-sm flex-shrink-0 mt-0.5">{ACTIVITY_ICONS[evt.type] || '📋'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-snug" style={{ color: 'var(--color-text)' }}>{evt.description}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                          {new Date(evt.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
        {/* Season Halves */}
        {league?.splitIntoHalves && (
          <Card>
            <CardHeader><CardTitle>Season Halves</CardTitle></CardHeader>
            <div className="grid grid-cols-2 gap-4 mt-3">
              {[
                { label: '1st Half', data: firstHalfStandings, rounds: firstHalf.length },
                { label: '2nd Half', data: secondHalfStandings, rounds: secondHalf.length },
              ].map(half => (
                <div key={half.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{half.label}</span>
                    <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{half.rounds} round{half.rounds !== 1 ? 's' : ''}</span>
                  </div>
                  {half.data.length === 0 ? (
                    <p className="text-xs py-4 text-center" style={{ color: 'var(--color-muted)' }}>No rounds yet</p>
                  ) : (
                    <div className="space-y-1.5">
                      {half.data.slice(0, 5).map((row, i) => (
                        <div key={row.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg"
                          style={{ backgroundColor: i === 0 ? 'rgba(184,151,42,0.08)' : 'var(--color-bg)' }}>
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: i === 0 ? 'var(--color-accent)' : 'rgba(107,114,128,0.12)', color: i === 0 ? 'var(--color-primary)' : 'var(--color-muted)' }}>
                            {i + 1}
                          </span>
                          <span className="flex-1 text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{row.name.split(' ')[0]}</span>
                          <span className="text-xs font-bold" style={{ color: 'var(--color-accent)' }}>{row.points}pt</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
