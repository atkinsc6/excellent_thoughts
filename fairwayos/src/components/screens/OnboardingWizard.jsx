import { useState } from 'react';
import { COURSE_DATABASE } from '../../data/courses';
import { Check, ChevronRight, ChevronLeft, Plus, X, Search } from 'lucide-react';

function ProgressDots({ step }) {
  // steps 1-3 shown as dots
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map(n => (
        <div
          key={n}
          className="rounded-full transition-all"
          style={{
            width: n === step ? 24 : 10,
            height: 10,
            backgroundColor:
              n < step
                ? 'var(--color-primary)'
                : n === step
                ? 'var(--color-accent)'
                : 'var(--color-border)',
          }}
        />
      ))}
    </div>
  );
}

function parsePlayerLine(line) {
  // Accepts "Name, HCP" or "Name HCP" (last token numeric)
  const trimmed = line.trim();
  if (!trimmed) return null;
  const commaIdx = trimmed.lastIndexOf(',');
  if (commaIdx !== -1) {
    const name = trimmed.slice(0, commaIdx).trim();
    const hcp = parseFloat(trimmed.slice(commaIdx + 1).trim());
    return { name, handicapIndex: isNaN(hcp) ? 0 : hcp };
  }
  // Try last token as number
  const parts = trimmed.split(/\s+/);
  const last = parts[parts.length - 1];
  const hcp = parseFloat(last);
  if (!isNaN(hcp) && parts.length > 1) {
    return { name: parts.slice(0, -1).join(' '), handicapIndex: hcp };
  }
  return { name: trimmed, handicapIndex: 0 };
}

export function OnboardingWizard({ league, setLeague, players, setPlayers, courses, setCourses, schedule, setSchedule }) {
  const [step, setStep] = useState(0);

  // Step 1 state
  const [season, setSeason] = useState(league?.season || new Date().getFullYear().toString());
  const [scoringFormats, setScoringFormats] = useState(league?.scoringFormats || ['stroke']);
  const [skinsEnabled, setSkinsEnabled] = useState(league?.skinsEnabled ?? true);
  const [skinsEntry, setSkinsEntry] = useState(league?.skinsEntry ?? 5);
  const [ctpEnabled, setCtpEnabled] = useState(league?.ctpEnabled ?? true);

  // Step 2 state
  const [playerText, setPlayerText] = useState('');
  const [manualRows, setManualRows] = useState([]);

  // Step 3 state
  const [courseSearch, setCourseSearch] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState(league?.homeCourseId || null);
  const [showManualCourse, setShowManualCourse] = useState(false);
  const [manualCourse, setManualCourse] = useState({ name: '', city: '', state: '', par: '72' });

  const parsedPlayers = playerText
    .split('\n')
    .map(parsePlayerLine)
    .filter(Boolean);

  const allPreviewPlayers = [
    ...parsedPlayers,
    ...manualRows.filter(r => r.name.trim()),
  ];

  function toggleFormat(fmt) {
    setScoringFormats(prev => {
      if (fmt === 'both') return ['stroke', 'stableford'];
      if (prev.includes(fmt) && prev.length === 1) return prev; // keep at least one
      if (prev.includes(fmt)) return prev.filter(f => f !== fmt);
      return [...prev, fmt];
    });
  }

  const formatIsActive = (fmt) => {
    if (fmt === 'both') return scoringFormats.includes('stroke') && scoringFormats.includes('stableford');
    return scoringFormats.includes(fmt);
  };

  function handleStep1Next() {
    setLeague(prev => ({
      ...prev,
      season,
      scoringFormats: formatIsActive('both') ? ['stroke', 'stableford'] : scoringFormats,
      skinsEnabled,
      skinsEntry: Number(skinsEntry),
      ctpEnabled,
    }));
    setStep(2);
  }

  function handleStep2Next() {
    const existingIds = new Set((players || []).map(p => p.id));
    const newPlayers = allPreviewPlayers
      .filter(p => p.name.trim())
      .map(p => ({
        id: `player_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: p.name.trim(),
        email: '',
        role: 'player',
        handicapIndex: p.handicapIndex ?? 0,
        teePreference: 'white',
        roundsPlayed: 0,
        differentials: [],
      }));
    setPlayers([...(players || []), ...newPlayers]);
    setStep(3);
  }

  function handleSelectCourse(course) {
    setSelectedCourseId(course.id);
    const alreadyAdded = (courses || []).find(c => c.id === course.id);
    if (!alreadyAdded) {
      setCourses(prev => [...(prev || []), { ...course, isHomeCourse: true }]);
    } else {
      setCourses(prev => prev.map(c => ({ ...c, isHomeCourse: c.id === course.id })));
    }
    setLeague(prev => ({ ...prev, homeCourseId: course.id }));
  }

  function handleAddManualCourse() {
    if (!manualCourse.name.trim()) return;
    const id = `course_custom_${Date.now()}`;
    const course = {
      id,
      name: manualCourse.name.trim(),
      city: manualCourse.city.trim(),
      state: manualCourse.state.trim(),
      country: 'USA',
      par: parseInt(manualCourse.par, 10) || 72,
      tees: [],
      holes: [],
      isHomeCourse: true,
    };
    setCourses(prev => [...(prev || []).map(c => ({ ...c, isHomeCourse: false })), course]);
    setLeague(prev => ({ ...prev, homeCourseId: id }));
    setSelectedCourseId(id);
    setShowManualCourse(false);
    setManualCourse({ name: '', city: '', state: '', par: '72' });
  }

  function handleComplete() {
    setLeague(prev => ({ ...prev, onboardingComplete: true }));
  }

  const filteredCourses = COURSE_DATABASE.filter(c => {
    const q = courseSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q)
    );
  }).slice(0, 30);

  // Shared input style
  const inputStyle = {
    borderColor: 'var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text)',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div
        className="max-w-xl w-full mx-auto rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-0 flex-shrink-0">
          {step > 0 && <ProgressDots step={step} />}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">

          {/* ── Step 0: Welcome ── */}
          {step === 0 && (
            <div className="flex flex-col items-center text-center py-6">
              <div
                className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <span
                  className="text-3xl font-bold"
                  style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-accent)' }}
                >
                  FO
                </span>
              </div>
              <h1
                className="text-4xl font-bold mb-3"
                style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-primary)' }}
              >
                Welcome to FairwayOS
              </h1>
              <p className="text-base mb-4" style={{ color: 'var(--color-muted)' }}>
                Let&rsquo;s set up your league in 3 quick steps.
              </p>
              <div
                className="text-lg font-semibold mb-8"
                style={{ color: 'var(--color-accent)', fontFamily: 'Cormorant Garamond, serif' }}
              >
                {league?.name}
              </div>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-white text-base transition-all"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Let&rsquo;s Go <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ── Step 1: League Info ── */}
          {step === 1 && (
            <div>
              <h2
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-primary)' }}
              >
                League Info
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
                Configure your season basics. You can always change these in Settings.
              </p>

              {/* Season */}
              <div className="mb-5">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                  Season Year
                </label>
                <input
                  type="text"
                  value={season}
                  onChange={e => setSeason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none"
                  style={inputStyle}
                  placeholder="2026"
                />
              </div>

              {/* Scoring format */}
              <div className="mb-5">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                  Scoring Format
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: 'stroke', label: 'Stroke Play' },
                    { key: 'stableford', label: 'Stableford' },
                    { key: 'both', label: 'Both' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => toggleFormat(key)}
                      className="px-4 py-2 rounded-full text-sm font-medium border transition-all"
                      style={{
                        borderColor: formatIsActive(key) ? 'var(--color-primary)' : 'var(--color-border)',
                        backgroundColor: formatIsActive(key) ? 'var(--color-primary)' : 'transparent',
                        color: formatIsActive(key) ? 'white' : 'var(--color-text)',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skins */}
              <div className="mb-5 p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Skins Game</span>
                  <button
                    onClick={() => setSkinsEnabled(v => !v)}
                    className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0"
                    style={{ backgroundColor: skinsEnabled ? 'var(--color-primary)' : 'var(--color-border)' }}
                  >
                    <span
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
                      style={{ left: skinsEnabled ? '22px' : '4px' }}
                    />
                  </button>
                </div>
                {skinsEnabled && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: 'var(--color-muted)' }}>Entry fee per skin:</span>
                    <span className="text-sm" style={{ color: 'var(--color-muted)' }}>$</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={skinsEntry}
                      onChange={e => setSkinsEntry(e.target.value)}
                      className="w-20 px-2 py-1.5 rounded-lg border text-sm focus:outline-none"
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>

              {/* CTP */}
              <div className="mb-8 p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Closest to Pin (CTP)</span>
                  <button
                    onClick={() => setCtpEnabled(v => !v)}
                    className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0"
                    style={{ backgroundColor: ctpEnabled ? 'var(--color-primary)' : 'var(--color-border)' }}
                  >
                    <span
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
                      style={{ left: ctpEnabled ? '22px' : '4px' }}
                    />
                  </button>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(0)}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium border transition-all"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  onClick={handleStep1Next}
                  className="flex items-center gap-1 px-6 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Add Players ── */}
          {step === 2 && (
            <div>
              <h2
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-primary)' }}
              >
                Add Your Players
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
                Paste player names — one per line. Include a handicap after a comma: <em>Dave Smith, 14.2</em>
              </p>

              <textarea
                className="w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none resize-none font-mono"
                style={{ ...inputStyle, minHeight: 120 }}
                placeholder={"Dave Smith, 14.2\nJane Doe, 8.6\nMike Johnson"}
                value={playerText}
                onChange={e => setPlayerText(e.target.value)}
              />

              {/* Manual rows */}
              {manualRows.length > 0 && (
                <div className="mt-3 space-y-2">
                  {manualRows.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        className="flex-1 px-2 py-1.5 rounded-lg border text-sm focus:outline-none"
                        style={inputStyle}
                        placeholder="Player name"
                        value={row.name}
                        onChange={e => setManualRows(prev => prev.map((r, j) => j === i ? { ...r, name: e.target.value } : r))}
                      />
                      <input
                        className="w-20 px-2 py-1.5 rounded-lg border text-sm focus:outline-none"
                        style={inputStyle}
                        placeholder="HCP"
                        type="number"
                        step="0.1"
                        value={row.handicapIndex}
                        onChange={e => setManualRows(prev => prev.map((r, j) => j === i ? { ...r, handicapIndex: parseFloat(e.target.value) || 0 } : r))}
                      />
                      <button onClick={() => setManualRows(prev => prev.filter((_, j) => j !== i))} style={{ color: 'var(--color-muted)' }}>
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setManualRows(prev => [...prev, { name: '', handicapIndex: 0 }])}
                className="flex items-center gap-1 text-sm mt-3 mb-4"
                style={{ color: 'var(--color-primary)' }}
              >
                <Plus size={15} /> Add Row
              </button>

              {/* Preview table */}
              {allPreviewPlayers.length > 0 && (
                <div className="rounded-xl border overflow-hidden mb-6" style={{ borderColor: 'var(--color-border)' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-bg)' }}>
                        <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-muted)' }}>Name</th>
                        <th className="text-right px-3 py-2 font-medium" style={{ color: 'var(--color-muted)' }}>HCP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPreviewPlayers.map((p, i) => (
                        <tr key={i} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                          <td className="px-3 py-2" style={{ color: 'var(--color-text)' }}>{p.name}</td>
                          <td className="px-3 py-2 text-right" style={{ color: 'var(--color-muted)' }}>{p.handicapIndex}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium border transition-all"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep(3)}
                    className="text-sm"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleStep2Next}
                    className="flex items-center gap-1 px-6 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Home Course ── */}
          {step === 3 && (
            <div>
              <h2
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-primary)' }}
              >
                Home Course
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
                Search for your home course to get pre-loaded hole data and ratings.
              </p>

              {/* Search */}
              <div className="relative mb-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
                <input
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm focus:outline-none"
                  style={inputStyle}
                  placeholder="Search by course name, city, or state..."
                  value={courseSearch}
                  onChange={e => setCourseSearch(e.target.value)}
                />
              </div>

              {/* Course list */}
              <div
                className="rounded-xl border overflow-y-auto mb-3"
                style={{ borderColor: 'var(--color-border)', maxHeight: 260 }}
              >
                {filteredCourses.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-center" style={{ color: 'var(--color-muted)' }}>
                    No courses found. Try a different search or add manually below.
                  </div>
                ) : (
                  filteredCourses.map(course => {
                    const isSelected = selectedCourseId === course.id;
                    return (
                      <button
                        key={course.id}
                        onClick={() => handleSelectCourse(course)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left border-b last:border-b-0 transition-colors"
                        style={{
                          borderColor: 'var(--color-border)',
                          backgroundColor: isSelected ? 'rgba(27,67,50,0.06)' : 'transparent',
                        }}
                      >
                        <div>
                          <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{course.name}</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                            {course.city}, {course.state} &middot; Par {course.par}
                          </div>
                        </div>
                        {isSelected && (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ml-3"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                          >
                            <Check size={14} color="white" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Manual course entry */}
              {!showManualCourse ? (
                <button
                  onClick={() => setShowManualCourse(true)}
                  className="text-sm mb-5"
                  style={{ color: 'var(--color-primary)' }}
                >
                  + Add course manually
                </button>
              ) : (
                <div className="p-4 rounded-xl border mb-5 space-y-3" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Add Course Manually</div>
                  <input
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
                    style={inputStyle}
                    placeholder="Course name"
                    value={manualCourse.name}
                    onChange={e => setManualCourse(p => ({ ...p, name: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none"
                      style={inputStyle}
                      placeholder="City"
                      value={manualCourse.city}
                      onChange={e => setManualCourse(p => ({ ...p, city: e.target.value }))}
                    />
                    <input
                      className="w-20 px-3 py-2 rounded-lg border text-sm focus:outline-none"
                      style={inputStyle}
                      placeholder="State"
                      value={manualCourse.state}
                      onChange={e => setManualCourse(p => ({ ...p, state: e.target.value }))}
                    />
                    <input
                      className="w-20 px-3 py-2 rounded-lg border text-sm focus:outline-none"
                      style={inputStyle}
                      placeholder="Par"
                      type="number"
                      value={manualCourse.par}
                      onChange={e => setManualCourse(p => ({ ...p, par: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddManualCourse}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      Add Course
                    </button>
                    <button
                      onClick={() => setShowManualCourse(false)}
                      className="px-4 py-2 rounded-lg text-sm font-medium border"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium border transition-all"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleComplete}
                    className="text-sm"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleComplete}
                    className="flex items-center gap-1 px-6 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    Done — Let&rsquo;s Play! <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
