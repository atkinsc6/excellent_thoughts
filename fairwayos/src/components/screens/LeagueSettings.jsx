import { useState } from 'react';
import { Save, Settings, Unlock, RefreshCw, Download, Trash2, AlertTriangle, Archive, ChevronDown, ChevronRight } from 'lucide-react';
import { TopBar } from '../layout/TopBar';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { logActivity, ACTIVITY_TYPES } from '../../utils/activity';

export function LeagueSettings({ league, setLeague, rounds, setRounds, players, setPlayers, refreshActivity, archives = [], setArchives }) {
  const [form, setForm] = useState({ ...league });
  const [saved, setSaved] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [expandedArchive, setExpandedArchive] = useState(null);

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
    logActivity(league?.id, ACTIVITY_TYPES.SETTINGS_UPDATED, 'League settings updated');
    refreshActivity?.();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const unlockLastRound = () => {
    if (!rounds.length) return;
    const sorted = [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date));
    const last = sorted[0];
    setRounds(prev => prev.map(r => r.id === last.id ? { ...r, finalized: false, finalizedAt: null } : r));
    logActivity(league?.id, ACTIVITY_TYPES.ROUND_UNLOCKED, `Round unlocked for editing`);
    refreshActivity?.();
  };

  const exportData = () => {
    const data = { league, players, rounds };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fairwayos-${league?.name?.replace(/\s+/g, '-').toLowerCase() || 'export'}-${new Date().getFullYear()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetSeason = () => {
    setRounds([]);
    setResetConfirm(false);
    logActivity(league?.id, ACTIVITY_TYPES.SETTINGS_UPDATED, 'Season data reset by commissioner');
    refreshActivity?.();
  };

  const archiveSeason = () => {
    // Build snapshot
    const standings = players.map(p => {
      const pr = rounds.filter(r => r.playerIds?.includes(p.id));
      const totalNet = pr.reduce((s, r) => s + (r.scores?.find(sc => sc.playerId === p.id)?.totalNet || 0), 0);
      let points = 0;
      rounds.forEach(r => {
        if (!r.playerIds?.includes(p.id)) return;
        const sorted = [...(r.scores || [])].sort((a, b) => a.totalNet - b.totalNet);
        const rank = sorted.findIndex(s => s.playerId === p.id) + 1;
        const pts = league?.pointsTable?.find(pt => pt.place === rank)?.points || 0;
        points += pts;
      });
      const avgNet = pr.length ? Math.round(totalNet / pr.length * 10) / 10 : 0;
      return { name: p.name, points, avgNet, rounds: pr.length };
    }).sort((a, b) => b.points - a.points || a.avgNet - b.avgNet);

    // Skins leader
    const skinsCounts = {};
    rounds.forEach(r => (r.skinsResults || []).forEach(s => {
      if (s.winnerId) skinsCounts[s.winnerId] = (skinsCounts[s.winnerId] || 0) + s.pot;
    }));
    const topSkinsId = Object.entries(skinsCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // CTP leader
    const ctpCounts = {};
    rounds.forEach(r => (r.ctpResults || []).forEach(c => {
      ctpCounts[c.winnerId] = (ctpCounts[c.winnerId] || 0) + 1;
    }));
    const topCtpId = Object.entries(ctpCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    const snapshot = {
      id: `archive-${Date.now()}`,
      season: league?.season || new Date().getFullYear().toString(),
      archivedAt: new Date().toISOString(),
      champion: standings[0] || null,
      topStandings: standings.slice(0, 8),
      skinsChampion: topSkinsId ? { name: players.find(p => p.id === topSkinsId)?.name, skins: skinsCounts[topSkinsId] } : null,
      ctpChampion: topCtpId ? { name: players.find(p => p.id === topCtpId)?.name, wins: ctpCounts[topCtpId] } : null,
      totalRounds: rounds.length,
    };

    setArchives(prev => [snapshot, ...(prev || [])]);
    setRounds([]);
    setArchiveConfirm(false);
    logActivity(league?.id, ACTIVITY_TYPES.SETTINGS_UPDATED, `Season ${snapshot.season} archived`);
    refreshActivity?.();
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
          <Toggle
            label="Public League Page"
            checked={!!form.isPublic}
            onChange={v => update('isPublic', v)}
            description="Share a public standings page. Use the share button on the public page to generate a cross-device link."
          />
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
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>CTP Entry ($)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={form.ctpEntry ?? 5}
              onChange={e => update('ctpEntry', parseInt(e.target.value) || 5)}
              className="w-32 px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', backgroundColor: 'var(--color-surface)' }}
            />
          </div>
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

        {/* Season Structure */}
        <Section title="Season Structure">
          <Toggle
            label="Split into halves"
            checked={form.splitIntoHalves || false}
            onChange={v => update('splitIntoHalves', v)}
            description="Track 1st half and 2nd half standings alongside overall"
          />
          {form.splitIntoHalves && (
            <div className="space-y-3 pt-1">
              <RadioGroup
                label="Midpoint type"
                value={form.halvesBreakpoint?.type || 'round'}
                onChange={v => update('halvesBreakpoint', { type: v, value: v === 'round' ? (form.halvesBreakpoint?.value || 4) : (form.halvesBreakpoint?.value || '') })}
                options={[
                  { value: 'round', label: 'After round N' },
                  { value: 'date', label: 'By date' },
                ]}
              />
              {(form.halvesBreakpoint?.type || 'round') === 'round' ? (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Split after round #</label>
                  <input
                    type="number"
                    min="1"
                    value={form.halvesBreakpoint?.value || 4}
                    onChange={e => update('halvesBreakpoint', { type: 'round', value: parseInt(e.target.value) || 1 })}
                    className="w-24 px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', backgroundColor: 'var(--color-surface)' }}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Midpoint date</label>
                  <input
                    type="date"
                    value={form.halvesBreakpoint?.value || ''}
                    onChange={e => update('halvesBreakpoint', { type: 'date', value: e.target.value })}
                    className="w-full sm:w-48 px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', backgroundColor: 'var(--color-surface)' }}
                  />
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Scoring Rules */}
        <Section title="Scoring Rules">
          <RadioGroup
            label="Score Entry Permission"
            value={form.scoreEntryPermission || 'all'}
            onChange={v => update('scoreEntryPermission', v)}
            options={[
              { value: 'all', label: 'All Members' },
              { value: 'commissioner', label: 'Commissioner Only' },
            ]}
          />
          <RadioGroup
            label="Scoring Mode"
            value={form.scoringMode || 'individual'}
            onChange={v => update('scoringMode', v)}
            options={[
              { value: 'individual', label: 'Individual' },
              { value: 'team', label: 'Team' },
            ]}
          />
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Team Size</label>
            <input type="number" min="1" max="6" value={form.teamSize || 2}
              onChange={e => update('teamSize', parseInt(e.target.value) || 2)}
              className="w-24 px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', backgroundColor: 'var(--color-surface)' }} />
          </div>
          <RadioGroup
            label="Team Structure"
            value={form.teamStructure || 'fixed'}
            onChange={v => update('teamStructure', v)}
            options={[
              { value: 'fixed', label: 'Fixed Teams' },
              { value: 'random', label: 'Random Each Round' },
            ]}
          />
          <Toggle
            label="Allow Ties"
            checked={form.allowTies !== false}
            onChange={v => update('allowTies', v)}
            description="Allow tied scores in standings; otherwise use tiebreaker"
          />
          <RadioGroup
            label="Tiebreaker"
            value={form.tiebreaker || 'card_playoff'}
            onChange={v => update('tiebreaker', v)}
            options={[
              { value: 'card_playoff', label: 'Card Playoff' },
              { value: 'sudden_death', label: 'Sudden Death' },
              { value: 'none', label: 'None' },
            ]}
          />
          <RadioGroup
            label="Score Visibility"
            value={form.scoreVisibility || 'public'}
            onChange={v => update('scoreVisibility', v)}
            options={[
              { value: 'public', label: 'Public' },
              { value: 'members', label: 'Members Only' },
              { value: 'commissioner', label: 'Commissioner Only' },
            ]}
          />
        </Section>

        {/* Commissioner Tools */}
        <Section title="Commissioner Tools">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Unlock Last Round</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Remove the finalized lock from the most recent round to allow edits</div>
              </div>
              <button onClick={unlockLastRound}
                disabled={!rounds.length}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                style={{ backgroundColor: 'var(--color-primary)' }}>
                <Unlock size={13} /> Unlock
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Export League Data</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Download all league data as a JSON backup file</div>
              </div>
              <button onClick={exportData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--color-accent)' }}>
                <Download size={13} /> Export
              </button>
            </div>

            {rounds.length > 0 && (
              <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--color-accent)', backgroundColor: 'rgba(184,151,42,0.03)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                      <Archive size={14} style={{ color: 'var(--color-accent)' }} /> Archive Season
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Snapshot standings and clear rounds to start a new season</div>
                  </div>
                  {!archiveConfirm ? (
                    <button onClick={() => setArchiveConfirm(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                      style={{ backgroundColor: 'var(--color-accent)' }}>
                      <Archive size={13} /> Archive
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setArchiveConfirm(false)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium border"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                        Cancel
                      </button>
                      <button onClick={archiveSeason}
                        className="px-3 py-1.5 rounded-lg text-sm font-bold text-white"
                        style={{ backgroundColor: 'var(--color-accent)' }}>
                        Confirm Archive
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--color-danger)', backgroundColor: 'rgba(220,38,38,0.03)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--color-danger)' }}>
                    <AlertTriangle size={14} /> Reset Season Data
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Permanently delete all rounds for this season. This cannot be undone.</div>
                </div>
                {!resetConfirm ? (
                  <button onClick={() => setResetConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: 'var(--color-danger)' }}>
                    <Trash2 size={13} /> Reset
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setResetConfirm(false)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                      Cancel
                    </button>
                    <button onClick={resetSeason}
                      className="px-3 py-1.5 rounded-lg text-sm font-bold text-white"
                      style={{ backgroundColor: 'var(--color-danger)' }}>
                      Confirm Reset
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* Past Seasons */}
        {archives.length > 0 && (
          <Section title="Past Seasons">
            <div className="space-y-2">
              {archives.map(a => (
                <div key={a.id} className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                  <button
                    className="w-full flex items-center justify-between p-3 text-left"
                    style={{ backgroundColor: expandedArchive === a.id ? 'rgba(27,67,50,0.04)' : 'var(--color-surface)' }}
                    onClick={() => setExpandedArchive(expandedArchive === a.id ? null : a.id)}
                  >
                    <div>
                      <div className="font-semibold text-sm" style={{ color: 'var(--color-text)', fontFamily: 'Cormorant Garamond, serif', fontSize: '16px' }}>
                        Season {a.season}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                        {a.totalRounds} rounds · Archived {new Date(a.archivedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {a.champion && (
                        <div className="text-right hidden sm:block">
                          <div className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>Champion</div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{a.champion.name}</div>
                        </div>
                      )}
                      {expandedArchive === a.id ? <ChevronDown size={16} style={{ color: 'var(--color-muted)' }} /> : <ChevronRight size={16} style={{ color: 'var(--color-muted)' }} />}
                    </div>
                  </button>
                  {expandedArchive === a.id && (
                    <div className="p-4 border-t space-y-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Champion', value: a.champion?.name || '—', sub: `${a.champion?.points || 0} pts` },
                          { label: 'Rounds', value: a.totalRounds },
                          { label: 'Skins Champ', value: a.skinsChampion?.name || '—', sub: `${a.skinsChampion?.skins || 0} skins` },
                          { label: 'CTP Champ', value: a.ctpChampion?.name || '—', sub: `${a.ctpChampion?.wins || 0} wins` },
                        ].map(({ label, value, sub }) => (
                          <div key={label} className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--color-surface)' }}>
                            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{label}</div>
                            <div className="text-base font-bold mt-0.5" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>{value}</div>
                            {sub && <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{sub}</div>}
                          </div>
                        ))}
                      </div>
                      {a.topStandings?.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-muted)' }}>Final Standings</div>
                          <div className="space-y-1">
                            {a.topStandings.slice(0, 5).map((row, i) => (
                              <div key={i} className="flex items-center gap-2 py-1">
                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                  style={{ backgroundColor: i === 0 ? 'var(--color-accent)' : 'rgba(107,114,128,0.12)', color: i === 0 ? 'var(--color-primary)' : 'var(--color-muted)' }}>
                                  {i + 1}
                                </span>
                                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--color-text)' }}>{row.name}</span>
                                <span className="text-xs" style={{ color: 'var(--color-accent)' }}>{row.points}pt</span>
                                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{row.avgNet} avg net</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

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
