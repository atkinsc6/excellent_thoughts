import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, X, ChevronDown, ChevronRight, Trophy, Shield } from 'lucide-react';
import { TopBar } from '../layout/TopBar';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../hooks/useAuth';

const MATCH_TYPES = [
  { value: 'singles', label: 'Singles', desc: '1v1 match play' },
  { value: 'fourballs', label: 'Fourballs', desc: '2v2 better ball' },
  { value: 'foursomes', label: 'Foursomes', desc: '2v2 alternate shot' },
];

const RESULT_OPTIONS = [
  { value: null, label: 'Pending', style: { color: 'var(--color-muted)' } },
  { value: 'team1', label: 'T1 Wins', style: { color: '#16a34a', fontWeight: 700 } },
  { value: 'halved', label: 'Halved', style: { color: 'var(--color-muted)' } },
  { value: 'team2', label: 'T2 Wins', style: { color: '#16a34a', fontWeight: 700 } },
];

function calcPoints(matches) {
  let p1 = 0, p2 = 0;
  for (const m of matches) {
    if (m.result === 'team1') p1 += 1;
    else if (m.result === 'team2') p2 += 1;
    else if (m.result === 'halved') { p1 += 0.5; p2 += 0.5; }
  }
  return { p1, p2 };
}

function MatchRow({ match, team1Name, team2Name, players, onChange }) {
  const t1Players = (match.team1PlayerIds || []).map(id => players.find(p => p.id === id)?.name?.split(' ')[0]).filter(Boolean);
  const t2Players = (match.team2PlayerIds || []).map(id => players.find(p => p.id === id)?.name?.split(' ')[0]).filter(Boolean);

  return (
    <div className="flex items-center gap-3 py-2.5 flex-wrap" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>{match.type}</span>
        </div>
        <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-text)' }}>
          <span style={{ color: match.result === 'team1' ? '#16a34a' : 'inherit' }}>{t1Players.join(' & ') || team1Name}</span>
          <span className="mx-2 text-xs" style={{ color: 'var(--color-muted)' }}>vs</span>
          <span style={{ color: match.result === 'team2' ? '#16a34a' : 'inherit' }}>{t2Players.join(' & ') || team2Name}</span>
        </div>
      </div>
      <div className="flex rounded-lg border overflow-hidden flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        {RESULT_OPTIONS.filter(r => r.value !== null).map(opt => (
          <button key={opt.value || 'null'}
            onClick={() => onChange(match.id, match.result === opt.value ? null : opt.value)}
            className="px-2 py-1 text-xs font-medium transition-all"
            style={{
              backgroundColor: match.result === opt.value ? (opt.value === 'team1' ? 'rgba(22,163,74,0.15)' : opt.value === 'team2' ? 'rgba(22,163,74,0.15)' : 'rgba(107,114,128,0.1)') : 'transparent',
              color: match.result === opt.value ? (opt.value === 'halved' ? 'var(--color-text)' : '#16a34a') : 'var(--color-muted)',
              fontWeight: match.result === opt.value ? 700 : 400,
            }}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function NewCupModal({ players, onSave, onClose }) {
  const [form, setForm] = useState({
    name: `Ryder Cup ${new Date().getFullYear()}`,
    date: format(new Date(), 'yyyy-MM-dd'),
    team1Name: 'Team 1',
    team2Name: 'Team 2',
    team1PlayerIds: [],
    team2PlayerIds: [],
  });

  const unassigned = players.filter(p => !form.team1PlayerIds.includes(p.id) && !form.team2PlayerIds.includes(p.id));

  const assign = (playerId, team) => {
    setForm(f => ({
      ...f,
      team1PlayerIds: team === 1 ? [...f.team1PlayerIds, playerId] : f.team1PlayerIds.filter(id => id !== playerId),
      team2PlayerIds: team === 2 ? [...f.team2PlayerIds, playerId] : f.team2PlayerIds.filter(id => id !== playerId),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
          <h2 className="font-bold text-lg" style={{ fontFamily: 'Cormorant Garamond, serif' }}>New Ryder Cup</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>Event Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2].map(team => (
              <div key={team}>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>Team {team} Name</label>
                <input
                  value={team === 1 ? form.team1Name : form.team2Name}
                  onChange={e => setForm(f => ({ ...f, [`team${team}Name`]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--color-primary)' }}>{form.team1Name}</div>
              <div className="space-y-1">
                {form.team1PlayerIds.map(pid => {
                  const p = players.find(pl => pl.id === pid);
                  return (
                    <div key={pid} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                      style={{ backgroundColor: 'rgba(27,67,50,0.08)', color: 'var(--color-primary)' }}>
                      <span className="flex-1 truncate">{p?.name?.split(' ')[0]}</span>
                      <button onClick={() => assign(pid, 0)}><X size={10} /></button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--color-muted)' }}>Unassigned</div>
              <div className="space-y-1">
                {unassigned.map(p => (
                  <div key={p.id} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="flex-1 truncate" style={{ color: 'var(--color-text)' }}>{p.name.split(' ')[0]}</span>
                    <button onClick={() => assign(p.id, 1)} className="text-xs px-1" style={{ color: 'var(--color-primary)' }}>T1</button>
                    <button onClick={() => assign(p.id, 2)} className="text-xs px-1" style={{ color: 'var(--color-primary)' }}>T2</button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--color-accent)' }}>{form.team2Name}</div>
              <div className="space-y-1">
                {form.team2PlayerIds.map(pid => {
                  const p = players.find(pl => pl.id === pid);
                  return (
                    <div key={pid} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                      style={{ backgroundColor: 'rgba(184,151,42,0.1)', color: 'var(--color-accent)' }}>
                      <span className="flex-1 truncate">{p?.name?.split(' ')[0]}</span>
                      <button onClick={() => assign(pid, 0)}><X size={10} /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 flex justify-between border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>Cancel</button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.name || form.team1PlayerIds.length === 0 || form.team2PlayerIds.length === 0}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-primary)' }}>
            Create Ryder Cup
          </button>
        </div>
      </div>
    </div>
  );
}

export function RyderCup({ players, ryderCups, setRyderCups }) {
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [addMatch, setAddMatch] = useState(null); // cupId for match adding
  const [matchForm, setMatchForm] = useState({ type: 'singles', team1PlayerIds: [], team2PlayerIds: [], sessionLabel: '' });
  const { user } = useAuth();

  const currentUser = players.find(p => p.email === user?.email);
  const isCommissioner = currentUser?.role === 'commissioner';

  function createCup(form) {
    const cup = {
      id: `rc-${Date.now()}`,
      name: form.name,
      date: form.date,
      team1: { name: form.team1Name, playerIds: form.team1PlayerIds },
      team2: { name: form.team2Name, playerIds: form.team2PlayerIds },
      sessions: [{ id: 's1', label: 'Session 1', matches: [] }],
    };
    setRyderCups(prev => [...prev, cup]);
    setShowNew(false);
    setExpanded(cup.id);
  }

  function addMatchToCup(cupId) {
    setRyderCups(prev => prev.map(cup => {
      if (cup.id !== cupId) return cup;
      const sessions = cup.sessions.length > 0 ? cup.sessions : [{ id: 's1', label: 'Session 1', matches: [] }];
      const lastSession = sessions[sessions.length - 1];
      const newMatch = {
        id: `m-${Date.now()}`,
        type: matchForm.type,
        team1PlayerIds: matchForm.team1PlayerIds,
        team2PlayerIds: matchForm.team2PlayerIds,
        result: null,
      };
      return {
        ...cup,
        sessions: sessions.map((s, i) =>
          i === sessions.length - 1 ? { ...s, matches: [...s.matches, newMatch] } : s
        ),
      };
    }));
    setAddMatch(null);
    setMatchForm({ type: 'singles', team1PlayerIds: [], team2PlayerIds: [], sessionLabel: '' });
  }

  function updateMatchResult(cupId, matchId, result) {
    setRyderCups(prev => prev.map(cup => {
      if (cup.id !== cupId) return cup;
      return {
        ...cup,
        sessions: cup.sessions.map(s => ({
          ...s,
          matches: s.matches.map(m => m.id === matchId ? { ...m, result } : m),
        })),
      };
    }));
  }

  function addSession(cupId) {
    setRyderCups(prev => prev.map(cup => {
      if (cup.id !== cupId) return cup;
      const n = cup.sessions.length + 1;
      return { ...cup, sessions: [...cup.sessions, { id: `s${Date.now()}`, label: `Session ${n}`, matches: [] }] };
    }));
  }

  const sortedCups = useMemo(() => [...ryderCups].sort((a, b) => new Date(b.date) - new Date(a.date)), [ryderCups]);

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <TopBar
        title="Ryder Cup"
        subtitle="Team challenge matches"
        actions={isCommissioner ? (
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}>
            <Plus size={14} /> New Ryder Cup
          </button>
        ) : null}
      />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {sortedCups.length === 0 ? (
          <Card>
            <div className="py-16 text-center">
              <Shield size={40} className="mx-auto mb-4" style={{ color: 'var(--color-border)' }} />
              <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text)', fontFamily: 'Cormorant Garamond, serif' }}>No Ryder Cups yet</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>Create a team challenge event to get started.</p>
              {isCommissioner && (
                <button onClick={() => setShowNew(true)}
                  className="px-5 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: 'var(--color-primary)' }}>
                  <Plus size={14} className="inline mr-1.5" /> New Ryder Cup
                </button>
              )}
            </div>
          </Card>
        ) : sortedCups.map(cup => {
          const allMatches = cup.sessions.flatMap(s => s.matches);
          const { p1, p2 } = calcPoints(allMatches);
          const totalPossible = allMatches.length;
          const isExpanded = expanded === cup.id;

          return (
            <Card key={cup.id} className="overflow-hidden p-0">
              {/* Cup header */}
              <button
                className="w-full px-6 py-4 flex items-center justify-between text-left"
                onClick={() => setExpanded(isExpanded ? null : cup.id)}
                style={{ backgroundColor: isExpanded ? 'rgba(27,67,50,0.04)' : 'var(--color-surface)' }}>
                <div className="flex items-center gap-4">
                  <Shield size={24} style={{ color: 'var(--color-accent)' }} />
                  <div>
                    <div className="font-bold text-lg" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>{cup.name}</div>
                    <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      {cup.date ? format(parseISO(cup.date), 'MMMM d, yyyy') : ''} · {totalPossible} match{totalPossible !== 1 ? 'es' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Scoreboard */}
                  <div className="flex items-center gap-1 text-center">
                    <div>
                      <div className="text-xs font-medium truncate max-w-16" style={{ color: 'var(--color-primary)' }}>{cup.team1.name}</div>
                      <div className="text-2xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: p1 > p2 ? '#16a34a' : 'var(--color-text)' }}>{p1}</div>
                    </div>
                    <div className="text-sm font-bold mx-2" style={{ color: 'var(--color-muted)' }}>–</div>
                    <div>
                      <div className="text-xs font-medium truncate max-w-16" style={{ color: 'var(--color-accent)' }}>{cup.team2.name}</div>
                      <div className="text-2xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: p2 > p1 ? '#16a34a' : 'var(--color-text)' }}>{p2}</div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronDown size={16} style={{ color: 'var(--color-muted)' }} /> : <ChevronRight size={16} style={{ color: 'var(--color-muted)' }} />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                  {/* Points bar */}
                  {totalPossible > 0 && (
                    <div className="px-6 py-3" style={{ backgroundColor: 'rgba(27,67,50,0.03)' }}>
                      <div className="flex rounded-full overflow-hidden h-3" style={{ backgroundColor: 'var(--color-border)' }}>
                        {p1 > 0 && <div style={{ width: `${(p1 / totalPossible) * 100}%`, backgroundColor: 'var(--color-primary)' }} />}
                        {p2 > 0 && <div style={{ width: `${(p2 / totalPossible) * 100}%`, backgroundColor: 'var(--color-accent)' }} className="ml-auto" />}
                      </div>
                      <div className="flex justify-between text-xs mt-1.5" style={{ color: 'var(--color-muted)' }}>
                        <span>{cup.team1.name} {p1}pt</span>
                        <span>{totalPossible} pts available</span>
                        <span>{cup.team2.name} {p2}pt</span>
                      </div>
                    </div>
                  )}

                  {/* Sessions */}
                  {cup.sessions.map((session, si) => (
                    <div key={session.id} className="px-6 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{session.label}</h4>
                        {si === cup.sessions.length - 1 && isCommissioner && (
                          <button onClick={() => setAddMatch(cup.id)}
                            className="text-xs flex items-center gap-1 px-2 py-1 rounded border"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}>
                            <Plus size={11} /> Add Match
                          </button>
                        )}
                      </div>
                      {session.matches.length === 0 ? (
                        <p className="text-xs italic" style={{ color: 'var(--color-muted)' }}>No matches in this session yet.</p>
                      ) : session.matches.map(match => (
                        <MatchRow key={match.id} match={match}
                          team1Name={cup.team1.name} team2Name={cup.team2.name}
                          players={players}
                          onChange={(matchId, result) => updateMatchResult(cup.id, matchId, result)} />
                      ))}
                    </div>
                  ))}

                  {isCommissioner && (
                    <div className="px-6 pb-4 flex gap-2">
                      <button onClick={() => addSession(cup.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                        + New Session
                      </button>
                    </div>
                  )}

                  {/* Add match inline form */}
                  {addMatch === cup.id && (
                    <div className="px-6 pb-4 space-y-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(27,67,50,0.03)' }}>
                      <h5 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Add Match</h5>
                      <div className="flex gap-2">
                        {MATCH_TYPES.map(t => (
                          <button key={t.value} onClick={() => setMatchForm(f => ({ ...f, type: t.value }))}
                            className="px-3 py-1.5 rounded-lg text-xs border font-medium"
                            style={{ borderColor: matchForm.type === t.value ? 'var(--color-primary)' : 'var(--color-border)', backgroundColor: matchForm.type === t.value ? 'rgba(27,67,50,0.1)' : 'transparent', color: matchForm.type === t.value ? 'var(--color-primary)' : 'var(--color-muted)' }}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[1, 2].map(team => {
                          const teamObj = team === 1 ? cup.team1 : cup.team2;
                          const selected = team === 1 ? matchForm.team1PlayerIds : matchForm.team2PlayerIds;
                          const maxPlayers = matchForm.type === 'singles' ? 1 : 2;
                          return (
                            <div key={team}>
                              <div className="text-xs font-medium mb-1" style={{ color: team === 1 ? 'var(--color-primary)' : 'var(--color-accent)' }}>{teamObj.name}</div>
                              <div className="flex flex-wrap gap-1">
                                {teamObj.playerIds.map(pid => {
                                  const p = players.find(pl => pl.id === pid);
                                  const isSel = selected.includes(pid);
                                  const canAdd = selected.length < maxPlayers;
                                  return (
                                    <button key={pid}
                                      onClick={() => {
                                        const setter = team === 1 ? 'team1PlayerIds' : 'team2PlayerIds';
                                        setMatchForm(f => ({
                                          ...f,
                                          [setter]: isSel ? f[setter].filter(id => id !== pid) : (f[setter].length < maxPlayers ? [...f[setter], pid] : f[setter]),
                                        }));
                                      }}
                                      className="px-2 py-1 rounded text-xs"
                                      style={{ backgroundColor: isSel ? (team === 1 ? 'rgba(27,67,50,0.15)' : 'rgba(184,151,42,0.15)') : 'var(--color-bg)', color: isSel ? (team === 1 ? 'var(--color-primary)' : 'var(--color-accent)') : 'var(--color-muted)', border: '1px solid var(--color-border)', opacity: (!canAdd && !isSel) ? 0.4 : 1 }}>
                                      {p?.name?.split(' ')[0] || pid}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setAddMatch(null)} className="px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>Cancel</button>
                        <button onClick={() => addMatchToCup(cup.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                          style={{ backgroundColor: 'var(--color-primary)' }}>
                          Add Match
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {showNew && <NewCupModal players={players} onSave={createCup} onClose={() => setShowNew(false)} />}
    </div>
  );
}
