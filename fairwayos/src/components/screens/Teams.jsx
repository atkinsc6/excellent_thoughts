import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, GripVertical, Users2 } from 'lucide-react';
import { TopBar } from '../layout/TopBar';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';

const PRESET_COLORS = ['#1B4332','#B8972A','#1d4ed8','#DC2626','#7C3AED','#059669','#D97706','#0284C7'];

export function Teams({ players, teams, setTeams, rounds, league }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const [form, setForm] = useState({ name: '', color: PRESET_COLORS[0], initials: '' });
  const [dragPlayer, setDragPlayer] = useState(null);
  const [dragTargetTeam, setDragTargetTeam] = useState(null);

  const unassigned = useMemo(() =>
    players.filter(p => !teams.some(t => t.playerIds.includes(p.id))),
    [players, teams]
  );

  const getTeamStats = (team) => {
    let wins = 0, totalNet = 0, count = 0;
    rounds.forEach(r => {
      const teamScores = r.scores?.filter(s => team.playerIds.includes(s.playerId)) || [];
      const oppScores = r.scores?.filter(s => !team.playerIds.includes(s.playerId)) || [];
      if (!teamScores.length || !oppScores.length) return;
      const teamBest = Math.min(...teamScores.map(s => s.totalNet));
      const oppBest = Math.min(...oppScores.map(s => s.totalNet));
      if (teamBest < oppBest) wins++;
      totalNet += teamBest;
      count++;
    });
    return { wins, losses: count - wins, avgNet: count ? (totalNet / count).toFixed(1) : '—' };
  };

  const openCreate = () => {
    setForm({ name: '', color: PRESET_COLORS[teams.length % PRESET_COLORS.length], initials: '' });
    setEditTeam(null);
    setShowCreate(true);
  };

  const openEdit = (team) => {
    setForm({ name: team.name, color: team.color, initials: team.initials || '' });
    setEditTeam(team);
    setShowCreate(true);
  };

  const saveTeam = () => {
    if (!form.name.trim()) return;
    const initials = form.initials || form.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    if (editTeam) {
      setTeams(prev => prev.map(t => t.id === editTeam.id ? { ...t, name: form.name, color: form.color, initials } : t));
    } else {
      const newTeam = { id: `team_${Date.now()}`, name: form.name, color: form.color, initials, playerIds: [] };
      setTeams(prev => [...prev, newTeam]);
    }
    setShowCreate(false);
    setEditTeam(null);
  };

  const deleteTeam = (teamId) => {
    if (!confirm('Delete this team? Players will become unassigned.')) return;
    setTeams(prev => prev.filter(t => t.id !== teamId));
  };

  const movePlayer = (playerId, toTeamId) => {
    setTeams(prev => prev.map(t => {
      // Remove from all teams first
      const withoutPlayer = { ...t, playerIds: t.playerIds.filter(id => id !== playerId) };
      // Add to target team
      if (t.id === toTeamId) return { ...withoutPlayer, playerIds: [...withoutPlayer.playerIds, playerId] };
      return withoutPlayer;
    }));
  };

  const removeFromTeam = (playerId, teamId) => {
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, playerIds: t.playerIds.filter(id => id !== playerId) } : t));
  };

  const PlayerPill = ({ playerId, teamId }) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return null;
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border group"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <GripVertical size={12} style={{ color: 'var(--color-border)' }} className="cursor-grab" />
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
          {player.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{player.name}</span>
          <span className="text-xs ml-1" style={{ color: 'var(--color-muted)' }}>HCP {player.handicapIndex}</span>
        </div>
        {teamId && (
          <button onClick={() => removeFromTeam(playerId, teamId)}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 transition-all">
            <Trash2 size={12} style={{ color: 'var(--color-danger)' }} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <TopBar title="Teams" subtitle={`${teams.length} teams configured`}>
        <Button variant="primary" size="md" onClick={openCreate}>
          <Plus size={15} className="mr-1.5" />New Team
        </Button>
      </TopBar>

      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Team cards */}
        {teams.length === 0 && (
          <Card className="text-center py-12">
            <Users2 size={40} className="mx-auto mb-3" style={{ color: 'var(--color-border)' }} />
            <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>No teams yet</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>Create teams to enable team scoring formats</p>
            <Button variant="primary" onClick={openCreate}><Plus size={14} className="mr-1" />Create First Team</Button>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {teams.map(team => {
            const stats = getTeamStats(team);
            return (
              <Card key={team.id} className="p-0 overflow-hidden">
                {/* Team header */}
                <div className="flex items-center justify-between px-4 py-3"
                  style={{ backgroundColor: team.color, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                      {team.initials}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{team.name}</div>
                      <div className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        {team.playerIds.length} player{team.playerIds.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="default" className="text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}>
                      {stats.wins}W {stats.losses}L
                    </Badge>
                    <button onClick={() => openEdit(team)} className="p-1.5 rounded hover:bg-white/20 transition-colors">
                      <Edit2 size={13} style={{ color: 'white' }} />
                    </button>
                    <button onClick={() => deleteTeam(team.id)} className="p-1.5 rounded hover:bg-red-400/30 transition-colors">
                      <Trash2 size={13} style={{ color: 'white' }} />
                    </button>
                  </div>
                </div>

                {/* Stats strip */}
                <div className="grid grid-cols-3 border-b text-center" style={{ borderColor: 'var(--color-border)' }}>
                  {[
                    { label: 'Wins', value: stats.wins },
                    { label: 'Losses', value: stats.losses },
                    { label: 'Avg Net', value: stats.avgNet },
                  ].map(s => (
                    <div key={s.label} className="py-2">
                      <div className="text-lg font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: team.color }}>{s.value}</div>
                      <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Roster */}
                <div className="p-3 space-y-1.5">
                  {team.playerIds.map(pid => (
                    <PlayerPill key={pid} playerId={pid} teamId={team.id} />
                  ))}
                  {/* Add player from unassigned */}
                  {unassigned.length > 0 && (
                    <select onChange={e => { if (e.target.value) { movePlayer(e.target.value, team.id); e.target.value = ''; } }}
                      className="w-full px-2 py-1.5 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)', backgroundColor: 'var(--color-bg)' }}>
                      <option value="">+ Add player to team...</option>
                      {unassigned.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (HCP {p.handicapIndex})</option>
                      ))}
                    </select>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Unassigned players */}
        {unassigned.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Unassigned Players</CardTitle></CardHeader>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {unassigned.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg border"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: 'var(--color-muted)', color: 'white', opacity: 0.6 }}>
                    {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{p.name}</div>
                    <div className="text-xs" style={{ color: 'var(--color-muted)' }}>HCP {p.handicapIndex}</div>
                  </div>
                  {teams.length > 0 && (
                    <select onChange={e => { if (e.target.value) movePlayer(p.id, e.target.value); }}
                      className="px-2 py-1 rounded border text-xs"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                      <option value="">Assign →</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setEditTeam(null); }} title={editTeam ? 'Edit Team' : 'Create Team'} size="sm">
        <div className="space-y-4">
          <Input label="Team Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Team Birdie" autoFocus />
          <Input label="Initials (2 chars)" value={form.initials} onChange={e => setForm(f => ({ ...f, initials: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="TB" maxLength={2} />
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>Team Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  className="w-8 h-8 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c, borderColor: form.color === c ? 'var(--color-text)' : 'transparent', transform: form.color === c ? 'scale(1.2)' : 'scale(1)' }} />
              ))}
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-8 h-8 rounded-full cursor-pointer border"
                style={{ borderColor: 'var(--color-border)', padding: '1px' }} />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setEditTeam(null); }}>Cancel</Button>
            <Button variant="primary" onClick={saveTeam}>{editTeam ? 'Save Changes' : 'Create Team'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
