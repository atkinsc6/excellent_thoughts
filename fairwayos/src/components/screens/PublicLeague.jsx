import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy, DollarSign, Target, Share2, Check } from 'lucide-react';
import { calcSeasonAwards } from '../../utils/awards';
import { calcSkins, skinsSummary } from '../../utils/skins';

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function leagueKeys(leagueId) {
  return {
    league: `fos_${leagueId}_league`,
    players: `fos_${leagueId}_players`,
    rounds: `fos_${leagueId}_rounds`,
    courses: `fos_${leagueId}_courses`,
  };
}

function decodeSnapshot(hash) {
  if (!hash?.startsWith('#data=')) return null;
  try { return JSON.parse(atob(hash.slice(6))); } catch { return null; }
}

export function PublicLeague() {
  const { leagueId } = useParams();
  const [copied, setCopied] = useState(false);

  const snapshot = useMemo(() => decodeSnapshot(window.location.hash), []);

  const liveData = useMemo(() => {
    if (snapshot) return null;
    const KEYS = leagueKeys(leagueId);
    const league = load(KEYS.league);
    if (!league?.isPublic) return null;
    return {
      league,
      players: load(KEYS.players) || [],
      rounds: load(KEYS.rounds) || [],
      courses: load(KEYS.courses) || [],
    };
  }, [leagueId, snapshot]);

  const data = snapshot || liveData;

  const standings = useMemo(() => {
    if (!data) return [];
    const { players, rounds } = data;
    return players.map(p => {
      const pr = rounds.filter(r => r.playerIds?.includes(p.id));
      const totalNet = pr.reduce((s, r) => s + (r.scores?.find(sc => sc.playerId === p.id)?.totalNet || 0), 0);
      let points = 0;
      rounds.forEach(r => {
        if (!r.playerIds?.includes(p.id)) return;
        const sorted = [...(r.scores || [])].sort((a, b) => a.totalNet - b.totalNet);
        const rank = sorted.findIndex(s => s.playerId === p.id) + 1;
        const pts = (data.league?.pointsTable || []).find(pt => pt.place === rank)?.points || 0;
        points += pts;
      });
      return { id: p.id, name: p.name, rounds: pr.length, avgNet: pr.length ? Math.round(totalNet / pr.length * 10) / 10 : 0, points };
    }).filter(r => r.rounds > 0).sort((a, b) => b.points - a.points || a.avgNet - b.avgNet).slice(0, 10);
  }, [data]);

  const topSkins = useMemo(() => {
    if (!data) return [];
    const totals = {};
    data.rounds.forEach(r => {
      const course = data.courses.find(c => c.id === r.courseId);
      if (!course?.holes || !r.scores) return;
      const results = calcSkins(course.holes, r.scores, data.league?.skinsType === 'gross' ? 'gross' : 'net');
      const summary = skinsSummary(results);
      Object.entries(summary).forEach(([pid, n]) => { totals[pid] = (totals[pid] || 0) + n; });
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([pid, n]) => ({
      name: data.players.find(p => p.id === pid)?.name || '?',
      skins: n,
    }));
  }, [data]);

  const topCtp = useMemo(() => {
    if (!data) return [];
    const counts = {};
    data.rounds.forEach(r => r.ctpResults?.forEach(c => { if (c.winnerId) counts[c.winnerId] = (counts[c.winnerId] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([pid, n]) => ({
      name: data.players.find(p => p.id === pid)?.name || '?',
      wins: n,
    }));
  }, [data]);

  function copyShareLink() {
    if (!data) return;
    const compact = {
      league: { name: data.league.name, season: data.league.season, isPublic: true },
      players: data.players.map(p => ({ id: p.id, name: p.name })),
      rounds: data.rounds.map(r => ({
        id: r.id, date: r.date, courseId: r.courseId,
        playerIds: r.playerIds,
        scores: r.scores?.map(s => ({ playerId: s.playerId, totalGross: s.totalGross, totalNet: s.totalNet })),
        ctpResults: r.ctpResults,
        skinsResults: r.skinsResults,
      })),
      courses: data.courses.map(c => ({ id: c.id, name: c.name, holes: c.holes, tees: c.tees, par: c.par })),
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(compact))));
    const url = `${window.location.origin}/public/${leagueId}#data=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F9F6F0' }}>
        <div className="text-center max-w-md px-6">
          <div className="text-5xl font-bold mb-3" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1B4332' }}>FairwayOS</div>
          <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
            This league page is not publicly available or doesn't exist on this device.
          </p>
          <a href="/" className="text-sm underline" style={{ color: '#1B4332' }}>Open FairwayOS</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: '#F9F6F0', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#1B4332' }} className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                {data.league.name}
              </h1>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Season {data.league.season} · {data.rounds?.length || 0} rounds played
              </p>
            </div>
            {!snapshot && (
              <button
                onClick={copyShareLink}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0"
                style={{ backgroundColor: 'rgba(184,151,42,0.25)', color: '#B8972A', border: '1px solid rgba(184,151,42,0.4)' }}
              >
                {copied ? <Check size={14} /> : <Share2 size={14} />}
                {copied ? 'Copied!' : 'Share'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Standings */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={18} style={{ color: '#B8972A' }} />
            <h2 className="text-2xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1A1A1A' }}>Season Standings</h2>
          </div>
          <div className="rounded-xl overflow-hidden border" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D8' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#1B4332', color: 'white' }}>
                  {['#', 'Player', 'Rounds', 'Avg Net', 'Points'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {standings.map((row, i) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #E5E0D8' }}>
                    <td className="px-4 py-3">
                      <span className="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: i < 3 ? 'rgba(184,151,42,0.15)' : 'transparent', color: i < 3 ? '#B8972A' : '#6B7280' }}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: '#1A1A1A' }}>{row.name}</td>
                    <td className="px-4 py-3 text-center" style={{ color: '#6B7280' }}>{row.rounds}</td>
                    <td className="px-4 py-3 text-center font-medium" style={{ color: '#1B4332' }}>{row.avgNet}</td>
                    <td className="px-4 py-3 text-center font-bold" style={{ color: '#B8972A' }}>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Skins */}
          {topSkins.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={16} style={{ color: '#B8972A' }} />
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1A1A1A' }}>Skins Leaders</h2>
              </div>
              <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D8' }}>
                {topSkins.map((row, i) => (
                  <div key={row.name} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < topSkins.length - 1 ? '1px solid #E5E0D8' : 'none' }}>
                    <span className="text-xs font-bold w-5 text-center" style={{ color: '#6B7280' }}>{i + 1}</span>
                    <span className="flex-1 text-sm font-medium" style={{ color: '#1A1A1A' }}>{row.name}</span>
                    <span className="text-sm font-bold" style={{ color: '#B8972A' }}>{row.skins} skins</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* CTP */}
          {topCtp.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Target size={16} style={{ color: '#B8972A' }} />
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#1A1A1A' }}>CTP Leaders</h2>
              </div>
              <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D8' }}>
                {topCtp.map((row, i) => (
                  <div key={row.name} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < topCtp.length - 1 ? '1px solid #E5E0D8' : 'none' }}>
                    <span className="text-xs font-bold w-5 text-center" style={{ color: '#6B7280' }}>{i + 1}</span>
                    <span className="flex-1 text-sm font-medium" style={{ color: '#1A1A1A' }}>{row.name}</span>
                    <span className="text-sm font-bold" style={{ color: '#B8972A' }}>{row.wins} wins</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            Powered by{' '}
            <a href="/" className="font-semibold" style={{ color: '#1B4332' }}>FairwayOS</a>
          </p>
          {snapshot && (
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
              Snapshot from {new Date(snapshot.updatedAt || Date.now()).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
