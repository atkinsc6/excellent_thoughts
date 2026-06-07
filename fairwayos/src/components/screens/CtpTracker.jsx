import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Target, Trophy, DollarSign } from 'lucide-react';
import { TopBar } from '../layout/TopBar';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';

export function CtpTracker({ players, rounds, courses, league }) {
  const ctpEntry = league?.ctpEntry ?? 5;
  const sortedRounds = useMemo(() => [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date)), [rounds]);

  // Season CTP leaderboard
  const seasonLeaderboard = useMemo(() => {
    const counts = {};
    const holes = {};
    rounds.forEach(r => {
      (r.ctpResults || []).forEach(ctp => {
        counts[ctp.winnerId] = (counts[ctp.winnerId] || 0) + 1;
        if (!holes[ctp.winnerId]) holes[ctp.winnerId] = [];
        const course = courses.find(c => c.id === r.courseId);
        holes[ctp.winnerId].push({
          date: r.date,
          hole: ctp.hole,
          distance: ctp.distance,
          course: course?.name?.split('(')[0].trim() || 'Unknown',
        });
      });
    });
    return players
      .filter(p => counts[p.id])
      .map(p => ({ player: p, wins: counts[p.id], holes: holes[p.id] || [] }))
      .sort((a, b) => b.wins - a.wins);
  }, [players, rounds, courses]);

  const totalCtpRounds = rounds.filter(r => r.ctpResults?.length > 0).length;
  const totalCtpWins = rounds.reduce((s, r) => s + (r.ctpResults?.length || 0), 0);
  const seasonCtpPot = totalCtpWins * ctpEntry;

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <TopBar title="CTP Tracker" subtitle="Closest to pin results" />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>Total CTP Holes</div>
            <div className="text-3xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-primary)' }}>{totalCtpWins}</div>
          </Card>
          <Card>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>Season Leader</div>
            <div className="text-2xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-accent)' }}>
              {seasonLeaderboard[0]?.player?.name?.split(' ')[0] || '—'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{seasonLeaderboard[0]?.wins || 0} wins</div>
          </Card>
          <Card>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>Rounds w/ CTP</div>
            <div className="text-3xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>{totalCtpRounds}</div>
          </Card>
          <Card>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Season CTP Pot</div>
              <DollarSign size={13} style={{ color: 'var(--color-accent)', opacity: 0.7 }} />
            </div>
            <div className="text-3xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-accent)' }}>${seasonCtpPot}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>${ctpEntry}/win</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Season Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle>Season CTP Leaderboard</CardTitle>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>${ctpEntry} per win</p>
            </CardHeader>
            {seasonLeaderboard.length === 0 ? (
              <p className="text-sm mt-2" style={{ color: 'var(--color-muted)' }}>No CTP results yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {seasonLeaderboard.map((entry, i) => (
                  <div key={entry.player.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: i === 0 ? 'rgba(184,151,42,0.06)' : 'var(--color-bg)' }}>
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: i === 0 ? 'var(--color-accent)' : 'rgba(107,114,128,0.15)', color: i === 0 ? 'var(--color-primary)' : 'var(--color-muted)' }}>
                        {i + 1}
                      </span>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                        {entry.player.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{entry.player.name}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.holes.map((h, hi) => (
                            <Badge key={hi} variant="default">
                              H{h.hole}{h.distance ? ` — ${h.distance}` : ''}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-accent)' }}>
                          {entry.wins}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-muted)' }}>wins</div>
                        <div className="text-sm font-semibold mt-0.5" style={{ color: '#16A34A' }}>${entry.wins * ctpEntry}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Round-by-round CTP results */}
          <Card>
            <CardHeader>
              <CardTitle>Round Results</CardTitle>
            </CardHeader>
            <div className="mt-3 space-y-3">
              {sortedRounds.map(r => {
                const course = courses.find(c => c.id === r.courseId);
                // Designated CTP holes for this round (round override or league default)
                const designatedHoles = r.ctpHoles || league?.ctpHoles || [];
                const ctpResults = r.ctpResults || [];
                const potPerHole = ctpEntry * r.playerIds.length;
                return (
                  <div key={r.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                          {format(parseISO(r.date), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                          {course?.name?.split('(')[0].trim()} · {r.playerIds.length} players · <span style={{ color: 'var(--color-accent)' }}>${potPerHole}/hole</span>
                        </div>
                      </div>
                      <Badge variant={ctpResults.length > 0 ? 'accent' : 'muted'}>
                        {ctpResults.length}/{designatedHoles.length} filled
                      </Badge>
                    </div>

                    {designatedHoles.length === 0 ? (
                      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>No CTP holes designated</p>
                    ) : (
                      <div className="space-y-1.5">
                        {designatedHoles.sort((a, b) => a - b).map(holeNum => {
                          const result = ctpResults.find(c => c.hole === holeNum);
                          const winner = result ? players.find(p => p.id === result.winnerId) : null;
                          return (
                            <div key={holeNum} className="flex items-center gap-3 py-1 px-2 rounded-lg"
                              style={{ backgroundColor: winner ? 'rgba(27,67,50,0.06)' : 'rgba(107,114,128,0.06)' }}>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <Target size={12} style={{ color: winner ? 'var(--color-primary)' : 'var(--color-border)' }} />
                                <span className="text-xs font-semibold w-14" style={{ color: 'var(--color-primary)' }}>Hole {holeNum}</span>
                              </div>
                              {winner ? (
                                <div className="flex items-center gap-1.5 flex-1">
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                                    style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-primary)' }}>
                                    {winner.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                  </div>
                                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{winner.name}</span>
                                  {result.distance && (
                                    <span className="text-xs ml-auto" style={{ color: 'var(--color-muted)' }}>{result.distance}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs flex-1" style={{ color: 'var(--color-muted)' }}>No winner recorded</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {sortedRounds.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No rounds yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
