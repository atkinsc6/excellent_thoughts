import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { DollarSign, TrendingUp, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TopBar } from '../layout/TopBar';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { seasonSkinsTotals, skinsSummary } from '../../utils/skins';

export function SkinsTracker({ players, rounds, courses, league }) {
  const [skinsType, setSkinsType] = useState('gross'); // 'gross' | 'net'

  const sortedRounds = useMemo(() => [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date)), [rounds]);

  // Season totals
  const seasonTotals = useMemo(() => {
    return players.map(p => {
      let total = 0;
      rounds.forEach(r => {
        const results = r.skinsResults || [];
        results.forEach(sr => {
          if (sr.winnerId === p.id) total += sr.pot;
        });
      });
      return { player: p, skins: total };
    }).sort((a, b) => b.skins - a.skins);
  }, [players, rounds]);

  const entryFee = league?.skinsEntry || 5;
  const playersPerRound = rounds[0]?.playerIds?.length || 8;
  const potPerSkin = entryFee;

  // Total carryovers still pending
  const lastRound = sortedRounds[0];
  const pendingCarryover = lastRound?.skinsResults
    ? lastRound.skinsResults.filter(s => s.carryover && !s.winnerId).length
    : 0;

  const playerName = (id) => players.find(p => p.id === id)?.name || 'Unknown';
  const playerInitials = (id) => {
    const name = playerName(id);
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };

  const chartData = seasonTotals.map(st => ({
    name: st.player.name.split(' ')[0],
    skins: st.skins,
    payout: st.skins * potPerSkin,
  }));

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <TopBar title="Skins Tracker" subtitle="Weekly skins results and season totals">
        <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          {['gross', 'net'].map(v => (
            <button
              key={v}
              onClick={() => setSkinsType(v)}
              className="px-4 py-1.5 text-sm font-medium capitalize transition-all"
              style={{
                backgroundColor: skinsType === v ? 'var(--color-primary)' : 'var(--color-surface)',
                color: skinsType === v ? 'white' : 'var(--color-muted)',
              }}
            >
              {v} Skins
            </button>
          ))}
        </div>
      </TopBar>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Rounds Played', value: rounds.length, icon: TrendingUp },
            { label: 'Total Skins Awarded', value: seasonTotals.reduce((s, t) => s + t.skins, 0), icon: Award },
            { label: 'Season Leader', value: seasonTotals[0]?.player?.name?.split(' ')[0] || '-', sub: `${seasonTotals[0]?.skins || 0} skins`, icon: Award },
            { label: 'Pending Carryover', value: pendingCarryover, sub: 'From last round', icon: DollarSign },
          ].map((sc, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{sc.label}</span>
                <sc.icon size={14} style={{ color: 'var(--color-accent)', opacity: 0.7 }} />
              </div>
              <div className="text-2xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>{sc.value}</div>
              {sc.sub && <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{sc.sub}</div>}
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Season Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle>Season Skins Leaderboard</CardTitle>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>${entryFee}/skin entry</p>
            </CardHeader>
            <div className="mt-3 space-y-2">
              {seasonTotals.map((st, i) => (
                <div key={st.player.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ backgroundColor: i === 0 ? 'rgba(184,151,42,0.08)' : 'var(--color-bg)' }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: i === 0 ? 'var(--color-accent)' : 'rgba(107,114,128,0.15)', color: i === 0 ? 'var(--color-primary)' : 'var(--color-muted)' }}>
                    {i + 1}
                  </span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                    {playerInitials(st.player.id)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{st.player.name}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-base" style={{ color: 'var(--color-accent)' }}>{st.skins}</div>
                    <div className="text-xs" style={{ color: 'var(--color-muted)' }}>skins</div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="font-semibold text-sm" style={{ color: '#16A34A' }}>${st.skins * potPerSkin}</div>
                    <div className="text-xs" style={{ color: 'var(--color-muted)' }}>est.</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Bar chart */}
          <Card>
            <CardHeader>
              <CardTitle>Skins Distribution</CardTitle>
            </CardHeader>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, border: '1px solid var(--color-border)', borderRadius: '8px' }}
                  formatter={(val, name) => [val, name === 'skins' ? 'Skins' : 'Payout ($)']}
                />
                <Bar dataKey="skins" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={index === 0 ? 'var(--color-accent)' : 'var(--color-primary)'} opacity={index === 0 ? 1 : 0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Weekly Results */}
        <div>
          <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>
            Round-by-Round Results
          </h2>
          <div className="space-y-4">
            {sortedRounds.map(r => {
              const course = courses.find(c => c.id === r.courseId);
              const skins = r.skinsResults || [];
              const winners = skins.filter(s => s.winnerId);
              const carryovers = skins.filter(s => !s.winnerId);

              return (
                <Card key={r.id}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold text-base" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>
                        {format(parseISO(r.date), 'MMMM d, yyyy')}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{course?.name}</div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="default">{winners.length} skin{winners.length !== 1 ? 's' : ''}</Badge>
                      {carryovers.length > 0 && (
                        <Badge variant="accent">{carryovers.length} carryover{carryovers.length !== 1 ? 's' : ''}</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {skins.map(s => {
                      const winner = s.winnerId ? players.find(p => p.id === s.winnerId) : null;
                      return (
                        <div
                          key={s.hole}
                          className="p-2 rounded-lg text-center border"
                          style={{
                            borderColor: s.winnerId ? 'var(--color-primary)' : s.carryover ? 'var(--color-accent)' : 'var(--color-border)',
                            backgroundColor: s.winnerId ? 'rgba(27,67,50,0.06)' : s.carryover ? 'rgba(184,151,42,0.06)' : 'var(--color-bg)',
                          }}
                        >
                          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>
                            Hole {s.hole}
                            {s.pot > 1 && <span className="ml-1 px-1 rounded text-xs font-bold" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-primary)' }}>×{s.pot}</span>}
                          </div>
                          {winner ? (
                            <div className="font-semibold text-xs" style={{ color: 'var(--color-primary)' }}>
                              {winner.name.split(' ')[0]}
                            </div>
                          ) : (
                            <div className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>Carry</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
