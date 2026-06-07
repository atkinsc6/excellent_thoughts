import { useMemo } from 'react';
import { calcMatchPlay } from '../../utils/scoring';

function ResultCell({ result }) {
  const style = result === 'W'
    ? { backgroundColor: 'rgba(22,163,74,0.15)', color: '#16a34a', fontWeight: 700 }
    : result === 'L'
    ? { backgroundColor: 'rgba(220,38,38,0.1)', color: 'var(--color-danger)', fontWeight: 700 }
    : result === 'H'
    ? { backgroundColor: 'rgba(107,114,128,0.08)', color: 'var(--color-muted)' }
    : {};
  return (
    <td className="px-1 py-1 text-center">
      <span className="inline-flex w-7 h-6 items-center justify-center rounded text-xs" style={style}>
        {result ?? '—'}
      </span>
    </td>
  );
}

function MatchStatusBadge({ status, p1Name, p2Name }) {
  if (!status.thru) return <span className="text-xs opacity-50">Not started</span>;
  if (status.concluded) {
    const msg = status.conclusion === 'all_square'
      ? 'All Square'
      : `${status.leader === 'player1' ? p1Name : p2Name} wins ${status.conclusion}`;
    return (
      <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: 'rgba(184,151,42,0.25)', color: 'var(--color-accent)' }}>
        {msg}
      </span>
    );
  }
  if (status.leader === 'tied') return <span className="text-xs opacity-70">All Square thru {status.thru}</span>;
  const leaderName = status.leader === 'player1' ? p1Name : p2Name;
  return (
    <span className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>
      {leaderName} {status.margin} UP thru {status.thru}
    </span>
  );
}

function PairScorecard({ pair, selectedPlayers, course, grossScores, setGross, getNetScores }) {
  const p1 = selectedPlayers.find(p => p.id === pair.player1Id);
  const p2 = selectedPlayers.find(p => p.id === pair.player2Id);
  const p1Net = getNetScores(p1?.id);
  const p2Net = getNetScores(p2?.id);
  const { holeResults, runningStatus } = useMemo(() => calcMatchPlay(p1Net, p2Net), [p1Net, p2Net]);

  if (!p1 || !p2) return null;
  const p1First = p1.name.split(' ')[0];
  const p2First = p2.name.split(' ')[0];

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
      {/* Match header */}
      <div className="flex items-center justify-between px-4 py-3 flex-wrap gap-2" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">{p1First}</span>
          <span className="text-xs opacity-60">vs</span>
          <span className="font-semibold text-sm">{p2First}</span>
        </div>
        <MatchStatusBadge status={runningStatus} p1Name={p1First} p2Name={p2First} />
      </div>

      {/* Scorecard table */}
      <div className="overflow-x-auto">
        <table className="text-xs w-full" style={{ minWidth: '480px' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(27,67,50,0.06)' }}>
              <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--color-muted)', minWidth: '40px' }}>Hole</th>
              <th className="px-2 py-2 text-center font-semibold" style={{ color: 'var(--color-muted)' }}>Par</th>
              <th className="px-2 py-2 text-center font-semibold" style={{ color: 'var(--color-muted)' }}>SI</th>
              <th className="px-2 py-2 text-center font-semibold" style={{ color: 'var(--color-primary)', minWidth: '70px' }}>{p1First}</th>
              <th className="px-2 py-2 text-center font-semibold" style={{ color: 'var(--color-muted)', minWidth: '50px' }}>Result</th>
              <th className="px-2 py-2 text-center font-semibold" style={{ color: 'var(--color-primary)', minWidth: '70px' }}>{p2First}</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 18 }, (_, i) => {
              const hole = course.holes?.[i];
              const result = holeResults[i];
              const p1Gross = grossScores[p1.id]?.[i] || '';
              const p2Gross = grossScores[p2.id]?.[i] || '';
              const pastConclusion = runningStatus.concluded && i >= runningStatus.thru;
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: pastConclusion ? 'transparent' : i % 2 === 0 ? 'var(--color-surface)' : 'rgba(249,246,240,0.5)', opacity: pastConclusion ? 0.35 : 1 }}>
                  <td className="px-3 py-1.5 font-medium" style={{ color: 'var(--color-text)' }}>{i + 1}</td>
                  <td className="px-2 py-1.5 text-center font-medium" style={{ color: 'var(--color-primary)' }}>{hole?.par || 4}</td>
                  <td className="px-2 py-1.5 text-center" style={{ color: 'var(--color-muted)' }}>{hole?.strokeIndex || i + 1}</td>
                  <td className="px-1 py-1 text-center">
                    <input
                      type="number" min="1" max="20" value={p1Gross}
                      onChange={e => setGross(p1.id, i, e.target.value)}
                      disabled={pastConclusion}
                      className="w-10 text-center rounded border py-0.5 text-xs font-mono"
                      style={{ borderColor: result === 'W' ? '#16a34a' : 'var(--color-border)', backgroundColor: result === 'W' ? 'rgba(22,163,74,0.08)' : 'transparent', color: 'var(--color-text)' }}
                    />
                  </td>
                  <ResultCell result={result} />
                  <td className="px-1 py-1 text-center">
                    <input
                      type="number" min="1" max="20" value={p2Gross}
                      onChange={e => setGross(p2.id, i, e.target.value)}
                      disabled={pastConclusion}
                      className="w-10 text-center rounded border py-0.5 text-xs font-mono"
                      style={{ borderColor: result === 'L' ? '#16a34a' : 'var(--color-border)', backgroundColor: result === 'L' ? 'rgba(22,163,74,0.08)' : 'transparent', color: 'var(--color-text)' }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MatchPlayScorecard(props) {
  return (
    <div className="space-y-6">
      {props.pairs.map((pair, pi) => (
        <PairScorecard key={pi} pair={pair} {...props} />
      ))}
    </div>
  );
}
