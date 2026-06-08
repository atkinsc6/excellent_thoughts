import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { X, Copy, Check, Trophy, DollarSign, Target, Star, Share2 } from 'lucide-react';
import { skinsSummary } from '../../utils/skins';

function scoreStyle(gross, par) {
  if (!gross || !par) return {};
  const d = gross - par;
  if (d <= -2) return { outline: '2px solid #7C3AED', outlineOffset: '-1px', borderRadius: '4px' };
  if (d === -1) return { backgroundColor: 'rgba(22,163,74,0.18)' };
  if (d === 1)  return { backgroundColor: 'rgba(220,38,38,0.08)' };
  if (d >= 2)   return { backgroundColor: 'rgba(220,38,38,0.2)' };
  return {};
}

export function RoundRecapModal({ round, course, players, league, onClose }) {
  const [copied, setCopied] = useState(false);

  const leaderboard = useMemo(() => {
    return [...(round?.scores || [])]
      .filter(ps => ps.totalNet > 0)
      .sort((a, b) => a.totalNet - b.totalNet)
      .map((ps, i) => ({
        ...ps,
        name: players.find(p => p.id === ps.playerId)?.name || '?',
        rank: i + 1,
      }));
  }, [round, players]);

  const skinsMap = useMemo(() => skinsSummary(round?.skinsResults || []), [round]);

  const highlights = useMemo(() => {
    let eagles = 0, birdies = 0, aces = 0;
    const holes = course?.holes || [];
    for (const ps of round?.scores || []) {
      (ps.grossScores || []).forEach((g, i) => {
        if (!g) return;
        const par = holes[i]?.par ?? 4;
        if (g === 1) aces++;
        else if (g <= par - 2) eagles++;
        else if (g < par) birdies++;
      });
    }
    return { eagles, birdies, aces };
  }, [round, course]);

  const buildShareText = () => {
    const dateStr = round.date ? format(parseISO(round.date), 'MMMM d, yyyy') : 'Today';
    const lines = [
      `⛳ ${course?.name || 'Round'} — ${dateStr}`,
      '━━━━━━━━━━━━━━━━━━━━',
      '🏆 Results:',
      ...leaderboard.slice(0, 8).map(r => {
        const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `  ${r.rank}.`;
        return `  ${medal} ${r.name} — ${r.totalGross} gross (net ${r.totalNet})`;
      }),
    ];

    const skinsWinners = Object.entries(skinsMap);
    if (skinsWinners.length > 0) {
      lines.push('');
      lines.push('💰 Skins:');
      skinsWinners.forEach(([pid, count]) => {
        const p = players.find(pl => pl.id === pid);
        const dollars = count * (league?.skinsEntry || 5) * (round.playerIds?.length || 1);
        lines.push(`  ${p?.name || '?'}: ${count} skin${count > 1 ? 's' : ''} ($${dollars})`);
      });
    }

    const ctpResults = round.ctpResults?.filter(c => c.winnerId) || [];
    if (ctpResults.length > 0) {
      lines.push('');
      lines.push('📍 CTP:');
      ctpResults.forEach(c => {
        const p = players.find(pl => pl.id === c.winnerId);
        lines.push(`  Hole ${c.hole}: ${p?.name || '?'}${c.distance ? ` (${c.distance})` : ''}`);
      });
    }

    const hl = [];
    if (highlights.aces > 0) hl.push(`${highlights.aces} ACE${highlights.aces > 1 ? 'S' : ''}!`);
    if (highlights.eagles > 0) hl.push(`${highlights.eagles} eagle${highlights.eagles > 1 ? 's' : ''}`);
    if (highlights.birdies > 0) hl.push(`${highlights.birdies} birdie${highlights.birdies > 1 ? 's' : ''}`);
    if (hl.length > 0) {
      lines.push('');
      lines.push(`⭐ Highlights: ${hl.join(', ')}`);
    }

    if (round.notes) {
      lines.push('');
      lines.push(`📝 ${round.notes}`);
    }

    return lines.join('\n');
  };

  const handleCopy = () => {
    const text = buildShareText();
    if (navigator.share) {
      navigator.share({ title: `Round Recap — ${course?.name || 'Golf'}`, text }).catch(() => {
        navigator.clipboard?.writeText(text);
      });
    } else {
      navigator.clipboard?.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  if (!round) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl" style={{ backgroundColor: 'var(--color-surface)' }}>

        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 flex items-start justify-between"
          style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #2D6A4F 100%)', color: 'white' }}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-0.5">Round Complete</div>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              {course?.name || 'Round Recap'}
            </h2>
            <div className="text-xs opacity-70 mt-0.5">
              {round.date ? format(parseISO(round.date), 'MMMM d, yyyy') : ''} · {round.playerIds?.length || 0} players
            </div>
          </div>
          <button onClick={onClose} className="ml-4 opacity-60 hover:opacity-100 flex-shrink-0"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Leaderboard */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={14} style={{ color: 'var(--color-accent)' }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Leaderboard</span>
            </div>
            <div className="space-y-1.5">
              {leaderboard.map((row, i) => (
                <div key={row.playerId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ backgroundColor: i === 0 ? 'rgba(184,151,42,0.1)' : i === 1 ? 'rgba(156,163,175,0.08)' : i === 2 ? 'rgba(180,83,9,0.08)' : 'var(--color-bg)', border: i < 3 ? '1px solid' : 'none', borderColor: i === 0 ? 'rgba(184,151,42,0.3)' : i === 1 ? 'rgba(156,163,175,0.2)' : 'rgba(180,83,9,0.2)' }}>
                  <span className="text-lg w-8 text-center">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-sm font-medium" style={{ color: 'var(--color-muted)' }}>{i + 1}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{row.name}</div>
                    <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      HCP {row.playingHandicap} · Gross {row.totalGross}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: i === 0 ? 'var(--color-accent)' : 'var(--color-primary)' }}>
                      {row.totalNet}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-muted)' }}>net</div>
                  </div>
                  {skinsMap[row.playerId] > 0 && (
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: 'rgba(184,151,42,0.15)', color: 'var(--color-accent)' }}>
                      <DollarSign size={10} /> {skinsMap[row.playerId]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Highlights row */}
          {(highlights.eagles > 0 || highlights.birdies > 0 || highlights.aces > 0) && (
            <div className="flex gap-2 flex-wrap">
              {highlights.aces > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: 'rgba(124,58,237,0.15)', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.3)' }}>
                  🎯 {highlights.aces} Ace{highlights.aces > 1 ? 's' : ''}!
                </div>
              )}
              {highlights.eagles > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: 'rgba(22,163,74,0.12)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)' }}>
                  🦅 {highlights.eagles} Eagle{highlights.eagles > 1 ? 's' : ''}
                </div>
              )}
              {highlights.birdies > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: 'rgba(22,163,74,0.07)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.12)' }}>
                  🐦 {highlights.birdies} Birdie{highlights.birdies > 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}

          {/* CTP Results */}
          {(round.ctpResults?.filter(c => c.winnerId) || []).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target size={14} style={{ color: 'var(--color-accent)' }} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>CTP</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {round.ctpResults.filter(c => c.winnerId).map(c => {
                  const p = players.find(pl => pl.id === c.winnerId);
                  return (
                    <div key={c.hole} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ backgroundColor: 'rgba(184,151,42,0.1)', color: 'var(--color-text)', border: '1px solid rgba(184,151,42,0.2)' }}>
                      <span style={{ color: 'var(--color-muted)' }}>Hole {c.hole}</span>
                      <span className="font-semibold">{p?.name?.split(' ')[0] || '?'}</span>
                      {c.distance && <span style={{ color: 'var(--color-muted)' }}>{c.distance}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Round notes */}
          {round.notes && (
            <div className="px-4 py-3 rounded-xl italic text-sm" style={{ backgroundColor: 'rgba(27,67,50,0.05)', borderLeft: '3px solid var(--color-primary)', color: 'var(--color-text)' }}>
              "{round.notes}"
            </div>
          )}

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{ backgroundColor: copied ? 'rgba(22,163,74,0.12)' : 'var(--color-primary)', color: copied ? '#16a34a' : 'white' }}>
            {copied ? <><Check size={15} /> Copied!</> : navigator.share ? <><Share2 size={15} /> Share Recap</> : <><Copy size={15} /> Copy Recap for Group Chat</>}
          </button>
        </div>
      </div>
    </div>
  );
}
