import { useState, useMemo } from 'react';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { CalendarDays, List, Plus, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
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

export function Schedule({ league, courses, schedule, setSchedule }) {
  const [view, setView] = useState('list');
  const [calMonth, setCalMonth] = useState(new Date(2026, 5, 1));
  const [selectedDay, setSelectedDay] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    date: '',
    courseId: '',
    format: 'individual',
    notes: '',
  });

  const today = new Date(2026, 5, 3);

  const sorted = useMemo(
    () => [...(schedule || [])].sort((a, b) => a.date.localeCompare(b.date)),
    [schedule]
  );

  const calDays = useMemo(() => {
    const monthStart = startOfMonth(calMonth);
    const monthEnd = endOfMonth(calMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [calMonth]);

  const eventsOnDay = (day) =>
    (schedule || []).filter((e) => isSameDay(parseISO(e.date), day));

  const handleSave = () => {
    if (!form.name || !form.date) return;
    const newEvent = {
      id: Date.now().toString(),
      name: form.name,
      date: form.date,
      courseId: form.courseId,
      format: form.format,
      notes: form.notes,
    };
    setSchedule((prev) => [...(prev || []), newEvent]);
    setForm({ name: '', date: '', courseId: '', format: 'individual', notes: '' });
    setShowModal(false);
  };

  const handleCancel = () => {
    setForm({ name: '', date: '', courseId: '', format: 'individual', notes: '' });
    setShowModal(false);
  };

  const courseName = (courseId) => {
    const c = (courses || []).find((c) => c.id === courseId);
    return c ? c.name : null;
  };

  const selectedDayEvents = selectedDay ? eventsOnDay(selectedDay) : [];

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <TopBar title="Schedule" subtitle={`${sorted.length} event${sorted.length !== 1 ? 's' : ''} this season`}>
        <Button
          variant="secondary"
          size="md"
          onClick={() => setShowModal(true)}
          style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
        >
          <Plus size={15} className="mr-1.5" />
          Add Event
        </Button>
      </TopBar>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: view === 'list' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: view === 'list' ? 'white' : 'var(--color-muted)',
              border: '1px solid',
              borderColor: view === 'list' ? 'var(--color-primary)' : 'var(--color-border)',
            }}
          >
            <List size={15} />
            List
          </button>
          <button
            onClick={() => setView('calendar')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: view === 'calendar' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: view === 'calendar' ? 'white' : 'var(--color-muted)',
              border: '1px solid',
              borderColor: view === 'calendar' ? 'var(--color-primary)' : 'var(--color-border)',
            }}
          >
            <CalendarDays size={15} />
            Calendar
          </button>
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
              return (
                <Card
                  key={event.id}
                  className="flex items-start gap-4"
                  style={{ opacity: isPast ? 0.6 : 1 }}
                >
                  <div
                    className="flex-shrink-0 w-14 rounded-lg text-center py-2"
                    style={{
                      backgroundColor: isPast ? 'var(--color-border)' : 'rgba(27,67,50,0.08)',
                      border: '1px solid',
                      borderColor: isPast ? 'var(--color-border)' : 'rgba(27,67,50,0.2)',
                    }}
                  >
                    <div
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: isPast ? 'var(--color-muted)' : 'var(--color-primary)' }}
                    >
                      {format(eventDate, 'MMM')}
                    </div>
                    <div
                      className="text-2xl font-bold leading-tight"
                      style={{
                        fontFamily: 'Cormorant Garamond, serif',
                        color: isPast ? 'var(--color-muted)' : 'var(--color-primary)',
                      }}
                    >
                      {format(eventDate, 'd')}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: isPast ? 'var(--color-muted)' : 'var(--color-muted)' }}
                    >
                      {format(eventDate, 'EEE')}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className="font-semibold text-base"
                        style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}
                      >
                        {event.name}
                      </h3>
                      <Badge variant={isPast ? 'muted' : 'default'}>
                        {FORMAT_LABELS[event.format] || event.format}
                      </Badge>
                      {!isPast && isSameDay(eventDate, today) && (
                        <Badge variant="accent">Today</Badge>
                      )}
                      {isPast && <Badge variant="muted">Past</Badge>}
                    </div>

                    {course && (
                      <div className="flex items-center gap-1 mt-1" style={{ color: 'var(--color-muted)' }}>
                        <MapPin size={12} />
                        <span className="text-sm">{course.name}</span>
                        {course.city && (
                          <span className="text-xs">
                            — {course.city}{course.state ? `, ${course.state}` : ''}
                          </span>
                        )}
                      </div>
                    )}

                    {event.notes && (
                      <p className="text-sm mt-1.5" style={{ color: 'var(--color-muted)' }}>
                        {event.notes}
                      </p>
                    )}
                  </div>

                  <div
                    className="flex-shrink-0 w-1 self-stretch rounded-full"
                    style={{ backgroundColor: isPast ? 'var(--color-border)' : 'var(--color-accent)' }}
                  />
                </Card>
              );
            })}
          </div>
        )}

        {view === 'calendar' && (
          <div className="space-y-4">
            <Card className="p-0 overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <button
                  onClick={() => { setCalMonth((m) => subMonths(m, 1)); setSelectedDay(null); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft size={18} style={{ color: 'var(--color-muted)' }} />
                </button>
                <h2
                  className="text-xl font-semibold"
                  style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}
                >
                  {format(calMonth, 'MMMM yyyy')}
                </h2>
                <button
                  onClick={() => { setCalMonth((m) => addMonths(m, 1)); setSelectedDay(null); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight size={18} style={{ color: 'var(--color-muted)' }} />
                </button>
              </div>

              <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--color-border)' }}>
                {WEEK_DAYS.map((d) => (
                  <div
                    key={d}
                    className="py-2 text-center text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    {d}
                  </div>
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
                    <button
                      key={idx}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className="relative min-h-[64px] p-2 flex flex-col items-start transition-colors hover:bg-gray-50 focus:outline-none border-b border-r"
                      style={{
                        borderColor: 'var(--color-border)',
                        backgroundColor: isSelected
                          ? 'rgba(27,67,50,0.06)'
                          : isToday
                          ? 'rgba(184,151,42,0.07)'
                          : 'transparent',
                      }}
                    >
                      <span
                        className="w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: isToday ? 'var(--color-accent)' : 'transparent',
                          color: isToday
                            ? 'white'
                            : !inMonth
                            ? 'var(--color-border)'
                            : isPast
                            ? 'var(--color-muted)'
                            : 'var(--color-text)',
                          fontWeight: isToday ? 700 : inMonth ? 500 : 400,
                        }}
                      >
                        {format(day, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {dayEvents.slice(0, 3).map((e, i) => (
                            <span
                              key={i}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: isBefore(parseISO(e.date), today) ? 'var(--color-muted)' : 'var(--color-primary)' }}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-xs" style={{ color: 'var(--color-muted)' }}>+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            {selectedDay && (
              <Card>
                <CardHeader>
                  <CardTitle>{format(selectedDay, 'EEEE, MMMM d, yyyy')}</CardTitle>
                </CardHeader>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No events on this day.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDayEvents.map((event) => {
                      const course = (courses || []).find((c) => c.id === event.courseId);
                      return (
                        <div
                          key={event.id}
                          className="flex items-start gap-3 p-3 rounded-lg"
                          style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                        >
                          <div
                            className="w-1 self-stretch rounded-full flex-shrink-0"
                            style={{ backgroundColor: 'var(--color-accent)' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="font-semibold"
                                style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}
                              >
                                {event.name}
                              </span>
                              <Badge variant="default">{FORMAT_LABELS[event.format] || event.format}</Badge>
                            </div>
                            {course && (
                              <div className="flex items-center gap-1 mt-0.5" style={{ color: 'var(--color-muted)' }}>
                                <MapPin size={11} />
                                <span className="text-xs">{course.name}</span>
                              </div>
                            )}
                            {event.notes && (
                              <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{event.notes}</p>
                            )}
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

      <Modal isOpen={showModal} onClose={handleCancel} title="Add Event" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              Event Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Round 7"
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              Date
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              Course
            </label>
            <select
              value={form.courseId}
              onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: form.courseId ? 'var(--color-text)' : 'var(--color-muted)',
              }}
            >
              <option value="">Select a course…</option>
              {(courses || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.city ? ` — ${c.city}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              Format
            </label>
            <select
              value={form.format}
              onChange={(e) => setForm((f) => ({ ...f, format: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              <option value="individual">Individual</option>
              <option value="better_ball">Better Ball</option>
              <option value="scramble">Scramble</option>
              <option value="chapman">Chapman</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              Notes <span style={{ color: 'var(--color-muted)' }}>(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Any additional details…"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-700 resize-none"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!form.name || !form.date}
            >
              Save Event
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
