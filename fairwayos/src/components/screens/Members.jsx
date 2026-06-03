import { useState } from 'react';
import { UserPlus, Edit2, Trash2, Copy, Check, Mail } from 'lucide-react';
import { TopBar } from '../layout/TopBar';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';

export function Members({ players, setPlayers, rounds, league }) {
  const [showInvite, setShowInvite] = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const getRoundsPlayed = (pid) => rounds.filter(r => r.playerIds.includes(pid)).length;
  const getAvgScore = (pid) => {
    const pr = rounds.filter(r => r.playerIds.includes(pid));
    if (!pr.length) return '—';
    const total = pr.reduce((s, r) => s + (r.scores?.find(sc => sc.playerId === pid)?.totalGross || 0), 0);
    return (total / pr.length).toFixed(1);
  };

  const openEdit = (player) => {
    setEditPlayer(player);
    setEditForm({
      name: player.name,
      email: player.email,
      handicapIndex: player.handicapIndex,
      teePreference: player.teePreference,
      role: player.role,
    });
  };

  const saveEdit = () => {
    setPlayers(prev => prev.map(p =>
      p.id === editPlayer.id
        ? { ...p, ...editForm, handicapIndex: parseFloat(editForm.handicapIndex) || p.handicapIndex }
        : p
    ));
    setEditPlayer(null);
  };

  const removePlayer = (pid) => {
    if (confirm('Remove this player from the league?')) {
      setPlayers(prev => prev.filter(p => p.id !== pid));
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(league?.inviteCode || 'WGL25X');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const roleColors = { commissioner: 'accent', player: 'default' };

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <TopBar title="Members" subtitle={`${players.length} players in league`}>
        <Button variant="secondary" size="md" onClick={() => setShowInvite(true)}>
          <UserPlus size={15} className="mr-1.5" />
          Invite Player
        </Button>
      </TopBar>

      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>Total Members</div>
            <div className="text-3xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-primary)' }}>{players.length}</div>
          </Card>
          <Card>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>Avg Handicap</div>
            <div className="text-3xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-accent)' }}>
              {players.length ? (players.reduce((s, p) => s + p.handicapIndex, 0) / players.length).toFixed(1) : '—'}
            </div>
          </Card>
          <Card>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>Invite Code</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold tracking-widest" style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                {league?.inviteCode || 'WGL25X'}
              </span>
              <button onClick={copyCode} className="p-1 rounded transition-colors hover:bg-gray-100">
                {copied ? <Check size={14} style={{ color: '#16A34A' }} /> : <Copy size={14} style={{ color: 'var(--color-muted)' }} />}
              </button>
            </div>
          </Card>
        </div>

        {/* Roster Table */}
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <CardTitle>Roster</CardTitle>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
                  {['Player', 'Role', 'Handicap Index', 'Rounds', 'Avg Score', 'Tee Pref', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                        >
                          {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-semibold" style={{ color: 'var(--color-text)' }}>{p.name}</div>
                          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={roleColors[p.role] || 'default'}>
                        {p.role === 'commissioner' ? '★ Commissioner' : 'Player'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-primary)' }}>{p.handicapIndex}</td>
                    <td className="px-4 py-3 text-center" style={{ color: 'var(--color-muted)' }}>{getRoundsPlayed(p.id)}</td>
                    <td className="px-4 py-3 text-center" style={{ color: 'var(--color-text)' }}>{getAvgScore(p.id)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                        {p.teePreference}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Edit player"
                        >
                          <Edit2 size={14} style={{ color: 'var(--color-muted)' }} />
                        </button>
                        {p.role !== 'commissioner' && (
                          <button
                            onClick={() => removePlayer(p.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Remove player"
                          >
                            <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Invite Modal */}
      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite a Player" size="sm">
        <div className="space-y-4">
          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg)', border: '1px dashed var(--color-border)' }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>League Invite Code</div>
            <div className="text-4xl font-bold tracking-[0.3em]" style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>
              {league?.inviteCode || 'WGL25X'}
            </div>
            <button
              onClick={copyCode}
              className="mt-3 flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{ backgroundColor: copied ? '#16A34A' : 'var(--color-primary)', color: 'white' }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'var(--color-border)' }} />
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 text-xs" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-muted)' }}>or send email invite</span>
            </div>
          </div>
          <Input
            label="Email Address"
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="golfer@example.com"
          />
          <Button variant="primary" className="w-full" onClick={() => { alert('Invite sent! (Email not wired in demo)'); setShowInvite(false); }}>
            <Mail size={14} className="mr-2" />
            Send Invite Email
          </Button>
        </div>
      </Modal>

      {/* Edit Player Modal */}
      <Modal isOpen={!!editPlayer} onClose={() => setEditPlayer(null)} title="Edit Player" size="sm">
        {editPlayer && (
          <div className="space-y-4">
            <Input
              label="Name"
              value={editForm.name || ''}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Email"
              type="email"
              value={editForm.email || ''}
              onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="Handicap Index"
              type="number"
              min="0"
              max="54"
              step="0.1"
              value={editForm.handicapIndex || ''}
              onChange={e => setEditForm(f => ({ ...f, handicapIndex: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Tee Preference</label>
              <select
                value={editForm.teePreference || 'Blue'}
                onChange={e => setEditForm(f => ({ ...f, teePreference: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              >
                {['Black', 'Blue', 'White', 'Gold', 'Red'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Role</label>
              <select
                value={editForm.role || 'player'}
                onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              >
                <option value="player">Player</option>
                <option value="commissioner">Commissioner</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="secondary" onClick={() => setEditPlayer(null)}>Cancel</Button>
              <Button variant="primary" onClick={saveEdit}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
