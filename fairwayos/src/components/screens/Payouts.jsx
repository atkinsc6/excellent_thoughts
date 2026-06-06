import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { DollarSign, Trophy, Target, Download, TrendingUp, CalendarDays } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { seasonSkinsTotals, skinsSummary } from '../../utils/skins';

export function Payouts({ league, players, rounds, courses }) {
  const finalizedRounds = useMemo(() => rounds.filter(r => r.finalized), [rounds]);

  const skinsEntry = league?.skinsEntry || 5;

  const payoutRows = useMemo(() => {
    const skinsTotals = seasonSkinsTotals(finalizedRounds);
    const ctpCounts = {};
    finalizedRounds.forEach(r => {
      r.ctpResults?.forEach(c => {
        ctpCounts[c.winnerId] = (ctpCounts[c.winnerId] || 0) + 1;
      });
    });

    return players.map(p => {
      const playerRounds = finalizedRounds.filter(r => r.playerIds.includes(p.id));
      const skinsWon = skinsTotals[p.id] || 0;
      const ctpWins = ctpCounts[p.id] || 0;

      let skinsAmount = 0;
      finalizedRounds.forEach(r => {
        if (!r.skinsResults) return;
        const summary = skinsSummary(r.skinsResults);
        const skinsInRound = summary[p.id] || 0;
        skinsAmount += skinsInRound * skinsEntry * r.playerIds.length;
      });

      const ctpAmount = ctpWins * 5;
      const total = skinsAmount + ctpAmount;

      return {
        id: p.id,
        name: p.name,
        rounds: playerRounds.length,
        skinsWon,
        skinsAmount,
        ctpWins,
        ctpAmount,
        total,
      };
    }).sort((a, b) => b.total - a.total);
  }, [players, finalizedRounds, skinsEntry]);

  const totals = useMemo(() => {
    const skinsTotals = seasonSkinsTotals(finalizedRounds);
    const totalSkinsWon = Object.values(skinsTotals).reduce((s, v) => s + v, 0);
    const totalSkinsPot = payoutRows.reduce((s, r) => s + r.skinsAmount, 0);
    const totalCtpPot = payoutRows.reduce((s, r) => s + r.ctpAmount, 0);
    const totalPaidOut = totalSkinsPot + totalCtpPot;
    return { totalSkinsPot, totalCtpPot, totalPaidOut, totalSkinsWon };
  }, [payoutRows, finalizedRounds]);

  function exportCSV() {
    const headers = ['Player', 'Rounds', 'Skins Won', 'Skins $', 'CTP Wins', 'CTP $', 'Total $'];
    const rows = payoutRows.map(r => [r.name, r.rounds, r.skinsWon, r.skinsAmount, r.ctpWins, r.ctpAmount, r.total]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fairwayos-payouts-${new Date().getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statCards = [
    { label: 'Skins Pot', value: `$${totals.totalSkinsPot}`, icon: DollarSign },
    { label: 'CTP Pot', value: `$${totals.totalCtpPot}`, icon: Target },
    { label: 'Total Paid Out', value: `$${totals.totalPaidOut}`, icon: Trophy },
    { label: 'Rounds Finalized', value: finalizedRounds.length, icon: CalendarDays },
  ];

  if (finalizedRounds.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="p-6 max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>
            Payouts
          </h1>
          <Card>
            <div className="py-16 text-center">
              <DollarSign size={40} className="mx-auto mb-3" style={{ color: 'var(--color-border)' }} />
              <p className="text-base font-medium" style={{ color: 'var(--color-muted)' }}>No finalized rounds yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Finalize a round to track payouts.</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>
            Payouts
          </h1>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((sc, i) => (
            <Card key={i} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{sc.label}</span>
                <sc.icon size={14} style={{ color: 'var(--color-primary)', opacity: 0.6 }} />
              </div>
              <div className="text-2xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>
                {sc.value}
              </div>
            </Card>
          ))}
        </div>

        {/* Payout table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Season Payout Summary</CardTitle>
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>${skinsEntry}/skin</span>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  {['Rank', 'Player', 'Rounds', 'Skins', 'Skins $', 'CTP Wins', 'CTP $', 'Total'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payoutRows.map((row, i) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-3 py-2.5">
                      <span
                        className="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold"
                        style={{
                          backgroundColor: i < 3 ? 'rgba(184,151,42,0.15)' : 'transparent',
                          color: i < 3 ? 'var(--color-accent)' : 'var(--color-muted)',
                        }}
                      >
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
                    <td className="px-3 py-2.5 text-center" style={{ color: 'var(--color-muted)' }}>{row.skinsWon}</td>
                    <td className="px-3 py-2.5 text-center font-medium" style={{ color: row.skinsAmount > 0 ? 'var(--color-accent)' : 'var(--color-muted)' }}>
                      {row.skinsAmount > 0 ? `$${row.skinsAmount}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center" style={{ color: 'var(--color-muted)' }}>{row.ctpWins}</td>
                    <td className="px-3 py-2.5 text-center font-medium" style={{ color: row.ctpAmount > 0 ? 'var(--color-accent)' : 'var(--color-muted)' }}>
                      {row.ctpAmount > 0 ? `$${row.ctpAmount}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="font-bold text-base" style={{ color: row.total > 0 ? 'var(--color-primary)' : 'var(--color-muted)', fontFamily: 'Cormorant Garamond, serif' }}>
                        {row.total > 0 ? `$${row.total}` : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Round-by-round breakdown */}
        <Card>
          <CardHeader><CardTitle>Round-by-Round Breakdown</CardTitle></CardHeader>
          <div className="space-y-3">
            {[...finalizedRounds].sort((a, b) => new Date(b.date) - new Date(a.date)).map(r => {
              const course = courses.find(c => c.id === r.courseId);
              const skinsSummaryMap = skinsSummary(r.skinsResults || []);
              const skinsWinners = Object.entries(skinsSummaryMap)
                .map(([pid, count]) => ({ player: players.find(p => p.id === pid), count }))
                .filter(e => e.player);
              const netSorted = [...(r.scores || [])].sort((a, b) => a.totalNet - b.totalNet);
              const roundWinner = netSorted[0] ? players.find(p => p.id === netSorted[0].playerId) : null;

              return (
                <div key={r.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                        {course?.name || 'Unknown Course'}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                        {format(parseISO(r.date), 'MMM d, yyyy')} · {r.playerIds.length} players
                      </div>
                    </div>
                    <Badge variant="default">{format(parseISO(r.date), 'MMM d')}</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {roundWinner && (
                      <div className="flex items-center gap-1.5">
                        <Trophy size={11} style={{ color: 'var(--color-accent)' }} />
                        <span style={{ color: 'var(--color-muted)' }}>Low Net:</span>
                        <span className="font-medium" style={{ color: 'var(--color-text)' }}>{roundWinner.name} ({netSorted[0].totalNet})</span>
                      </div>
                    )}
                    {skinsWinners.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <DollarSign size={11} style={{ color: 'var(--color-accent)' }} />
                        <span style={{ color: 'var(--color-muted)' }}>Skins:</span>
                        <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                          {skinsWinners.map(e => `${e.player.name.split(' ')[0]} (${e.count})`).join(', ')}
                        </span>
                      </div>
                    )}
                    {r.ctpResults?.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Target size={11} style={{ color: 'var(--color-accent)' }} />
                        <span style={{ color: 'var(--color-muted)' }}>CTP:</span>
                        <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                          {r.ctpResults.map(c => {
                            const p = players.find(pl => pl.id === c.winnerId);
                            return `H${c.hole} ${p?.name?.split(' ')[0] || '?'}`;
                          }).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
