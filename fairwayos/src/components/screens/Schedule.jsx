import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isBefore, addMonths, subMonths, startOfWeek, endOfWeek,
} from 'date-fns';
import { CalendarDays, List, Plus, ChevronLeft, ChevronRight, MapPin, Users, Shuffle, LayoutGrid } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { TopBar } from '../layout/TopBar';

const FORMAT_LABELS = {
  individual: 'Individual',
  better_ball: 'Better Ball',
  scramble: 'Scramble',
  chapman: 'Chapman',
};

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Schedule({ league, courses, players = [], schedule, setSchedule }) {
  const [view, setView] = useState('list');
  const [calMonth, setCalMonth] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', courseId: '', format: 'individual', notes: '' });

  // Group builder state
  const [groupsEventId, setGroupsEventId] = useState(null);
  const [groupDraft, setGroupDraft] = useState([]);

  const today = new Date();

  const sorted = useMemo(
    () => [...(schedule || [])].sort((a, b) => a.date.localeCompare(b.date)),
    [schedule]
  );

  const calDays = useMemo(() => {
    const monthStart = startOfMonth(calMonth);
    const monthEnd = endOfMonth(calMonth);
    return eachDayOfInterval({ start: startOfWeek(monthStart, { weekStartsOn: 0 }), end: endOfWeek(monthEnd, { weekStartsOn: 0 }) });
  }, [calMonth]);

  const eventsOnDay = (day) => (schedule || []).filter((e) => isSameDay(parseISO(e.date), day));

  const handleSave = () => {
    if (!form.name || !form.date) return;
    setSchedule((prev) => [...(prev || []), { id: Date.now().toString(), name: form.name, date: form.date, courseId: form.courseId, format: form.format, notes: form.notes }]);
    setForm({ name: '', date: '', courseId: '', format: 'individual', notes: '' });
    setShowModal(false);
  };

  const handleCancel = () => {
    setForm({ name: '', date: '', courseId: '', format: 'individual', notes: '' });
    setShowModal(false);
  };

  const courseName = (courseId) => (courses || []).find((c) => c.id === courseId)?.name || null;

  const selectedDayEvents = selectedDay ? eventsOnDay(selectedDay) : [];

  // Group builder helpers
  const openGroupsModal = (eventId) => {
    const event = (schedule || []).find(e => e.id === eventId);
    const existing = event?.groups || [];
    setGroupDraft(existing.length > 0 ? JSON.parse(JSON.stringify(existing)) : [{ id: '1', teeTime: '8:00 AM', players: [], cart: false }]);
    setGroupsEventId(eventId);
  };

  const saveGroups = () => {
    setSchedule(prev => (prev || []).map(e =>
      e.id === groupsEventId ? { ...e, groups: groupDraft } : e
    ));
    setGroupsEventId(null);
  };

  const allAssigned = useMemo(() => groupDraft.flatMap(g => g.players.map(p => p.playerId)), [groupDraft]);
  const available = useMemo(() => (players || []).filter(p => !allAssigned.includes(p.id)), [players, allAssigned]);

  const addPlayerToGroup = (groupId, playerId) => {
    const player = players.find(p => p.id === playerId);
    setGroupDraft(prev => prev.map(g =>
      g.id === groupId ? { ...g, players: [...g.players, { playerId, teePreference: player?.teePreference || 'White' }] } : g
    ));
  };

  const removePlayerFromGroup = (groupId, playerId) => {
    setGroupDraft(prev => prev.map(g =>
      g.id === groupId ? { ...g, players: g.players.filter(p => p.playerId !== playerId) } : g
    ));
  };

  const addGroup = () => {
    const newId = Date.now().toString();
    const lastGroup = groupDraft[groupDraft.length - 1];
    const lastTime = lastGroup?.teeTime || '8:00 AM';
    const [hours, minPart] = lastTime.split(':');
    const [mins, ampm] = minPart.split(' ');
    const newMins = ((parseInt(mins) + 10) % 60).toString().padStart(2, '0');
    const extraHour = (parseInt(mins) + 10) >= 60;
    const newHours = extraHour ? (parseInt(hours) === 12 ? 1 : parseInt(hours) + 1) : parseInt(hours);
    const newAmpm = extraHour && newHours === 12 ? (ampm === 'AM' ? 'PM' : 'AM') : ampm;
    setGroupDraft(prev => [...prev, { id: newId, teeTime: `${newHours}:${newMins} ${newAmpm}`, players: [], cart: false }]);
  };

  const removeGroup = (groupId) => {
    setGroupDraft(prev => prev.filter(g => g.id !== groupId));
  };

  const updateGroupTime = (groupId, teeTime) => {
    setGroupDraft(prev => prev.map(g => g.id === groupId ? { ...g, teeTime } : g));
  };

  const toggleGroupCart = (groupId) => {
    setGroupDraft(prev => prev.map(g => g.id === groupId ? { ...g, cart: !g.cart } : g));
  };

  const randomize = () => {
    const allPlayers = [...players];
    for (let i = allPlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allPlayers[i], allPlayers[j]] = [allPlayers[j], allPlayers[i]];
    }
    const groupSize = 4;
    const groups = [];
    for (let i = 0; i < allPlayers.length; i += groupSize) {
      const chunk = allPlayers.slice(i, i + groupSize);
      const idx = groups.length;
      const h = 8 + Math.floor(idx * 10 / 60);
      const m = (idx * 10 % 60).toString().padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayH = h > 12 ? h - 12 : h;
      groups.push({ id: `g${i}`, teeTime: `${displayH}:${m} ${ampm}`, players: chunk.map(p => ({ playerId: p.id, teePreference: p.teePreference || 'White' })), cart: false });
    }
    setGroupDraft(groups);
  };

  const autoFill = () => {
    if (!available.length || !groupDraft.length) return;
    const remaining = [...available];
    const updated = [...groupDraft];
    remaining.forEach(p => {
      const smallest = updated.reduce((min, g, i) => g.players.length < updated[min].players.length ? i : min, 0);
      updated[smallest] = { ...updated[smallest], players: [...updated[smallest].players, { playerId: p.id, teePreference: p.teePreference || 'White' }] };
    });
    setGroupDraft(updated);
  };

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <TopBar title="Schedule" subtitle={`${sorted.length} event${sorted.length !== 1 ? 's' : ''} this season`}>
        <Button variant="secondary" size="md" onClick={() => setShowModal(true)} style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>
          <Plus size={15} className="mr-1.5" />Add Event
        </Button>
      </TopBar>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          {[['list', List, 'List'], ['calendar', CalendarDays, 'Calendar']].map(([v, Icon, lbl]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: view === v ? 'var(--color-primary)' : 'var(--color-surface)',
                color: view === v ? 'white' : 'var(--color-muted)',
                border: '1px solid', borderColor: view === v ? 'var(--color-primary)' : 'var(--color-border)',
              }}
            >
              <Icon size={15} />{lbl}
            </button>
          ))}
        </div>

        {view === 'list' && (
          <div className="space-y-3">
            {sorted.length === 0 && (
              <Card>
                <div className="py-8 text-center" style={{ color: 'var(--color-muted)' }}>
                  <CalendarDays size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No events scheduled yet.</p>
                  <p className="text-xs mt-1">Click &ldquo;Add Event&rdquo; to create your first event.</p>
                </div>
              </Card>
            )}
            {sorted.map((event) => {
              const eventDate = parseISO(event.date);
              const isPast = isBefore(eventDate, today) && !isSameDay(eventDate, today);
              const course = (courses || []).find((c) => c.id === event.courseId);
              const hasGroups = (event.groups || []).length > 0;
              return (
                <Card key={event.id} className="flex items-start gap-4" style={{ opacity: isPast ? 0.6 : 1 }}>
                  <div className="flex-shrink-0 w-14 rounded-lg text-center py-2"
                    style={{ backgroundColor: isPast ? 'var(--color-border)' : 'rgba(27,67,50,0.08)', border: '1px solid', borderColor: isPast ? 'var(--color-border)' : 'rgba(27,67,50,0.2)' }}>
                    <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: isPast ? 'var(--color-muted)' : 'var(--color-primary)' }}>{format(eventDate, 'MMM')}</div>
                    <div className="text-2xl font-bold leading-tight" style={{ fontFamily: 'Cormorant Garamond, serif', color: isPast ? 'var(--color-muted)' : 'var(--color-primary)' }}>{format(eventDate, 'd')}</div>
                    <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{format(eventDate, 'EEE')}</div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>{event.name}</h3>
                      <Badge variant={isPast ? 'muted' : 'default'}>{FORMAT_LABELS[event.format] || event.format}</Badge>
                      {!isPast && isSameDay(eventDate, today) && <Badge variant="accent">Today</Badge>}
                      {isPast && <Badge variant="muted">Past</Badge>}
                      {hasGroups && <Badge variant="default"><Users size={10} className="inline mr-1" />{event.groups.length} groups</Badge>}
                    </div>
                    {course && (
                      <div className="flex items-center gap-1 mt-1" style={{ color: 'var(--color-muted)' }}>
                        <MapPin size={12} />
                        <span className="text-sm">{course.name}</span>
                        {course.city && <span className="text-xs">— {course.city}{course.state ? `, ${course.state}` : ''}</span>}
                      </div>
                    )}
                    {event.notes && <p className="text-sm mt-1.5" style={{ color: 'var(--color-muted)' }}>{event.notes}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => openGroupsModal(event.id)}
                        className="text-xs font-medium flex items-center gap-1"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        <LayoutGrid size={11} />{hasGroups ? 'Edit Groups' : 'Set Groups'}
                      </button>
                      {hasGroups && (
                        <Link to={`/teesheet/${event.id}`} className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
                          View Tee Sheet →
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 w-1 self-stretch rounded-full" style={{ backgroundColor: isPast ? 'var(--color-border)' : 'var(--color-accent)' }} />
                </Card>
              );
            })}
          </div>
        )}

        {view === 'calendar' && (
          <div className="space-y-4">
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <button onClick={() => { setCalMonth((m) => subMonths(m, 1)); setSelectedDay(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <ChevronLeft size={18} style={{ color: 'var(--color-muted)' }} />
                </button>
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>{format(calMonth, 'MMMM yyyy')}</h2>
                <button onClick={() => { setCalMonth((m) => addMonths(m, 1)); setSelectedDay(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <ChevronRight size={18} style={{ color: 'var(--color-muted)' }} />
                </button>
              </div>
              <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--color-border)' }}>
                {WEEK_DAYS.map((d) => (
                  <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calDays.map((day, idx) => {
                  const inMonth = day.getMonth() === calMonth.getMonth();
                  const isToday = isSameDay(day, today);
                  const dayEvents = eventsOnDay(day);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  const isPast = isBefore(day, today) && !isToday;
                  return (
                    <button key={idx} onClick={() => setSelectedDay(isSelected ? null : day)}
                      className="relative min-h-[64px] p-2 flex flex-col items-start transition-colors hover:bg-gray-50 focus:outline-none border-b border-r"
                      style={{ borderColor: 'var(--color-border)', backgroundColor: isSelected ? 'rgba(27,67,50,0.06)' : isToday ? 'rgba(184,151,42,0.07)' : 'transparent' }}>
                      <span className="w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium"
                        style={{ backgroundColor: isToday ? 'var(--color-accent)' : 'transparent', color: isToday ? 'white' : !inMonth ? 'var(--color-border)' : isPast ? 'var(--color-muted)' : 'var(--color-text)', fontWeight: isToday ? 700 : inMonth ? 500 : 400 }}>
                        {format(day, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {dayEvents.slice(0, 3).map((e, i) => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isBefore(parseISO(e.date), today) ? 'var(--color-muted)' : 'var(--color-primary)' }} />
                          ))}
                          {dayEvents.length > 3 && <span className="text-xs" style={{ color: 'var(--color-muted)' }}>+{dayEvents.length - 3}</span>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            {selectedDay && (
              <Card>
                <CardHeader><CardTitle>{format(selectedDay, 'EEEE, MMMM d, yyyy')}</CardTitle></CardHeader>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No events on this day.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDayEvents.map((event) => {
                      const course = (courses || []).find((c) => c.id === event.courseId);
                      const hasGroups = (event.groups || []).length > 0;
                      return (
                        <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                          <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-accent)' }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>{event.name}</span>
                              <Badge variant="default">{FORMAT_LABELS[event.format] || event.format}</Badge>
                            </div>
                            {course && (
                              <div className="flex items-center gap-1 mt-0.5" style={{ color: 'var(--color-muted)' }}>
                                <MapPin size={11} /><span className="text-xs">{course.name}</span>
                              </div>
                            )}
                            {event.notes && <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{event.notes}</p>}
                            <div className="flex items-center gap-3 mt-2">
                              <button onClick={() => openGroupsModal(event.id)} className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
                                {hasGroups ? 'Edit Groups' : 'Set Groups'}
                              </button>
                              {hasGroups && (
                                <Link to={`/teesheet/${event.id}`} className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
                                  View Tee Sheet →
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      <Modal isOpen={showModal} onClose={handleCancel} title="Add Event" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Event Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Round 7"
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Course</label>
            <select value={form.courseId} onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: form.courseId ? 'var(--color-text)' : 'var(--color-muted)' }}>
              <option value="">Select a course…</option>
              {(courses || []).map((c) => <option key={c.id} value={c.id}>{c.name}{c.city ? ` — ${c.city}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Format</label>
            <select value={form.format} onChange={(e) => setForm((f) => ({ ...f, format: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}>
              <option value="individual">Individual</option>
              <option value="better_ball">Better Ball</option>
              <option value="scramble">Scramble</option>
              <option value="chapman">Chapman</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Notes <span style={{ color: 'var(--color-muted)' }}>(optional)</span></label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Any additional details…" rows={3}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-700 resize-none"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }} />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={!form.name || !form.date}>Save Event</Button>
          </div>
        </div>
      </Modal>

      {/* Group Builder Modal */}
      <Modal isOpen={!!groupsEventId} onClose={() => setGroupsEventId(null)} title="Build Groups" size="lg">
        <div className="space-y-4">
          {/* Actions row */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={randomize} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
              <Shuffle size={12} /> Randomize All
            </button>
            <button onClick={autoFill} disabled={!available.length} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-40"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
              <Users size={12} /> Auto-fill ({available.length} left)
            </button>
            <button onClick={addGroup} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
              <Plus size={12} /> Add Group
            </button>
          </div>

          {/* Available players pool */}
          {available.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-muted)' }}>Unassigned Players</p>
              <div className="flex flex-wrap gap-2">
                {available.map(p => (
                  <div key={p.id} className="text-xs px-2.5 py-1.5 rounded-full border cursor-default" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                    {p.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Groups */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {groupDraft.map((group, gi) => (
              <div key={group.id} className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={group.teeTime}
                    onChange={e => updateGroupTime(group.id, e.target.value)}
                    className="px-2 py-1 rounded border text-xs font-mono w-24"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <button onClick={() => toggleGroupCart(group.id)} className="text-xs px-2 py-1 rounded border"
                    style={{ borderColor: group.cart ? 'var(--color-accent)' : 'var(--color-border)', color: group.cart ? 'var(--color-accent)' : 'var(--color-muted)', backgroundColor: group.cart ? 'rgba(184,151,42,0.08)' : 'transparent' }}>
                    {group.cart ? 'Cart' : 'Walking'}
                  </button>
                  <span className="text-xs ml-auto" style={{ color: 'var(--color-muted)' }}>Group {gi + 1}</span>
                  {groupDraft.length > 1 && (
                    <button onClick={() => removeGroup(group.id)} className="text-xs px-1.5 py-0.5 rounded" style={{ color: 'var(--color-danger)' }}>✕</button>
                  )}
                </div>

                {/* Assigned players */}
                <div className="space-y-1.5 mb-2">
                  {group.players.map(({ playerId, teePreference }) => {
                    const p = players.find(pl => pl.id === playerId);
                    return (
                      <div key={playerId} className="flex items-center gap-2 py-1 px-2 rounded" style={{ backgroundColor: 'var(--color-bg)' }}>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                          {p?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                        </div>
                        <span className="flex-1 text-xs font-medium" style={{ color: 'var(--color-text)' }}>{p?.name || playerId}</span>
                        <button onClick={() => removePlayerFromGroup(group.id, playerId)} className="text-xs px-1 rounded" style={{ color: 'var(--color-muted)' }}>✕</button>
                      </div>
                    );
                  })}
                </div>

                {/* Add player dropdown */}
                {available.length > 0 && (
                  <select
                    value=""
                    onChange={e => { if (e.target.value) addPlayerToGroup(group.id, e.target.value); }}
                    className="w-full px-2 py-1 rounded border text-xs"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)', backgroundColor: 'var(--color-surface)' }}
                  >
                    <option value="">+ Add player…</option>
                    {available.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={() => setGroupsEventId(null)}>Cancel</Button>
            <Button variant="primary" onClick={saveGroups}>Save Groups</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
