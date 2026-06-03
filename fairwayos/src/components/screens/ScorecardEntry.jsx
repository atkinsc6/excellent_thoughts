import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { Save, Plus, ChevronDown } from 'lucide-react';
import { TopBar } from '../layout/TopBar';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { calcCourseHandicap, calcPlayingHandicap, strokesReceivedPerHole, calcNetScore, calcStableford, adjustedGross, calcDifferential } from '../../utils/scoring';
import { calcSkins } from '../../utils/skins';

function initScores(playerIds) {
  const s = {};
  playerIds.forEach(id => { s[id] = Array(18).fill(''); });
  return s;
}

export function ScorecardEntry({ players, rounds, setRounds, courses }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [tee, setTee] = useState(courses[0]?.tees[1]?.name || 'Blue');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(players.map(p => p.id));
  const [scores, setScores] = useState(initScores(players.map(p => p.id)));
  const [editingCell, setEditingCell] = useState(null); // { playerId, holeIdx }
  const [ctpHole, setCtpHole] = useState('');
  const [ctpWinner, setCtpWinner] = useState('');
  const [ctpResults, setCtpResults] = useState([]);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState('');

  const course = useMemo(() => courses.find(c => c.id === courseId), [courses, courseId]);
  const teeObj = useMemo(() => course?.tees.find(t => t.name === tee), [course, tee]);

  // When course changes, set default tee
  const handleCourseChange = (cId) => {
    setCourseId(cId);
    const c = courses.find(cc => cc.id === cId);
    if (c) setTee(c.tees[1]?.name || c.tees[0]?.name || 'Blue');
  };

  const togglePlayer = (pid) => {
    setSelectedPlayerIds(prev =>
      prev.includes(pid)
        ? prev.filter(id => id !== pid)
        : [...prev, pid]
    );
  };

  const handleScoreChange = (playerId, holeIdx, value) => {
    const v = value === '' ? '' : parseInt(value, 10);
    if (value !== '' && (isNaN(v) || v < 1 || v > 20)) return;
    setScores(prev => ({ ...prev, [playerId]: prev[playerId].map((s, i) => i === holeIdx ? (value === '' ? '' : v) : s) }));
  };

  const addCtp = () => {
    if (!ctpHole || !ctpWinner) return;
    setCtpResults(prev => [...prev.filter(c => c.hole !== parseInt(ctpHole)), { hole: parseInt(ctpHole), winnerId: ctpWinner, distance: '' }]);
    setCtpHole('');
    setCtpWinner('');
  };

  // Computed per-player stats
  const computedScores = useMemo(() => {
    if (!course || !teeObj) return {};
    return Object.fromEntries(selectedPlayerIds.map(pid => {
      const player = players.find(p => p.id === pid);
      if (!player) return [pid, null];
      const gross = scores[pid] || Array(18).fill('');
      const courseHcp = calcCourseHandicap(player.handicapIndex, teeObj.slope, teeObj.rating, course.par);
      const playingHcp = calcPlayingHandicap(courseHcp, 0.95);
      const strokes = strokesReceivedPerHole(course.holes, playingHcp);
      const netScores = gross.map((g, i) => (g !== '' ? calcNetScore(Number(g), strokes[i]) : ''));
      const stablefordPts = gross.map((g, i) => (g !== '' ? calcStableford(Number(g), course.holes[i].par, strokes[i]) : ''));
      const filledGross = gross.filter(g => g !== '').map(Number);
      const filledNet = netScores.filter(n => n !== '');
      const totalGross = filledGross.reduce((s, v) => s + v, 0);
      const totalNet = filledNet.reduce((s, v) => s + Number(v), 0);
      const totalStableford = stablefordPts.filter(p => p !== '').reduce((s, v) => s + Number(v), 0);
      const outGross = gross.slice(0, 9).filter(g => g !== '').map(Number).reduce((s, v) => s + v, 0);
      const inGross = gross.slice(9).filter(g => g !== '').map(Number).reduce((s, v) => s + v, 0);
      const outNet = netScores.slice(0, 9).filter(n => n !== '').reduce((s, v) => s + Number(v), 0);
      const inNet = netScores.slice(9).filter(n => n !== '').reduce((s, v) => s + Number(v), 0);
      return [pid, { playingHcp, strokes, netScores, stablefordPts, totalGross, totalNet, totalStableford, outGross, inGross, outNet, inNet }];
    }));
  }, [scores, selectedPlayerIds, players, course, teeObj]);

  const skinsPreview = useMemo(() => {
    if (!course) return [];
    const playerScores = selectedPlayerIds.map(pid => {
      const cs = computedScores[pid];
      return {
        playerId: pid,
        grossScores: scores[pid]?.map(s => s === '' ? 0 : Number(s)) || Array(18).fill(0),
        netScores: cs?.netScores?.map(n => n === '' ? 0 : Number(n)) || Array(18).fill(0),
      };
    }).filter(ps => ps.grossScores.some(g => g > 0));
    if (!playerScores.length) return [];
    return calcSkins(course.holes, playerScores, 'gross');
  }, [scores, selectedPlayerIds, computedScores, course]);

  const handleSave = () => {
    if (!course || !teeObj) { setErrors('Please select a course and tee.'); return; }
    if (selectedPlayerIds.length === 0) { setErrors('Please select at least one player.'); return; }

    const playerScores = selectedPlayerIds.map(pid => {
      const player = players.find(p => p.id === pid);
      const gross = scores[pid]?.map(s => s === '' ? 0 : Number(s)) || Array(18).fill(0);
      const cs = computedScores[pid];
      const adjGross = adjustedGross(gross.filter(g => g > 0), course.holes, cs?.playingHcp || 0);
      return {
        playerId: pid,
        grossScores: gross,
        netScores: cs?.netScores?.map(n => n === '' ? 0 : Number(n)) || Array(18).fill(0),
        stablefordPoints: cs?.stablefordPts?.map(p => p === '' ? 0 : Number(p)) || Array(18).fill(0),
        playingHandicap: cs?.playingHcp || 0,
        totalGross: cs?.totalGross || 0,
        totalNet: cs?.totalNet || 0,
        totalStableford: cs?.totalStableford || 0,
        adjustedGross: adjGross,
      };
    });

    const skins = calcSkins(course.holes, playerScores, 'gross');

    const newRound = {
      id: `r${Date.now()}`,
      date,
      courseId,
      tee,
      playerIds: selectedPlayerIds,
      scores: playerScores,
      ctpResults,
      skinsResults: skins,
    };

    setRounds(prev => [...prev, newRound]);
    setSaved(true);
    setErrors('');
    setTimeout(() => setSaved(false), 3000);
  };

  if (!course || !teeObj) {
    return <div className="p-6" style={{ color: 'var(--color-muted)' }}>Loading...</div>;
  }

  const parRow = course.holes.map(h => h.par);
  const siRow = course.holes.map(h => h.strokeIndex);
  const outPar = parRow.slice(0, 9).reduce((s, v) => s + v, 0);
  const inPar = parRow.slice(9).reduce((s, v) => s + v, 0);

  const ScoreCell = ({ playerId, holeIdx }) => {
    const gross = scores[playerId]?.[holeIdx];
    const par = course.holes[holeIdx]?.par;
    const net = computedScores[playerId]?.netScores[holeIdx];
    const isEditing = editingCell?.playerId === playerId && editingCell?.holeIdx === holeIdx;
    const strokes = computedScores[playerId]?.strokes[holeIdx] || 0;

    const getBg = () => {
      if (gross === '' || !gross) return 'transparent';
      const g = Number(gross);
      if (g <= par - 2) return '#7C3AED'; // eagle
      if (g === par - 1) return '#16A34A'; // birdie
      if (g === par) return 'transparent';
      if (g === par + 1) return '#FEF3C7';
      if (g >= par + 2) return '#FEE2E2';
      return 'transparent';
    };
    const getColor = () => {
      if (gross === '' || !gross) return 'var(--color-text)';
      const g = Number(gross);
      if (g <= par - 1) return 'white';
      return 'var(--color-text)';
    };

    return (
      <td
        className="score-cell relative"
        style={{ padding: '2px', minWidth: '40px' }}
        onClick={() => setEditingCell({ playerId, holeIdx })}
      >
        {isEditing ? (
          <input
            autoFocus
            type="number"
            min="1"
            max="20"
            value={gross ?? ''}
            onChange={e => handleScoreChange(playerId, holeIdx, e.target.value)}
            onBlur={() => setEditingCell(null)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                setEditingCell(null);
                // move to next hole
                const nextHole = holeIdx + 1;
                if (nextHole < 18) setEditingCell({ playerId, holeIdx: nextHole });
              }
            }}
            className="w-full text-center text-sm font-medium border-2 rounded"
            style={{ borderColor: 'var(--color-accent)', outline: 'none', height: '32px', width: '38px' }}
          />
        ) : (
          <div
            className="w-[38px] h-[32px] flex flex-col items-center justify-center rounded text-xs font-semibold cursor-pointer"
            style={{ backgroundColor: getBg(), color: getColor(), border: `1px solid ${getBg() !== 'transparent' ? 'transparent' : 'var(--color-border)'}` }}
          >
            <span>{gross || '-'}</span>
            {strokes > 0 && gross !== '' && (
              <span style={{ fontSize: '8px', color: strokes > 0 ? 'var(--color-accent)' : 'transparent', lineHeight: 1 }}>
                {'•'.repeat(strokes)}
              </span>
            )}
          </div>
        )}
      </td>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <TopBar title="Scorecard Entry" subtitle="Enter scores for a new round">
        <Button onClick={handleSave} variant="primary" size="md">
          <Save size={15} className="mr-1.5" />
          Save Round
        </Button>
      </TopBar>

      <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
        {errors && (
          <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--color-danger)', border: '1px solid rgba(220,38,38,0.2)' }}>
            {errors}
          </div>
        )}
        {saved && (
          <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(22,163,74,0.08)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.2)' }}>
            Round saved successfully!
          </div>
        )}

        {/* Round Setup */}
        <Card>
          <CardHeader><CardTitle>Round Setup</CardTitle></CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>Course</label>
              <select
                value={courseId}
                onChange={e => handleCourseChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              >
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>Tee</label>
              <select
                value={tee}
                onChange={e => setTee(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              >
                {course?.tees.map(t => (
                  <option key={t.name} value={t.name}>{t.name} ({t.rating}/{t.slope})</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <div className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Rating / Slope</div>
                <div className="font-semibold" style={{ color: 'var(--color-primary)' }}>{teeObj?.rating} / {teeObj?.slope}</div>
              </div>
            </div>
          </div>

          {/* Player selection */}
          <div className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-muted)' }}>Players in Group</label>
            <div className="flex flex-wrap gap-2">
              {players.map(p => (
                <button
                  key={p.id}
                  onClick={() => togglePlayer(p.id)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-all border"
                  style={{
                    backgroundColor: selectedPlayerIds.includes(p.id) ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: selectedPlayerIds.includes(p.id) ? 'white' : 'var(--color-muted)',
                    borderColor: selectedPlayerIds.includes(p.id) ? 'var(--color-primary)' : 'var(--color-border)',
                  }}
                >
                  {p.name.split(' ')[0]} ({p.handicapIndex})
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Scorecard Grid */}
        {selectedPlayerIds.length > 0 && (
          <Card className="overflow-hidden p-0">
            <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <CardTitle>Scorecard</CardTitle>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                Click a cell to enter score. Dots below score = handicap strokes received on hole.
              </p>
            </div>

            {/* Legend */}
            <div className="flex gap-3 px-4 py-2 flex-wrap" style={{ backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
              {[
                { bg: '#7C3AED', color: 'white', label: 'Eagle or better' },
                { bg: '#16A34A', color: 'white', label: 'Birdie' },
                { bg: '#FEF3C7', color: 'var(--color-text)', label: 'Bogey' },
                { bg: '#FEE2E2', color: 'var(--color-text)', label: 'Double+' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded text-xs flex items-center justify-center font-bold" style={{ backgroundColor: item.bg, color: item.color, fontSize: '9px' }}>4</div>
                  <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="text-xs" style={{ borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                    <th className="px-3 py-2 text-left font-semibold sticky left-0 z-10" style={{ backgroundColor: 'var(--color-primary)', minWidth: '120px' }}>Player</th>
                    {[...Array(9)].map((_, i) => (
                      <th key={i} className="py-2 font-semibold text-center" style={{ minWidth: '42px' }}>{i + 1}</th>
                    ))}
                    <th className="py-2 font-semibold text-center px-2" style={{ backgroundColor: 'var(--color-primary-light)', minWidth: '40px' }}>OUT</th>
                    {[...Array(9)].map((_, i) => (
                      <th key={i + 9} className="py-2 font-semibold text-center" style={{ minWidth: '42px' }}>{i + 10}</th>
                    ))}
                    <th className="py-2 font-semibold text-center px-2" style={{ backgroundColor: 'var(--color-primary-light)', minWidth: '40px' }}>IN</th>
                    <th className="py-2 font-semibold text-center px-2" style={{ backgroundColor: 'rgba(184,151,42,0.3)', minWidth: '44px' }}>TOT</th>
                    <th className="py-2 font-semibold text-center px-2" style={{ minWidth: '44px' }}>NET</th>
                    <th className="py-2 font-semibold text-center px-2" style={{ minWidth: '44px' }}>STAB</th>
                  </tr>
                  <tr style={{ backgroundColor: 'rgba(27,67,50,0.06)', borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-3 py-1.5 font-semibold sticky left-0 z-10 text-xs" style={{ backgroundColor: 'rgba(27,67,50,0.06)', color: 'var(--color-muted)' }}>Par</td>
                    {parRow.slice(0, 9).map((p, i) => <td key={i} className="py-1.5 text-center font-semibold" style={{ color: 'var(--color-primary)' }}>{p}</td>)}
                    <td className="py-1.5 text-center font-bold px-2" style={{ backgroundColor: 'rgba(27,67,50,0.1)', color: 'var(--color-primary)' }}>{outPar}</td>
                    {parRow.slice(9).map((p, i) => <td key={i + 9} className="py-1.5 text-center font-semibold" style={{ color: 'var(--color-primary)' }}>{p}</td>)}
                    <td className="py-1.5 text-center font-bold px-2" style={{ backgroundColor: 'rgba(27,67,50,0.1)', color: 'var(--color-primary)' }}>{inPar}</td>
                    <td className="py-1.5 text-center font-bold px-2" style={{ backgroundColor: 'rgba(184,151,42,0.15)', color: 'var(--color-accent)' }}>{course.par}</td>
                    <td className="py-1.5 text-center" style={{ color: 'var(--color-muted)' }}>—</td>
                    <td className="py-1.5 text-center" style={{ color: 'var(--color-muted)' }}>—</td>
                  </tr>
                  <tr style={{ backgroundColor: 'rgba(27,67,50,0.03)', borderBottom: '2px solid var(--color-border)' }}>
                    <td className="px-3 py-1.5 text-xs sticky left-0 z-10" style={{ backgroundColor: 'rgba(27,67,50,0.03)', color: 'var(--color-muted)', fontStyle: 'italic' }}>SI</td>
                    {siRow.slice(0, 9).map((si, i) => <td key={i} className="py-1.5 text-center" style={{ color: 'var(--color-muted)' }}>{si}</td>)}
                    <td className="py-1.5" style={{ backgroundColor: 'rgba(27,67,50,0.06)' }} />
                    {siRow.slice(9).map((si, i) => <td key={i + 9} className="py-1.5 text-center" style={{ color: 'var(--color-muted)' }}>{si}</td>)}
                    <td className="py-1.5" style={{ backgroundColor: 'rgba(27,67,50,0.06)' }} />
                    <td /><td /><td />
                  </tr>
                </thead>
                <tbody>
                  {selectedPlayerIds.map(pid => {
                    const player = players.find(p => p.id === pid);
                    const cs = computedScores[pid];
                    return (
                      <tr key={pid} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td className="px-3 py-1 sticky left-0 z-10" style={{ backgroundColor: 'var(--color-surface)' }}>
                          <div className="font-semibold text-xs" style={{ color: 'var(--color-text)' }}>{player?.name.split(' ')[0]}</div>
                          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>HCP {cs?.playingHcp ?? '?'}</div>
                        </td>
                        {[...Array(9)].map((_, i) => <ScoreCell key={i} playerId={pid} holeIdx={i} />)}
                        <td className="text-center font-bold px-2" style={{ backgroundColor: 'rgba(27,67,50,0.06)', color: 'var(--color-primary)', minWidth: '40px' }}>
                          {cs?.outGross || '-'}
                        </td>
                        {[...Array(9)].map((_, i) => <ScoreCell key={i + 9} playerId={pid} holeIdx={i + 9} />)}
                        <td className="text-center font-bold px-2" style={{ backgroundColor: 'rgba(27,67,50,0.06)', color: 'var(--color-primary)' }}>
                          {cs?.inGross || '-'}
                        </td>
                        <td className="text-center font-bold px-2" style={{ backgroundColor: 'rgba(184,151,42,0.1)', color: 'var(--color-accent)' }}>
                          {cs?.totalGross || '-'}
                        </td>
                        <td className="text-center font-semibold" style={{ color: 'var(--color-primary)' }}>
                          {cs?.totalNet || '-'}
                        </td>
                        <td className="text-center font-semibold" style={{ color: 'var(--color-muted)' }}>
                          {cs?.totalStableford || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* CTP Entry */}
        <Card>
          <CardHeader><CardTitle>Closest to Pin (CTP)</CardTitle></CardHeader>
          <div className="flex gap-3 mt-2 flex-wrap items-end">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>Hole</label>
              <select
                value={ctpHole}
                onChange={e => setCtpHole(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              >
                <option value="">Select hole</option>
                {course.holes.filter(h => h.par === 3).map(h => (
                  <option key={h.number} value={h.number}>Hole {h.number} (Par 3)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>Winner</label>
              <select
                value={ctpWinner}
                onChange={e => setCtpWinner(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              >
                <option value="">Select player</option>
                {selectedPlayerIds.map(pid => {
                  const p = players.find(pl => pl.id === pid);
                  return <option key={pid} value={pid}>{p?.name}</option>;
                })}
              </select>
            </div>
            <Button onClick={addCtp} variant="secondary" size="md">
              <Plus size={14} className="mr-1" /> Add CTP
            </Button>
          </div>
          {ctpResults.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {ctpResults.map(r => {
                const p = players.find(pl => pl.id === r.winnerId);
                return (
                  <Badge key={r.hole} variant="accent">
                    Hole {r.hole}: {p?.name}
                  </Badge>
                );
              })}
            </div>
          )}
        </Card>

        {/* Skins Preview */}
        {skinsPreview.length > 0 && skinsPreview.some(s => s.winnerId) && (
          <Card>
            <CardHeader><CardTitle>Skins Preview (Gross)</CardTitle></CardHeader>
            <div className="mt-2 flex flex-wrap gap-2">
              {skinsPreview.filter(s => s.winnerId).map(s => {
                const p = players.find(pl => pl.id === s.winnerId);
                return (
                  <div key={s.hole} className="px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
                    <span style={{ color: 'var(--color-muted)' }}>H{s.hole} </span>
                    <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>{p?.name.split(' ')[0]}</span>
                    {s.pot > 1 && <span className="ml-1" style={{ color: 'var(--color-accent)' }}>×{s.pot}</span>}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} variant="primary" size="lg">
            <Save size={16} className="mr-2" />
            Save Round to League
          </Button>
        </div>
      </div>
    </div>
  );
}
