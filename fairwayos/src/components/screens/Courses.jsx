import { useState, useMemo, useCallback } from 'react';
import { Search, Plus, MapPin, ChevronRight, X, Globe, Loader2, AlertCircle, CheckCircle2, ChevronLeft } from 'lucide-react';
import { TopBar } from '../layout/TopBar';
import { Card, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { COURSE_DATABASE } from '../../data/courses';

// ─── helpers ─────────────────────────────────────────────────────────────────

function blankHoles(teeNames = []) {
  return Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: 4,
    strokeIndex: i + 1,
    yardages: Object.fromEntries(teeNames.map(n => [n, ''])),
  }));
}

function blankForm() {
  return {
    name: '', city: '', state: '', country: 'USA', par: 72,
    tees: [{ name: 'Blue', rating: 72.0, slope: 130, yardage: 6500 }],
  };
}

function siValid(holes) {
  const used = holes.map(h => parseInt(h.strokeIndex)).filter(Boolean);
  const unique = new Set(used);
  return unique.size === 18 && Math.min(...used) === 1 && Math.max(...used) === 18;
}

// ─── GHIN search ─────────────────────────────────────────────────────────────

async function searchGHIN(name, state) {
  const params = new URLSearchParams({
    CourseStatus: 'A',
    CountryCode: 'US',
    PerPage: '30',
    Page: '1',
    Name: name,
  });
  if (state) params.set('State', state.toUpperCase().slice(0, 2));

  const res = await fetch(`https://api.ghin.com/api/v1/courses.json?${params}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.Courses || []).map(c => ({
    _source: 'ghin',
    _ghinId: c.CourseID,
    name: c.CourseName,
    city: c.City || '',
    state: c.State || '',
    country: 'USA',
    par: 72,
    tees: (c.Ratings || []).map(r => ({
      name: r.TeeName?.replace(/\s*(Men|Women|Male|Female)\s*/i, '').trim() || r.TeeName,
      rating: parseFloat(r.CourseRating) || 72.0,
      slope: parseInt(r.SlopeRating) || 130,
      yardage: parseInt(r.Yardage) || 0,
    })).filter((t, i, arr) => arr.findIndex(x => x.name === t.name) === i),
  }));
}

// ─── sub-components ──────────────────────────────────────────────────────────

function ScorecardGrid({ tees, holes, onChange }) {
  const front = holes.slice(0, 9);
  const back = holes.slice(9);

  const totalPar = (arr) => arr.reduce((s, h) => s + (parseInt(h.par) || 0), 0);
  const totalYd = (arr, tee) => arr.reduce((s, h) => s + (parseInt(h.yardages?.[tee]) || 0), 0);

  const updateHole = (idx, field, value) => {
    onChange(holes.map((h, i) => i === idx ? { ...h, [field]: value } : h));
  };
  const updateYardage = (idx, tee, value) => {
    onChange(holes.map((h, i) => i === idx
      ? { ...h, yardages: { ...h.yardages, [tee]: value } }
      : h));
  };

  const siDupes = useMemo(() => {
    const counts = {};
    holes.forEach(h => { const v = parseInt(h.strokeIndex); if (v) counts[v] = (counts[v] || 0) + 1; });
    return new Set(Object.entries(counts).filter(([, c]) => c > 1).map(([v]) => parseInt(v)));
  }, [holes]);

  const colCount = 3 + tees.length;

  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: `${200 + tees.length * 80}px` }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
            <th className="px-2 py-1.5 text-left text-xs sticky left-0 z-10" style={{ backgroundColor: 'var(--color-primary)', width: 40 }}>Hole</th>
            <th className="px-2 py-1.5 text-center text-xs" style={{ width: 52 }}>Par</th>
            <th className="px-2 py-1.5 text-center text-xs" style={{ width: 48 }}>S.I.</th>
            {tees.map(t => (
              <th key={t.name} className="px-2 py-1.5 text-center text-xs" style={{ width: 70 }}>{t.name || '—'}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[front, back].map((half, hi) => (
            <>
              {half.map((hole, localIdx) => {
                const idx = hi * 9 + localIdx;
                const siNum = parseInt(hole.strokeIndex);
                const siErr = siNum && siDupes.has(siNum);
                return (
                  <tr key={hole.number} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: idx % 2 === 0 ? 'var(--color-surface)' : 'rgba(27,67,50,0.02)' }}>
                    <td className="px-2 py-1 text-xs font-semibold text-center sticky left-0" style={{ backgroundColor: idx % 2 === 0 ? 'var(--color-surface)' : 'rgba(249,246,240,0.98)', color: 'var(--color-primary)' }}>
                      {hole.number}
                    </td>
                    <td className="py-1 text-center">
                      <select
                        value={hole.par}
                        onChange={e => updateHole(idx, 'par', parseInt(e.target.value))}
                        className="w-11 px-1 py-0.5 rounded border text-xs text-center"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      >
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </td>
                    <td className="py-1 text-center">
                      <input
                        type="number"
                        min={1}
                        max={18}
                        value={hole.strokeIndex}
                        onChange={e => updateHole(idx, 'strokeIndex', e.target.value)}
                        className="w-11 px-1 py-0.5 rounded border text-xs text-center"
                        style={{
                          borderColor: siErr ? 'var(--color-danger)' : 'var(--color-border)',
                          color: siErr ? 'var(--color-danger)' : 'var(--color-text)',
                        }}
                      />
                    </td>
                    {tees.map(t => (
                      <td key={t.name} className="py-1 text-center">
                        <input
                          type="number"
                          min={0}
                          value={hole.yardages?.[t.name] ?? ''}
                          onChange={e => updateYardage(idx, t.name, e.target.value)}
                          placeholder="—"
                          className="w-16 px-1 py-0.5 rounded border text-xs text-center"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr key={`sub-${hi}`} style={{ backgroundColor: 'rgba(27,67,50,0.06)', borderBottom: '2px solid var(--color-border)' }}>
                <td className="px-2 py-1 text-xs font-bold sticky left-0" style={{ backgroundColor: 'rgba(27,67,50,0.06)', color: 'var(--color-primary)' }}>
                  {hi === 0 ? 'OUT' : 'IN'}
                </td>
                <td className="py-1 text-center text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
                  {totalPar(half)}
                </td>
                <td />
                {tees.map(t => (
                  <td key={t.name} className="py-1 text-center text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                    {totalYd(half, t.name) || '—'}
                  </td>
                ))}
              </tr>
            </>
          ))}
          <tr style={{ backgroundColor: 'rgba(184,151,42,0.08)' }}>
            <td className="px-2 py-1.5 text-xs font-bold sticky left-0" style={{ backgroundColor: 'rgba(184,151,42,0.08)', color: 'var(--color-accent)' }}>TOT</td>
            <td className="py-1.5 text-center text-sm font-bold" style={{ color: 'var(--color-accent)' }}>
              {totalPar(holes)}
            </td>
            <td />
            {tees.map(t => (
              <td key={t.name} className="py-1.5 text-center text-xs font-bold" style={{ color: 'var(--color-accent)' }}>
                {totalYd(holes, t.name) || '—'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function Courses({ courses, setCourses, league, setLeague }) {
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addTab, setAddTab] = useState('library');

  // Online search state
  const [onlineQuery, setOnlineQuery] = useState('');
  const [onlineStateFilter, setOnlineStateFilter] = useState('');
  const [onlineResults, setOnlineResults] = useState(null); // null = not yet searched
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState('');

  // Library search
  const [librarySearch, setLibrarySearch] = useState('');

  // Add course form (multi-step)
  const [addStep, setAddStep] = useState(1);
  const [addForm, setAddForm] = useState(blankForm());
  const [holeData, setHoleData] = useState(() => blankHoles(['Blue']));

  const filtered = useMemo(() =>
    courses.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase()) ||
      c.state.toLowerCase().includes(search.toLowerCase())
    ),
    [courses, search]
  );

  const resetAdd = () => {
    setAddTab('library');
    setAddStep(1);
    setAddForm(blankForm());
    setHoleData(blankHoles(['Blue']));
    setLibrarySearch('');
    setOnlineQuery('');
    setOnlineStateFilter('');
    setOnlineResults(null);
    setOnlineError('');
    setOnlineLoading(false);
  };

  const closeAdd = () => { setShowAdd(false); resetAdd(); };

  // Sync holeData tee columns when tees change
  const syncTeesToHoles = useCallback((newTees, currentHoles) => {
    const teeNames = newTees.map(t => t.name).filter(Boolean);
    return currentHoles.map(h => ({
      ...h,
      yardages: Object.fromEntries(
        teeNames.map(n => [n, h.yardages?.[n] ?? ''])
      ),
    }));
  }, []);

  const updateTee = (i, field, value) => {
    const newTees = addForm.tees.map((t, ti) =>
      ti === i ? { ...t, [field]: field === 'name' ? value : parseFloat(value) || t[field] } : t
    );
    setAddForm(f => ({ ...f, tees: newTees }));
    setHoleData(h => syncTeesToHoles(newTees, h));
  };

  const addTee = () => {
    const newTees = [...addForm.tees, { name: '', rating: 70.0, slope: 120, yardage: 6000 }];
    setAddForm(f => ({ ...f, tees: newTees }));
    setHoleData(h => syncTeesToHoles(newTees, h));
  };

  const removeTee = (i) => {
    const newTees = addForm.tees.filter((_, ti) => ti !== i);
    setAddForm(f => ({ ...f, tees: newTees }));
    setHoleData(h => syncTeesToHoles(newTees, h));
  };

  // Pre-fill form from a search result (library or GHIN)
  const selectForManualEntry = (result) => {
    const newForm = {
      name: result.name || '',
      city: result.city || '',
      state: result.state || '',
      country: result.country || 'USA',
      par: result.par || 72,
      tees: result.tees?.length
        ? result.tees
        : [{ name: 'Blue', rating: 72.0, slope: 130, yardage: 6500 }],
    };
    setAddForm(newForm);
    setHoleData(blankHoles(newForm.tees.map(t => t.name).filter(Boolean)));
    setAddTab('manual');
    setAddStep(2);
  };

  const saveNewCourse = () => {
    if (!addForm.name || !addForm.city || !addForm.state) return;
    const newCourse = {
      id: `course-${Date.now()}`,
      ...addForm,
      par: parseInt(addForm.par),
      holes: holeData.map(h => ({
        number: h.number,
        par: parseInt(h.par) || 4,
        strokeIndex: parseInt(h.strokeIndex) || h.number,
        yardages: Object.fromEntries(
          Object.entries(h.yardages).map(([k, v]) => [k, parseInt(v) || 0])
        ),
      })),
    };
    setCourses(prev => [...prev, newCourse]);
    closeAdd();
  };

  // GHIN online search
  const doOnlineSearch = async () => {
    if (!onlineQuery.trim()) return;
    setOnlineLoading(true);
    setOnlineError('');
    setOnlineResults(null);
    try {
      const results = await searchGHIN(onlineQuery.trim(), onlineStateFilter.trim());
      setOnlineResults(results);
      if (results.length === 0) setOnlineError('No courses found. Try a shorter name or different state.');
    } catch (e) {
      const isCors = e instanceof TypeError && e.message.toLowerCase().includes('fetch');
      setOnlineError(
        isCors
          ? 'Network blocked (CORS). Ratings/slope data must be entered manually — you can still look them up at usga.org/handicapping.'
          : `Search failed: ${e.message}`
      );
      setOnlineResults([]);
    } finally {
      setOnlineLoading(false);
    }
  };

  // ── Course detail view ─────────────────────────────────────────────────────

  if (selectedCourse) {
    const course = courses.find(c => c.id === selectedCourse);
    if (!course) { setSelectedCourse(null); return null; }
    const isHome = league?.homeCourseId === course.id;
    return (
      <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-4 border-b" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <button onClick={() => setSelectedCourse(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={18} style={{ color: 'var(--color-muted)' }} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>{course.name}</h1>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{course.city}, {course.state}</p>
          </div>
          <div className="flex gap-2">
            {isHome ? (
              <Badge variant="accent">★ Home Course</Badge>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setLeague(prev => ({ ...prev, homeCourseId: course.id }))}>
                Set as Home Course
              </Button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5 max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {course.tees.map(tee => (
              <Card key={tee.name} className="text-center">
                <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{
                  backgroundColor: { Black: '#1a1a1a', Blue: '#1d4ed8', White: '#e5e7eb', Gold: '#b8972a', Red: '#dc2626', Silver: '#94a3b8', Green: '#16a34a' }[tee.name] || '#999'
                }} />
                <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{tee.name}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{tee.yardage} yds</div>
                <div className="text-xs font-medium mt-0.5" style={{ color: 'var(--color-primary)' }}>{tee.rating} / {tee.slope}</div>
              </Card>
            ))}
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <CardTitle>Full Scorecard</CardTitle>
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs" style={{ borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                    <th className="px-3 py-2 text-left sticky left-0 z-10" style={{ backgroundColor: 'var(--color-primary)', minWidth: '80px' }}>Hole</th>
                    {course.holes.slice(0, 9).map(h => <th key={h.number} className="py-2 text-center" style={{ minWidth: '42px' }}>{h.number}</th>)}
                    <th className="py-2 text-center px-2" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>OUT</th>
                    {course.holes.slice(9).map(h => <th key={h.number} className="py-2 text-center" style={{ minWidth: '42px' }}>{h.number}</th>)}
                    <th className="py-2 text-center px-2" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>IN</th>
                    <th className="py-2 text-center px-2" style={{ backgroundColor: 'rgba(184,151,42,0.3)' }}>TOT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(27,67,50,0.04)' }}>
                    <td className="px-3 py-2 font-semibold sticky left-0" style={{ backgroundColor: 'rgba(27,67,50,0.04)', color: 'var(--color-primary)' }}>Par</td>
                    {course.holes.slice(0, 9).map(h => <td key={h.number} className="py-2 text-center font-semibold" style={{ color: 'var(--color-primary)' }}>{h.par}</td>)}
                    <td className="py-2 text-center font-bold px-2" style={{ backgroundColor: 'rgba(27,67,50,0.08)', color: 'var(--color-primary)' }}>{course.holes.slice(0, 9).reduce((s, h) => s + h.par, 0)}</td>
                    {course.holes.slice(9).map(h => <td key={h.number} className="py-2 text-center font-semibold" style={{ color: 'var(--color-primary)' }}>{h.par}</td>)}
                    <td className="py-2 text-center font-bold px-2" style={{ backgroundColor: 'rgba(27,67,50,0.08)', color: 'var(--color-primary)' }}>{course.holes.slice(9).reduce((s, h) => s + h.par, 0)}</td>
                    <td className="py-2 text-center font-bold px-2" style={{ backgroundColor: 'rgba(184,151,42,0.1)', color: 'var(--color-accent)' }}>{course.par}</td>
                  </tr>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <td className="px-3 py-1.5 text-xs italic sticky left-0" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-muted)' }}>S.I.</td>
                    {course.holes.slice(0, 9).map(h => <td key={h.number} className="py-1.5 text-center" style={{ color: 'var(--color-muted)' }}>{h.strokeIndex}</td>)}
                    <td style={{ backgroundColor: 'rgba(27,67,50,0.04)' }} />
                    {course.holes.slice(9).map(h => <td key={h.number} className="py-1.5 text-center" style={{ color: 'var(--color-muted)' }}>{h.strokeIndex}</td>)}
                    <td style={{ backgroundColor: 'rgba(27,67,50,0.04)' }} />
                    <td />
                  </tr>
                  {course.tees.map(tee => (
                    <tr key={tee.name} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="px-3 py-2 sticky left-0" style={{ backgroundColor: 'var(--color-surface)' }}>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: { Black: '#1a1a1a', Blue: '#1d4ed8', White: '#9ca3af', Gold: '#b8972a', Red: '#dc2626', Silver: '#94a3b8', Green: '#16a34a' }[tee.name] || '#999' }} />
                          <span className="font-medium text-xs" style={{ color: 'var(--color-text)' }}>{tee.name}</span>
                        </div>
                      </td>
                      {course.holes.slice(0, 9).map(h => <td key={h.number} className="py-2 text-center text-xs" style={{ color: 'var(--color-muted)' }}>{h.yardages?.[tee.name] || '—'}</td>)}
                      <td className="py-2 text-center font-medium text-xs px-2" style={{ backgroundColor: 'rgba(27,67,50,0.04)', color: 'var(--color-text)' }}>
                        {course.holes.slice(0, 9).reduce((s, h) => s + (h.yardages?.[tee.name] || 0), 0)}
                      </td>
                      {course.holes.slice(9).map(h => <td key={h.number} className="py-2 text-center text-xs" style={{ color: 'var(--color-muted)' }}>{h.yardages?.[tee.name] || '—'}</td>)}
                      <td className="py-2 text-center font-medium text-xs px-2" style={{ backgroundColor: 'rgba(27,67,50,0.04)', color: 'var(--color-text)' }}>
                        {course.holes.slice(9).reduce((s, h) => s + (h.yardages?.[tee.name] || 0), 0)}
                      </td>
                      <td className="py-2 text-center font-bold text-xs px-2" style={{ backgroundColor: 'rgba(184,151,42,0.06)', color: 'var(--color-accent)' }}>
                        {tee.yardage}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── Course list view ───────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <TopBar title="Courses" subtitle={`${courses.length} course${courses.length !== 1 ? 's' : ''}`}>
        <Button variant="primary" size="md" onClick={() => { setShowAdd(true); }}>
          <Plus size={15} className="mr-1.5" /> Add Course
        </Button>
      </TopBar>

      <div className="p-6 space-y-5 max-w-5xl mx-auto">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
          <input
            type="text"
            placeholder="Search courses…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
          />
        </div>

        <div className="space-y-2">
          {filtered.map(course => {
            const isHome = league?.homeCourseId === course.id;
            return (
              <div
                key={course.id}
                className="flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: isHome ? 'var(--color-accent)' : 'var(--color-border)',
                  boxShadow: isHome ? '0 0 0 1px var(--color-accent)' : 'none',
                }}
                onClick={() => setSelectedCourse(course.id)}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isHome ? 'rgba(184,151,42,0.15)' : 'rgba(27,67,50,0.08)' }}>
                  <MapPin size={18} style={{ color: isHome ? 'var(--color-accent)' : 'var(--color-primary)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{course.name}</span>
                    {isHome && <Badge variant="accent">★ Home</Badge>}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {course.city}, {course.state} · Par {course.par}
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Rating / Slope</div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                      {course.tees[0]?.rating} / {course.tees[0]?.slope}
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Tees</div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{course.tees.length}</div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--color-muted)' }} />
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center py-10 text-sm" style={{ color: 'var(--color-muted)' }}>No courses match your search.</p>
          )}
        </div>
      </div>

      {/* ── Add Course Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={showAdd} onClose={closeAdd} title={addStep === 2 ? 'Enter Scorecard' : 'Add Course'} size="lg">
        <div className="space-y-4">

          {/* Step 1 — find or enter basic info */}
          {addStep === 1 && (
            <>
              {/* Tab bar */}
              <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
                {[['library', 'Browse Library'], ['online', 'Search Online'], ['manual', 'Enter Manually']].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setAddTab(id)}
                    className="flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: addTab === id ? 'var(--color-primary)' : 'transparent',
                      color: addTab === id ? 'white' : 'var(--color-muted)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Browse Library ── */}
              {addTab === 'library' && (() => {
                const existingIds = new Set(courses.map(c => c.id));
                const unadded = COURSE_DATABASE.filter(c => !existingIds.has(c.id));
                const lq = librarySearch.toLowerCase();
                const displayed = librarySearch
                  ? unadded.filter(c =>
                      c.name.toLowerCase().includes(lq) ||
                      c.city.toLowerCase().includes(lq) ||
                      c.state.toLowerCase().includes(lq)
                    )
                  : unadded.slice(0, 25);

                return (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
                      <input
                        type="text"
                        placeholder="Search 60 built-in courses…"
                        value={librarySearch}
                        onChange={e => setLibrarySearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm"
                        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                        autoFocus
                      />
                    </div>
                    {unadded.length === 0 ? (
                      <p className="text-center py-8 text-sm" style={{ color: 'var(--color-muted)' }}>All library courses are already added.</p>
                    ) : displayed.length === 0 ? (
                      <div className="text-center py-8 space-y-2">
                        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No match in library.</p>
                        <button onClick={() => setAddTab('online')} className="text-xs font-medium underline" style={{ color: 'var(--color-primary)' }}>
                          Search online instead
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-72 overflow-y-auto">
                        {displayed.map(course => (
                          <button
                            key={course.id}
                            onClick={() => { setCourses(prev => [...prev, course]); closeAdd(); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all hover:shadow-sm"
                            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary-light)'; e.currentTarget.style.backgroundColor = 'rgba(27,67,50,0.04)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.backgroundColor = 'var(--color-surface)'; }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{course.name}</div>
                              <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{course.city}, {course.state}</div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 text-xs" style={{ color: 'var(--color-muted)' }}>
                              <span>Par {course.par}</span>
                              <span>{course.tees.length} tees</span>
                              <CheckCircle2 size={14} style={{ color: 'var(--color-primary)' }} />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── Search Online ── */}
              {addTab === 'online' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
                      <input
                        type="text"
                        placeholder="Course name…"
                        value={onlineQuery}
                        onChange={e => setOnlineQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && doOnlineSearch()}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                        autoFocus
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="State"
                      value={onlineStateFilter}
                      onChange={e => setOnlineStateFilter(e.target.value.slice(0, 2))}
                      onKeyDown={e => e.key === 'Enter' && doOnlineSearch()}
                      className="w-16 px-2 py-2 rounded-lg border text-sm text-center"
                      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                    />
                    <Button variant="primary" size="sm" onClick={doOnlineSearch} disabled={onlineLoading || !onlineQuery.trim()}>
                      {onlineLoading ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                    </Button>
                  </div>

                  {onlineError && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs" style={{ backgroundColor: 'rgba(220,38,38,0.06)', color: 'var(--color-danger)', border: '1px solid rgba(220,38,38,0.2)' }}>
                      <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                      <span>{onlineError}</span>
                    </div>
                  )}

                  {onlineResults !== null && onlineResults.length > 0 && (
                    <div className="space-y-1 max-h-72 overflow-y-auto">
                      {onlineResults.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => selectForManualEntry(c)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all hover:shadow-sm"
                          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary-light)'; e.currentTarget.style.backgroundColor = 'rgba(27,67,50,0.04)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.backgroundColor = 'var(--color-surface)'; }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{c.name}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                              {c.city}{c.city && c.state ? ', ' : ''}{c.state}
                              {c.tees?.length ? ` · ${c.tees.length} tee${c.tees.length !== 1 ? 's' : ''} found` : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {c.tees?.length > 0 && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(27,67,50,0.08)', color: 'var(--color-primary)' }}>
                                Ratings found
                              </span>
                            )}
                            <ChevronRight size={14} style={{ color: 'var(--color-muted)' }} />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {onlineResults !== null && onlineResults.length === 0 && !onlineError && (
                    <div className="text-center py-6 space-y-2">
                      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No courses found online.</p>
                      <button onClick={() => setAddTab('manual')} className="text-xs font-medium underline" style={{ color: 'var(--color-primary)' }}>
                        Enter course details manually
                      </button>
                    </div>
                  )}

                  {onlineResults === null && !onlineLoading && (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--color-muted)' }}>
                      Searches the USGA GHIN database for course ratings and slope.
                    </p>
                  )}
                </div>
              )}

              {/* ── Enter Manually ── */}
              {addTab === 'manual' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Input label="Course Name" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Idyl Wyld Golf Club" autoFocus />
                    </div>
                    <Input label="City" value={addForm.city} onChange={e => setAddForm(f => ({ ...f, city: e.target.value }))} />
                    <Input label="State" value={addForm.state} onChange={e => setAddForm(f => ({ ...f, state: e.target.value }))} placeholder="MI" />
                    <Input label="Par" type="number" value={addForm.par} onChange={e => setAddForm(f => ({ ...f, par: e.target.value }))} />
                    <Input label="Country" value={addForm.country} onChange={e => setAddForm(f => ({ ...f, country: e.target.value }))} />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Tee Boxes</label>
                      <Button variant="ghost" size="sm" onClick={addTee}><Plus size={13} className="mr-1" /> Add Tee</Button>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-5 gap-2 px-1">
                        {['Name', 'Rating', 'Slope', 'Total Yds', ''].map(h => (
                          <div key={h} className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>{h}</div>
                        ))}
                      </div>
                      {addForm.tees.map((tee, i) => (
                        <div key={i} className="grid grid-cols-5 gap-2 items-center">
                          <input placeholder="Name" value={tee.name} onChange={e => updateTee(i, 'name', e.target.value)}
                            className="px-2 py-1.5 rounded border text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                          <input placeholder="72.0" type="number" step="0.1" value={tee.rating} onChange={e => updateTee(i, 'rating', e.target.value)}
                            className="px-2 py-1.5 rounded border text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                          <input placeholder="130" type="number" value={tee.slope} onChange={e => updateTee(i, 'slope', e.target.value)}
                            className="px-2 py-1.5 rounded border text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                          <input placeholder="6500" type="number" value={tee.yardage} onChange={e => updateTee(i, 'yardage', e.target.value)}
                            className="px-2 py-1.5 rounded border text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                          <button onClick={() => removeTee(i)} className="p-1.5 rounded hover:bg-red-50 justify-self-start">
                            <X size={14} style={{ color: 'var(--color-danger)' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="secondary" onClick={closeAdd}>Cancel</Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        setHoleData(blankHoles(addForm.tees.map(t => t.name).filter(Boolean)));
                        setAddStep(2);
                      }}
                      disabled={!addForm.name || !addForm.city || !addForm.state}
                    >
                      Next: Scorecard →
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 2 — scorecard entry */}
          {addStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <button onClick={() => setAddStep(1)} className="p-1 rounded hover:bg-gray-100">
                  <ChevronLeft size={16} style={{ color: 'var(--color-muted)' }} />
                </button>
                <div className="flex-1">
                  <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{addForm.name}</div>
                  <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{addForm.city}, {addForm.state} · Par {addForm.par}</div>
                </div>
              </div>

              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                Enter par and stroke index for each hole. Yardages are optional but improve handicap calculations.
                {!siValid(holeData) && <span className="ml-1 font-medium" style={{ color: 'var(--color-danger)' }}>Stroke indexes must be unique 1–18.</span>}
              </p>

              <ScorecardGrid
                tees={addForm.tees.filter(t => t.name)}
                holes={holeData}
                onChange={setHoleData}
              />

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="secondary" onClick={closeAdd}>Cancel</Button>
                <Button
                  variant="primary"
                  onClick={saveNewCourse}
                  disabled={!addForm.name || !addForm.city || !addForm.state}
                >
                  Add Course
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
