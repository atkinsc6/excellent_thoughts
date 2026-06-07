import { useMemo } from 'react';
import { Printer, Award } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { TopBar } from '../layout/TopBar';
import { calcSeasonAwards } from '../../utils/awards';

export function Awards({ league, players, rounds, courses }) {
  const awards = useMemo(
    () => calcSeasonAwards(players, rounds, courses, league),
    [players, rounds, courses, league]
  );

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <TopBar
        title="Season Awards"
        subtitle={`${league?.season || 'Current Season'} · ${awards.length} awards`}
      >
        <button
          onClick={() => window.print()}
          className="no-print flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Printer size={14} /> Print
        </button>
      </TopBar>

      <div className="p-6 max-w-6xl mx-auto">
        {awards.length === 0 ? (
          <Card>
            <div className="py-16 text-center">
              <div className="text-5xl mb-4">🏆</div>
              <p className="text-base font-medium" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>
                Awards will appear after rounds are played.
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
                Enter a round to start tracking season awards.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {awards.map(award => (
              <AwardCard key={award.id} award={award} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AwardCard({ award }) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 transition-shadow hover:shadow-md"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-4xl leading-none">{award.icon}</span>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-accent)' }}>
            {award.value}
          </div>
        </div>
      </div>
      <div>
        <div
          className="text-lg font-bold leading-tight"
          style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}
        >
          {award.title}
        </div>
        <div
          className="text-base font-medium mt-0.5"
          style={{ color: 'var(--color-primary)' }}
        >
          {award.winnerName}
        </div>
        <div className="text-xs mt-1.5" style={{ color: 'var(--color-muted)' }}>
          {award.description}
        </div>
      </div>
    </div>
  );
}
