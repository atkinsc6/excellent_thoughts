import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Printer, Clock, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';

const TEE_COLORS = {
  Black: '#1a1a1a', Blue: '#1d4ed8', White: '#9CA3AF',
  Gold: '#B8972A', Red: '#dc2626', Green: '#16a34a',
};

export function TeeSheet({ schedule, players, courses }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const event = (schedule || []).find(e => e.id === eventId);
  const course = event?.courseId ? (courses || []).find(c => c.id === event.courseId) : null;

  if (!event) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center">
          <p className="text-base font-medium" style={{ color: 'var(--color-muted)' }}>Event not found.</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-sm underline" style={{ color: 'var(--color-primary)' }}>Go back</button>
        </div>
      </div>
    );
  }

  const groups = event.groups || [];
  const allAssignedIds = groups.flatMap(g => g.players?.map(p => p.playerId) || []);
  const totalWalking = groups.filter(g => !g.cart).length;
  const totalCart = groups.filter(g => g.cart).length;

  const playerName = (id) => (players || []).find(p => p.id === id)?.name || 'Unknown';
  const playerTee = (group, playerId) => group.players?.find(p => p.playerId === playerId)?.teePreference || '';

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="p-6 max-w-4xl mx-auto space-y-6">

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
              <h1
                className="text-3xl font-bold"
                style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}
              >
                {event.name}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
                  {format(parseISO(event.date), 'EEEE, MMMM d, yyyy')}
                </span>
                {course && (
                  <span className="text-sm" style={{ color: 'var(--color-muted)' }}>· {course.name}</span>
                )}
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

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Groups', value: groups.length, icon: Users },
            { label: 'Players', value: allAssignedIds.length, icon: Users },
            { label: 'Cart / Walk', value: `${totalCart} / ${totalWalking}`, icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="flex flex-col gap-1 text-center">
              <div className="text-2xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>{value}</div>
              <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{label}</div>
            </Card>
          ))}
        </div>

        {groups.length === 0 ? (
          <Card>
            <div className="py-8 text-center">
              <Users size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No groups set for this event yet.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Use the "Set Groups" button in Schedule to build the tee sheet.</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map((group, gi) => (
              <Card key={gi}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={14} style={{ color: 'var(--color-accent)' }} />
                    <span className="font-semibold text-base" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>
                      {group.teeTime || `Group ${gi + 1}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {group.cart !== undefined && (
                      <Badge variant={group.cart ? 'accent' : 'default'}>{group.cart ? 'Cart' : 'Walking'}</Badge>
                    )}
                    <Badge variant="muted">{(group.players || []).length} players</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  {(group.players || []).map(({ playerId, teePreference }) => {
                    const name = playerName(playerId);
                    const teeColor = TEE_COLORS[teePreference] || 'var(--color-muted)';
                    return (
                      <div key={playerId} className="flex items-center gap-3 py-1.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                        >
                          {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="flex-1 text-sm font-medium" style={{ color: 'var(--color-text)' }}>{name}</span>
                        {teePreference && (
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${teeColor}20`, color: teeColor, border: `1px solid ${teeColor}40` }}
                          >
                            {teePreference}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs py-4" style={{ color: 'var(--color-muted)' }}>
          Tee Sheet · {event.name} · {format(parseISO(event.date), 'MMMM d, yyyy')}
        </div>
      </div>
    </div>
  );
}
