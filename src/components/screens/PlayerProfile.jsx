import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Trophy, TrendingDown, Medal, DollarSign, Target, Edit2, Trash2, BarChart2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { useHandicap } from '../../hooks/useHandicap';
import { useAuth } from '../../hooks/useAuth';
import { seasonSkinsTotals } from '../../utils/skins';
import { aggregateStats } from '../../utils/scoring';

export function PlayerProfile({ league, players, setPlayers, rounds, courses, teams }) {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getHandicapTrend, getHandicapIndex } = useHandicap(players, rounds, courses);

  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', handicapIndex: '' });
  const [confirmRemove, setConfirmRemove] = useState(false);

  const player = players.find(p => p.id === playerId);

  const currentUser = players.find(p => p.email === user?.email);
  const isCommissioner = currentUser?.role === 'commissioner';

  const playerRounds = useMemo(
    () => rounds.filter(r => r.playerIds?.includes(playerId)).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [rounds, playerId]
  );

  const skinsTotals = useMemo(() => seasonSkinsTotals(rounds), [rounds]);

  const stats = useMemo(() => {
    if (!playerRounds.length) return { roundsPlayed: 0, avgGross: null, avgNet: null, bestNet: null, skinsWon: 0 };
    const grossScores = playerRounds.map(r => r.scores?.find(s => s.playerId === playerId)?.totalGross).filter(v => v != null);
    const netScores = playerRounds.map(r => r.scores?.find(s => s.playerId === playerId)?.totalNet).filter(v => v != null);
    return {
      roundsPlayed: playerRounds.length,
      avgGross: grossScores.length ? (grossScores.reduce((a, b) => a + b, 0) / grossScores.length).toFixed(1) : null,
      avgNet: netScores.length ? (netScores.reduce((a, b) => a + b, 0) / netScores.length).toFixed(1) : null,
      bestNet: netScores.length ? Math.min(...netScores) : null,
      skinsWon: skinsTotals[playerId] || 0,
    };
  }, [playerRounds, playerId, skinsTotals]);

  const shotStats = useMemo(() => {
    const scorecards = playerRounds.map(r => {
      const ps = r.scores?.find(s => s.playerId === playerId);
      const course = courses.find(c => c.id === r.courseId);
      return ps && (ps.gir || ps.putts || ps.fairwaysHit) ? { ...ps, _holes: course?.holes } : null;
    }).filter(Boolean);
    if (!scorecards.length) return null;
    return aggregateStats(scorecards, scorecards[0]?._holes);
  }, [playerRounds, playerId, courses]);

  const handicapTrend = useMemo(() => {
    const trend = getHandicapTrend(playerId);
    return trend.slice(-10).map(t => ({
      date: format(parseISO(t.date), 'MMM d'),
      index: t.index,
    }));
  }, [playerId, getHandicapTrend]);

  const currentHcp = useMemo(() => getHandicapIndex(playerId), [playerId, getHandicapIndex]);

  const roundHistory = useMemo(() => {
    return playerRounds.slice(0, 20).map(r => {
      const ps = r.scores?.find(s => s.playerId === playerId);
      const course = courses.find(c => c.id === r.courseId);
      const roundSkins = (r.skinsResults || []).filter(s => s.winnerId === playerId).reduce((sum, s) => sum + (s.pot || 1), 0);
      const allNetScores = (r.scores || [])
        .map(s => ({ playerId: s.playerId, net: s.totalNet }))
        .filter(s => s.net != null)
        .sort((a, b) => a.net - b.net);
      const rank = allNetScores.findIndex(s => s.playerId === playerId) + 1;
      return {
        roundId: r.id,
        date: r.date,
        courseName: course?.name || 'Unknown Course',
        gross: ps?.totalGross ?? null,
        net: ps?.totalNet ?? null,
        stableford: ps?.totalStableford ?? null,
        skins: roundSkins,
        rank: rank || null,
        total: allNetScores.length,
      };
    });
  }, [playerRounds, playerId, courses]);

  const h2hRecords = useMemo(() => {
    return players
      .filter(p => p.id !== playerId)
      .map(opponent => {
        let wins = 0, losses = 0, ties = 0;
        rounds.forEach(r => {
          if (!r.playerIds?.includes(playerId) || !r.playerIds?.includes(opponent.id)) return;
          const myScore = r.scores?.find(s => s.playerId === playerId)?.totalNet;
          const oppScore = r.scores?.find(s => s.playerId === opponent.id)?.totalNet;
          if (myScore == null || oppScore == null) return;
          if (myScore < oppScore) wins++;
          else if (myScore > oppScore) losses++;
          else ties++;
        });
        return { opponent, wins, losses, ties, played: wins + losses + ties };
      })
      .filter(r => r.played > 0)
      .sort((a, b) => b.played - a.played);
  }, [players, rounds, playerId]);

  const openEditModal = () => {
    setEditForm({ name: player.name, handicapIndex: String(player.handicapIndex) });
    setEditModal(true);
  };

  const saveEdit = () => {
    const hcp = parseFloat(editForm.handicapIndex);
    setPlayers(prev => prev.map(p =>
      p.id === playerId
        ? { ...p, name: editForm.name.trim() || p.name, handicapIndex: isNaN(hcp) ? p.handicapIndex : Math.min(54, Math.max(0, hcp)) }
        : p
    ));
    setEditModal(false);
  };

  const removePlayer = () => {
    setPlayers(prev => prev.filter(p => p.id !== playerId));
    navigate('/members');
  };

  const initials = player ? player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '';

  if (!player) {
    return (
      <div className="flex-1 overflow-y-auto pb-20 lg:pb-6 flex flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--color-bg)' }}>
        <p className="text-lg font-semibold" style={{ color: 'var(--color-muted)' }}>Player not found</p>
        <Button variant="secondary" onClick={() => navigate('/members')}>
          <ArrowLeft size={15} className="mr-1.5" />
          Back to Members
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate('/members')}
            className="p-2 rounded-lg hover:bg-white transition-colors flex items-center gap-1.5 text-sm font-medium"
            style={{ color: 'var(--color-muted)' }}
          >
            <ArrowLeft size={16} />
            Members
          </button>
        </div>

        <Card>
          <div className="flex items-start gap-5 flex-wrap">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
              style={{ backgroundColor: 'var(--color-primary)', color: 'white', fontFamily: 'Cormorant Garamond, serif' }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-3xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>
                  {player.name}
                </h1>
                <Badge variant={player.role === 'commissioner' ? 'accent' : 'default'}>
                  {player.role === 'commissioner' ? '★ Commissioner' : 'Player'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 flex-wrap text-sm mt-2">
                <span style={{ color: 'var(--color-muted)' }}>
                  Tee: <span className="font-medium" style={{ color: 'var(--color-text)' }}>{player.teePreference}</span>
                </span>
                <span style={{ color: 'var(--color-muted)' }}>
                  Handicap Index:{' '}
                  <span className="text-lg font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-primary)' }}>
                    {currentHcp ?? player.handicapIndex}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Rounds Played', value: stats.roundsPlayed, icon: <Target size={16} />, color: 'var(--color-primary)' },
            { label: 'Avg Gross', value: stats.avgGross ?? '—', icon: <TrendingDown size={16} />, color: 'var(--color-text)' },
            { label: 'Avg Net', value: stats.avgNet ?? '—', icon: <TrendingDown size={16} />, color: 'var(--color-accent)' },
            { label: 'Best Net', value: stats.bestNet ?? '—', icon: <Trophy size={16} />, color: 'var(--color-accent)' },
            { label: 'Skins Won', value: stats.skinsWon, icon: <DollarSign size={16} />, color: 'var(--color-primary)' },
          ].map(({ label, value, icon, color }) => (
            <Card key={label}>
              <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--color-muted)' }}>
                {icon}
                <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
              </div>
              <div className="text-2xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color }}>
                {value}
              </div>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Handicap Trend</CardTitle>
          </CardHeader>
          {handicapTrend.length < 2 ? (
            <p className="text-sm mt-2" style={{ color: 'var(--color-muted)' }}>Not enough rounds to display a trend.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={handicapTrend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted)' }} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip
                  contentStyle={{ fontSize: 11, border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-surface)' }}
                  formatter={v => [v, 'Index']}
                />
                <Line
                  type="monotone"
                  dataKey="index"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: 'var(--color-accent)', stroke: 'var(--color-accent)' }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <CardTitle>Round History</CardTitle>
          </div>
          {roundHistory.length === 0 ? (
            <p className="p-4 text-sm" style={{ color: 'var(--color-muted)' }}>No rounds recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
                    {['Date', 'Course', 'Gross', 'Net', 'Stableford', 'Skins', 'Finish'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roundHistory.map(row => (
                    <tr key={row.roundId} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/round/${row.roundId}`} className="font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
                          {format(parseISO(row.date), 'MMM d, yyyy')}
                        </Link>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-muted)' }}>{row.courseName}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{row.gross ?? '—'}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-primary)' }}>{row.net ?? '—'}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-muted)' }}>{row.stableford ?? '—'}</td>
                      <td className="px-4 py-3">
                        {row.skins > 0 ? (
                          <Badge variant="accent">{row.skins}</Badge>
                        ) : (
                          <span style={{ color: 'var(--color-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.rank ? (
                          <span
                            className="inline-flex items-center gap-1 font-semibold text-sm"
                            style={{ color: row.rank === 1 ? 'var(--color-accent)' : 'var(--color-text)' }}
                          >
                            {row.rank === 1 && <Medal size={13} />}
                            {row.rank}/{row.total}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Shot Stats */}
        {shotStats && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart2 size={16} style={{ color: 'var(--color-accent)' }} />
                <CardTitle>Shot Stats</CardTitle>
              </div>
            </CardHeader>
            <div className="grid grid-cols-3 gap-4 mt-3">
              {[
                { label: 'GIR %', value: shotStats.girPct != null ? `${shotStats.girPct}%` : '—', color: shotStats.girPct != null ? (shotStats.girPct >= 50 ? '#16a34a' : shotStats.girPct >= 33 ? 'var(--color-accent)' : 'var(--color-danger)') : 'var(--color-muted)', sub: `${shotStats.girHoles} holes tracked` },
                { label: 'FH %', value: shotStats.fhPct != null ? `${shotStats.fhPct}%` : '—', color: shotStats.fhPct != null ? (shotStats.fhPct >= 60 ? '#16a34a' : shotStats.fhPct >= 40 ? 'var(--color-accent)' : 'var(--color-danger)') : 'var(--color-muted)', sub: `${shotStats.fhHoles} holes tracked` },
                { label: 'Putts/Hole', value: shotStats.avgPutts != null ? shotStats.avgPutts : '—', color: shotStats.avgPutts != null ? (shotStats.avgPutts <= 1.7 ? '#16a34a' : shotStats.avgPutts <= 2.0 ? 'var(--color-text)' : 'var(--color-danger)') : 'var(--color-muted)', sub: `${shotStats.puttsHoles} holes tracked` },
              ].map(s => (
                <div key={s.label} className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>{s.label}</div>
                  <div className="text-2xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: s.color }}>{s.value}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {h2hRecords.length > 0 && (
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <CardTitle>Head-to-Head Records</CardTitle>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Based on net score comparisons in shared rounds</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
                    {['Opponent', 'W', 'L', 'T', 'Rounds', 'Record'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {h2hRecords.map(({ opponent, wins, losses, ties, played }) => {
                    const winRate = played > 0 ? (wins / played) : 0;
                    return (
                      <tr key={opponent.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                            >
                              {opponent.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium" style={{ color: 'var(--color-text)' }}>{opponent.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold" style={{ color: '#16A34A' }}>{wins}</td>
                        <td className="px-4 py-3 font-bold" style={{ color: 'var(--color-danger)' }}>{losses}</td>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-muted)' }}>{ties}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--color-muted)' }}>{played}</td>
                        <td className="px-4 py-3">
                          <Badge variant={winRate >= 0.5 ? 'success' : winRate > 0 ? 'muted' : 'danger'}>
                            {wins}-{losses}{ties > 0 ? `-${ties}` : ''}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {isCommissioner && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Commissioner Tools</CardTitle>
                <Badge variant="accent">Admin</Badge>
              </div>
            </CardHeader>
            <div className="flex flex-wrap gap-3 mt-2">
              <Button variant="secondary" onClick={openEditModal}>
                <Edit2 size={14} className="mr-1.5" />
                Edit Player
              </Button>
              {player.role !== 'commissioner' && (
                <Button variant="danger" onClick={() => setConfirmRemove(true)}>
                  <Trash2 size={14} className="mr-1.5" />
                  Remove from League
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>

      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Player" size="sm">
        <div className="space-y-4">
          <Input
            label="Name"
            value={editForm.name}
            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Handicap Index"
            type="number"
            min="0"
            max="54"
            step="0.1"
            value={editForm.handicapIndex}
            onChange={e => setEditForm(f => ({ ...f, handicapIndex: e.target.value }))}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={saveEdit}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={confirmRemove} onClose={() => setConfirmRemove(false)} title="Remove Player" size="sm">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--color-text)' }}>
            Are you sure you want to remove <strong>{player.name}</strong> from the league? This cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setConfirmRemove(false)}>Cancel</Button>
            <Button variant="danger" onClick={removePlayer}>
              <Trash2 size={14} className="mr-1.5" />
              Remove Player
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
