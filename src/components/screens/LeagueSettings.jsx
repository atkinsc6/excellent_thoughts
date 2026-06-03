import { useState } from 'react';
import { Save, Settings } from 'lucide-react';
import { TopBar } from '../layout/TopBar';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';

export function LeagueSettings({ league, setLeague }) {
  const [form, setForm] = useState({ ...league });
  const [saved, setSaved] = useState(false);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const toggleFormat = (fmt) => {
    const formats = form.scoringFormats || [];
    update('scoringFormats', formats.includes(fmt) ? formats.filter(f => f !== fmt) : [...formats, fmt]);
  };

  const updatePoints = (place, points) => {
    const table = form.pointsTable?.map(pt => pt.place === place ? { ...pt, points: parseInt(points) || 0 } : pt) || [];
    update('pointsTable', table);
  };

  const save = () => {
    setLeague(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Section = ({ title, children }) => (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <div className="mt-4 space-y-4">{children}</div>
    </Card>
  );

  const Toggle = ({ label, checked, onChange, description }) => (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{label}</div>
        {description && <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="flex-shrink-0 w-10 h-6 rounded-full transition-all relative"
        style={{ backgroundColor: checked ? 'var(--color-primary)' : 'var(--color-border)' }}
      >
        <span
          className="absolute top-1 w-4 h-4 rounded-full transition-all"
          style={{ backgroundColor: 'white', left: checked ? '22px' : '2px' }}
        />
      </button>
    </div>
  );

  const RadioGroup = ({ label, options, value, onChange }) => (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>{label}</label>
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="px-3 py-1.5 rounded-lg border text-sm font-medium transition-all"
            style={{
              backgroundColor: value === opt.value ? 'var(--color-primary)' : 'var(--color-surface)',
              color: value === opt.value ? 'white' : 'var(--color-muted)',
              borderColor: value === opt.value ? 'var(--color-primary)' : 'var(--color-border)',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <TopBar title="League Settings" subtitle="Configure your league's rules and scoring">
        <Button variant="primary" onClick={save}>
          <Save size={15} className="mr-1.5" />
          Save Settings
        </Button>
      </TopBar>

      <div className="p-6 space-y-5 max-w-3xl mx-auto">
        {saved && (
          <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(22,163,74,0.08)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.2)' }}>
            Settings saved successfully!
          </div>
        )}

        {/* League Info */}
        <Section title="League Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="League Name"
              value={form.name || ''}
              onChange={e => update('name', e.target.value)}
              className="col-span-2 sm:col-span-1"
            />
            <Input
              label="Season"
              value={form.season || ''}
              onChange={e => update('season', e.target.value)}
            />
            <Input
              label="Season Start Date"
              type="date"
              value={form.startDate || ''}
              onChange={e => update('startDate', e.target.value)}
            />
            <Input
              label="Season End Date"
              type="date"
              value={form.endDate || ''}
              onChange={e => update('endDate', e.target.value)}
            />
          </div>
        </Section>

        {/* Scoring Formats */}
        <Section title="Scoring Formats">
          <div className="space-y-2">
            {[
              { id: 'stroke', label: 'Stroke Play', desc: 'Count every stroke. Standard stroke play scoring.' },
              { id: 'stableford', label: 'Stableford', desc: 'Points-based scoring: 2 pts par, 3 pts birdie, etc.' },
              { id: 'match', label: 'Match Play', desc: 'Hole-by-hole wins. Best net score wins the hole.' },
              { id: 'bestball', label: 'Best Ball', desc: 'Teams use the best score on each hole.' },
              { id: 'scramble', label: 'Scramble', desc: 'All players hit from best shot position.' },
            ].map(fmt => (
              <div key={fmt.id} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm"
                onClick={() => toggleFormat(fmt.id)}
                style={{
                  borderColor: (form.scoringFormats || []).includes(fmt.id) ? 'var(--color-primary)' : 'var(--color-border)',
                  backgroundColor: (form.scoringFormats || []).includes(fmt.id) ? 'rgba(27,67,50,0.04)' : 'var(--color-surface)',
                }}
              >
                <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2"
                  style={{ borderColor: (form.scoringFormats || []).includes(fmt.id) ? 'var(--color-primary)' : 'var(--color-border)', backgroundColor: (form.scoringFormats || []).includes(fmt.id) ? 'var(--color-primary)' : 'transparent' }}>
                  {(form.scoringFormats || []).includes(fmt.id) && <span style={{ color: 'white', fontSize: '11px', fontWeight: 'bold' }}>✓</span>}
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{fmt.label}</div>
                  <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{fmt.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Handicap */}
        <Section title="Handicap System">
          <RadioGroup
            label="Handicap Method"
            value={form.handicapSystem || 'whs'}
            onChange={v => update('handicapSystem', v)}
            options={[
              { value: 'whs', label: 'WHS (World Handicap)' },
              { value: 'manual', label: 'Manual' },
              { value: 'none', label: 'None' },
            ]}
          />
          <RadioGroup
            label="Handicap Allowance"
            value={String(form.handicapAllowance || 0.95)}
            onChange={v => update('handicapAllowance', parseFloat(v))}
            options={[
              { value: '0.9', label: '90%' },
              { value: '0.95', label: '95%' },
              { value: '1', label: '100%' },
            ]}
          />
        </Section>

        {/* Skins */}
        <Section title="Skins Game">
          <Toggle
            label="Enable Skins"
            checked={(form.skinsType || 'gross') !== 'none'}
            onChange={v => update('skinsType', v ? 'gross' : 'none')}
          />
          <RadioGroup
            label="Skins Type"
            value={form.skinsType || 'gross'}
            onChange={v => update('skinsType', v)}
            options={[
              { value: 'gross', label: 'Gross Skins' },
              { value: 'net', label: 'Net Skins' },
              { value: 'both', label: 'Both' },
            ]}
          />
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Dollar Entry Per Skin ($)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={form.skinsEntry || 5}
              onChange={e => update('skinsEntry', parseInt(e.target.value) || 5)}
              className="w-32 px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', backgroundColor: 'var(--color-surface)' }}
            />
          </div>
        </Section>

        {/* CTP */}
        <Section title="Closest to Pin (CTP)">
          <Toggle
            label="Enable CTP"
            checked={form.ctpEnabled !== false}
            onChange={v => update('ctpEnabled', v)}
            description="Track closest-to-pin winners on par 3 holes"
          />
        </Section>

        {/* Points Table */}
        <Section title="Points System">
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Points awarded per finish position in each round (net score ranking).</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {(form.pointsTable || []).map(pt => (
              <div key={pt.place} className="flex items-center gap-2">
                <span className="text-sm font-medium w-14 flex-shrink-0" style={{ color: 'var(--color-muted)' }}>
                  {pt.place === 1 ? '1st' : pt.place === 2 ? '2nd' : pt.place === 3 ? '3rd' : `${pt.place}th`}
                </span>
                <input
                  type="number"
                  min="0"
                  value={pt.points}
                  onChange={e => updatePoints(pt.place, e.target.value)}
                  className="w-20 px-3 py-1.5 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', backgroundColor: 'var(--color-surface)' }}
                />
                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>pts</span>
              </div>
            ))}
          </div>
        </Section>

        <div className="flex justify-end pt-2">
          <Button variant="primary" size="lg" onClick={save}>
            <Save size={16} className="mr-2" />
            Save All Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
