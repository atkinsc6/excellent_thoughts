import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Printer, Trophy, Target, DollarSign } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { calcSkins, skinsSummary } from '../../utils/skins';

function scoreStyle(gross, par) {
  if (!gross || !par) return {};
  const d = gross - par;
  if (d <= -2) return { outline: '2px solid #7C3AED', outlineOffset: '-2px', borderRadius: '4px' };
  if (d === -1) return { backgroundColor: 'rgba(22,163,74,0.15)' };
  if (d === 1)  return { backgroundColor: 'rgba(220,38,38,0.08)' };
  if (d >= 2)   return { backgroundColor: 'rgba(220,38,38,0.2)' };
  return {};
}

function SubtotalRow({ label, holes, playerScores, players, selectedPlayers }) {
  return (
    <tr style={{ backgroundColor: 'rgba(27,67,50,0.06)', fontWeight: 600 }}>
      <td className="px-3 py-2 sticky left-0 text-xs font-semibold" style={{ backgroundColor: 'rgba(27,67,50,0.06)', color: 'var(--color-primary)' }}>{label}</td>
      <td className="px-2 py-2 text-center text-xs" style={{ color: 'var(--color-primary)' }}>
        {holes.reduce((s, h) => s + (h?.par || 4), 0)}
      </td>
      <td className="px-2 py-2" />
      {selectedPlayers.map(p => {
        const ps = playerScores.find(s => s.playerId === p.id);
        const gross = holes.reduce((s, h, i) => s + (ps?.grossScores?.[h.number - 1] || 0), 0);
        const net = holes.reduce((s, h, i) => s + (ps?.netScores?.[h.number - 1] || 0), 0);
        return (
          <td key={p.id} className="px-2 py-2 text-center">
            <div className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{gross || '—'}</div>
            {gross > 0 && <div className="text-xs" style={{ color: 'var(--color-muted)' }}>({net})</div>}
          </td>
        );
      })}
    </tr>
  );
}

export function RoundViewer({ players, rounds, courses, league }) {
  const { roundId } = useParams();
  const navigate = useNavigate();

  const round = rounds.find(r => r.id === roundId);
  const course = round ? courses.find(c => c.id === round.courseId) : null;

  const selectedPlayers = useMemo(() => {
    if (!round) return [];
    return (round.playerIds || []).map(id => players.find(p => p.id === id)).filter(Boolean);
  }, [round, players]);

  const liveSkins = useMemo(() => {
    if (!course?.holes || !round?.scores?.length) return round?.skinsResults || [];
    const type = league?.skinsType === 'net' ? 'net' : 'gross';
    return calcSkins(course.holes, round.scores, type);
  }, [round, course, league]);

  const skinsMap = useMemo(() => skinsSummary(liveSkins), [liveSkins]);

  if (!round || !course) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center">
          <p className="text-base font-medium" style={{ color: 'var(--color-muted)' }}>Round not found.</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-sm underline" style={{ color: 'var(--color-primary)' }}>Go back</button>
        </div>
      </div>
    );
  }

  const front9 = course.holes.slice(0, 9);
  const back9  = course.holes.slice(9, 18);

  const playerName = (id) => players.find(p => p.id === id)?.name || 'Unknown';

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate(-1)}
              className="no-print mt-1 flex items-center gap-1.5 text-sm font-medium"
              style={{ color: 'var(--color-muted)' }}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>
                {course.name}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
                  {format(parseISO(round.date), 'MMMM d, yyyy')}
                </span>
                {round.format && round.format !== 'individual' && (
                  <Badge variant="accent">{round.format.replace('_', ' ')}</Badge>
                )}
                {round.finalized && <Badge variant="default">Finalized</Badge>}
              </div>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="no-print flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white flex-shrink-0"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Printer size={14} /> Print
          </button>
        </div>

        {/* Full scorecard */}
        <Card>
          <CardHeader><CardTitle>Full Scorecard</CardTitle></CardHeader>
          <div className="overflow-x-auto mt-3">
            <table className="text-xs" style={{ minWidth: `${200 + selectedPlayers.length * 80}px` }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                  <td className="px-3 py-2 font-medium sticky left-0" style={{ backgroundColor: 'var(--color-primary)', minWidth: '60px' }}>Hole</td>
                  <td className="px-2 py-2 text-center" style={{ minWidth: '36px' }}>Par</td>
                  <td className="px-2 py-2 text-center" style={{ minWidth: '36px' }}>SI</td>
                  {selectedPlayers.map(p => (
                    <td key={p.id} className="px-2 py-2 text-center font-medium" style={{ minWidth: '80px' }}>
                      {p.name.split(' ')[0]}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {course.holes.map((hole, i) => {
                  const skinsHole = liveSkins[i];
                  return (
                    <tr key={hole.number} style={{
                      borderBottom: '1px solid var(--color-border)',
                      backgroundColor: i === 8 ? 'rgba(27,67,50,0.04)' : i % 2 === 0 ? 'var(--color-surface)' : 'rgba(249,246,240,0.5)',
                    }}>
                      <td className="px-3 py-1.5 font-medium sticky left-0" style={{ backgroundColor: 'inherit', color: 'var(--color-text)' }}>
                        <div className="flex items-center gap-1">
                          {hole.number}
                          {skinsHole?.winnerId && <span className="text-xs" style={{ color: 'var(--color-accent)' }}>★</span>}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-center font-medium" style={{ color: 'var(--color-primary)' }}>{hole.par}</td>
                      <td className="px-2 py-1.5 text-center" style={{ color: 'var(--color-muted)' }}>{hole.strokeIndex}</td>
                      {selectedPlayers.map(p => {
                        const ps = round.scores?.find(s => s.playerId === p.id);
                        const gross = ps?.grossScores?.[i];
                        const net = ps?.netScores?.[i];
                        const stab = ps?.stablefordPoints?.[i];
                        return (
                          <td key={p.id} className="px-1 py-1 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span
                                className="w-8 h-6 inline-flex items-center justify-center rounded text-xs font-mono font-semibold"
                                style={gross ? scoreStyle(gross, hole.par) : {}}
                              >
                                {gross || '—'}
                              </span>
                              {gross > 0 && (
                                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                                  {net}{stab != null ? ` · ${stab}pt` : ''}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Front 9 subtotal */}
                <SubtotalRow label="Front 9" holes={front9} playerScores={round.scores || []} players={players} selectedPlayers={selectedPlayers} />

                {/* Back 9 subtotal */}
                <SubtotalRow label="Back 9" holes={back9} playerScores={round.scores || []} players={players} selectedPlayers={selectedPlayers} />

                {/* Total */}
                <tr style={{ backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 700 }}>
                  <td className="px-3 py-2 sticky left-0 text-sm" style={{ backgroundColor: 'var(--color-primary)' }}>Total</td>
                  <td className="px-2 py-2 text-center text-sm">{course.par}</td>
                  <td />
                  {selectedPlayers.map(p => {
                    const ps = round.scores?.find(s => s.playerId === p.id);
                    return (
                      <td key={p.id} className="px-2 py-2 text-center">
                        <div className="text-sm">{ps?.totalGross || '—'}</div>
                        {ps?.totalGross > 0 && <div className="text-xs opacity-70">({ps.totalNet})</div>}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          {/* Score legend */}
          <div className="flex items-center gap-3 mt-3 px-1 flex-wrap">
            {[
              { label: 'Eagle', style: { outline: '2px solid #7C3AED', outlineOffset: '-1px', borderRadius: '4px' } },
              { label: 'Birdie', style: { backgroundColor: 'rgba(22,163,74,0.15)' } },
              { label: 'Bogey', style: { backgroundColor: 'rgba(220,38,38,0.08)' } },
              { label: 'Dbl+', style: { backgroundColor: 'rgba(220,38,38,0.2)' } },
            ].map(({ label, style }) => (
              <div key={label} className="flex items-center gap-1">
                <span className="w-5 h-4 inline-block rounded text-xs" style={style} />
                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Summary table */}
        <Card>
          <CardHeader><CardTitle>Player Summary</CardTitle></CardHeader>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  {['Player', 'Gross', 'Net', 'Stableford', 'HCP', 'Skins', 'CTP'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...(round.scores || [])].sort((a, b) => a.totalNet - b.totalNet).map((ps, i) => {
                  const p = players.find(pl => pl.id === ps.playerId);
                  const skins = skinsMap[ps.playerId] || 0;
                  const ctpWins = (round.ctpResults || []).filter(c => c.winnerId === ps.playerId).length;
                  return (
                    <tr key={ps.playerId} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {i === 0 && <Trophy size={12} style={{ color: 'var(--color-accent)' }} />}
                          <span className="font-medium" style={{ color: 'var(--color-text)' }}>{p?.name || '?'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center" style={{ color: 'var(--color-muted)' }}>{ps.totalGross || '—'}</td>
                      <td className="px-3 py-2.5 text-center font-semibold" style={{ color: 'var(--color-primary)' }}>{ps.totalNet || '—'}</td>
                      <td className="px-3 py-2.5 text-center" style={{ color: 'var(--color-text)' }}>{ps.totalStableford}</td>
                      <td className="px-3 py-2.5 text-center" style={{ color: 'var(--color-muted)' }}>{ps.playingHandicap}</td>
                      <td className="px-3 py-2.5 text-center">
                        {skins > 0 ? <Badge variant="default">{skins}</Badge> : <span style={{ color: 'var(--color-muted)' }}>—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {ctpWins > 0 ? <Badge variant="accent">{ctpWins}</Badge> : <span style={{ color: 'var(--color-muted)' }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Skins panel */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign size={16} style={{ color: 'var(--color-accent)' }} />
                <CardTitle>Skins Results</CardTitle>
              </div>
            </CardHeader>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {liveSkins.map(s => {
                const winner = s.winnerId ? players.find(p => p.id === s.winnerId) : null;
                return (
                  <div key={s.hole} className="p-2 rounded-lg text-center border"
                    style={{
                      borderColor: s.winnerId ? 'var(--color-primary)' : s.carryover ? 'var(--color-accent)' : 'var(--color-border)',
                      backgroundColor: s.winnerId ? 'rgba(27,67,50,0.06)' : s.carryover ? 'rgba(184,151,42,0.06)' : 'var(--color-bg)',
                    }}>
                    <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--color-muted)' }}>
                      Hole {s.hole}
                      {s.pot > 1 && <span className="ml-1 px-1 rounded text-xs font-bold" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-primary)' }}>×{s.pot}</span>}
                    </div>
                    {winner ? (
                      <div className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>{winner.name.split(' ')[0]}</div>
                    ) : (
                      <div className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>Carry</div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* CTP panel */}
          {(round.ctpResults?.length > 0 || (round.ctpHoles || league?.ctpHoles || []).length > 0) && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target size={16} style={{ color: 'var(--color-accent)' }} />
                  <CardTitle>CTP Results</CardTitle>
                </div>
              </CardHeader>
              <div className="space-y-2 mt-3">
                {(round.ctpHoles || league?.ctpHoles || []).length > 0
                  ? (round.ctpHoles || league?.ctpHoles || []).sort((a, b) => a - b).map(holeNum => {
                      const result = (round.ctpResults || []).find(c => c.hole === holeNum);
                      const winner = result ? players.find(p => p.id === result.winnerId) : null;
                      return (
                        <div key={holeNum} className="flex items-center gap-3 py-1.5 px-2 rounded-lg"
                          style={{ backgroundColor: winner ? 'rgba(27,67,50,0.06)' : 'rgba(107,114,128,0.06)' }}>
                          <span className="text-xs font-semibold w-14" style={{ color: 'var(--color-primary)' }}>Hole {holeNum}</span>
                          {winner ? (
                            <>
                              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{winner.name}</span>
                              {result.distance && <span className="text-xs ml-auto" style={{ color: 'var(--color-muted)' }}>{result.distance}</span>}
                            </>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--color-muted)' }}>No winner recorded</span>
                          )}
                        </div>
                      );
                    })
                  : (round.ctpResults || []).map((ctp, idx) => {
                      const winner = players.find(p => p.id === ctp.winnerId);
                      return (
                        <div key={idx} className="flex items-center gap-3 py-1.5 px-2 rounded-lg" style={{ backgroundColor: 'rgba(27,67,50,0.06)' }}>
                          <span className="text-xs font-semibold w-14" style={{ color: 'var(--color-primary)' }}>Hole {ctp.hole}</span>
                          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{winner?.name || '?'}</span>
                          {ctp.distance && <span className="text-xs ml-auto" style={{ color: 'var(--color-muted)' }}>{ctp.distance}</span>}
                        </div>
                      );
                    })
                }
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
