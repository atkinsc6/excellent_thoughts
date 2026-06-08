import { useState, useMemo } from 'react';
import { Search, Plus, MapPin, Star, ChevronRight, X } from 'lucide-react';
import { TopBar } from '../layout/TopBar';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { COURSE_DATABASE } from '../../data/courses';

export function Courses({ courses, setCourses, league, setLeague }) {
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addTab, setAddTab] = useState('library');
  const [librarySearch, setLibrarySearch] = useState('');
  const [addForm, setAddForm] = useState({ name: '', city: '', state: '', country: 'USA', par: 72, tees: [{ name: 'Blue', rating: 72.0, slope: 130, yardage: 6500 }] });

  const filtered = useMemo(() =>
    courses.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase()) ||
      c.state.toLowerCase().includes(search.toLowerCase())
    ),
    [courses, search]
  );

  const setHomeCourse = (courseId) => {
    setLeague(prev => ({ ...prev, homeCourseId: courseId }));
  };

  const addTee = () => {
    setAddForm(f => ({ ...f, tees: [...f.tees, { name: '', rating: 70.0, slope: 120, yardage: 6000 }] }));
  };

  const updateTee = (i, field, value) => {
    setAddForm(f => ({ ...f, tees: f.tees.map((t, ti) => ti === i ? { ...t, [field]: field === 'name' ? value : parseFloat(value) || t[field] } : t) }));
  };

  const removeTee = (i) => {
    setAddForm(f => ({ ...f, tees: f.tees.filter((_, ti) => ti !== i) }));
  };

  const saveNewCourse = () => {
    if (!addForm.name || !addForm.city || !addForm.state) return;
    const newCourse = {
      id: `course-${Date.now()}`,
      ...addForm,
      par: parseInt(addForm.par),
      holes: Array.from({ length: 18 }, (_, i) => ({
        number: i + 1,
        par: i < 4 ? 4 : i < 6 ? 3 : i < 8 ? 5 : i < 14 ? 4 : i < 16 ? 3 : 5,
        strokeIndex: i + 1,
        yardages: Object.fromEntries(addForm.tees.map(t => [t.name, Math.round(t.yardage / 18)])),
      })),
    };
    setCourses(prev => [...prev, newCourse]);
    setShowAdd(false);
    setAddForm({ name: '', city: '', state: '', country: 'USA', par: 72, tees: [{ name: 'Blue', rating: 72.0, slope: 130, yardage: 6500 }] });
  };

  // Course detail view
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
              <Button variant="secondary" size="sm" onClick={() => setHomeCourse(course.id)}>
                Set as Home Course
              </Button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5 max-w-5xl mx-auto">
          {/* Tee info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {course.tees.map(tee => (
              <Card key={tee.name} className="text-center">
                <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{
                  backgroundColor: { Black: '#1a1a1a', Blue: '#1d4ed8', White: '#e5e7eb', Gold: '#b8972a', Red: '#dc2626' }[tee.name] || '#999'
                }} />
                <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{tee.name}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{tee.yardage} yds</div>
                <div className="text-xs font-medium mt-0.5" style={{ color: 'var(--color-primary)' }}>{tee.rating} / {tee.slope}</div>
              </Card>
            ))}
          </div>

          {/* Scorecard grid */}
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
                  {/* Par row */}
                  <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(27,67,50,0.04)' }}>
                    <td className="px-3 py-2 font-semibold sticky left-0" style={{ backgroundColor: 'rgba(27,67,50,0.04)', color: 'var(--color-primary)' }}>Par</td>
                    {course.holes.slice(0, 9).map(h => <td key={h.number} className="py-2 text-center font-semibold" style={{ color: 'var(--color-primary)' }}>{h.par}</td>)}
                    <td className="py-2 text-center font-bold px-2" style={{ backgroundColor: 'rgba(27,67,50,0.08)', color: 'var(--color-primary)' }}>{course.holes.slice(0, 9).reduce((s, h) => s + h.par, 0)}</td>
                    {course.holes.slice(9).map(h => <td key={h.number} className="py-2 text-center font-semibold" style={{ color: 'var(--color-primary)' }}>{h.par}</td>)}
                    <td className="py-2 text-center font-bold px-2" style={{ backgroundColor: 'rgba(27,67,50,0.08)', color: 'var(--color-primary)' }}>{course.holes.slice(9).reduce((s, h) => s + h.par, 0)}</td>
                    <td className="py-2 text-center font-bold px-2" style={{ backgroundColor: 'rgba(184,151,42,0.1)', color: 'var(--color-accent)' }}>{course.par}</td>
                  </tr>
                  {/* SI row */}
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <td className="px-3 py-1.5 text-xs italic sticky left-0" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-muted)' }}>S.I.</td>
                    {course.holes.slice(0, 9).map(h => <td key={h.number} className="py-1.5 text-center" style={{ color: 'var(--color-muted)' }}>{h.strokeIndex}</td>)}
                    <td style={{ backgroundColor: 'rgba(27,67,50,0.04)' }} />
                    {course.holes.slice(9).map(h => <td key={h.number} className="py-1.5 text-center" style={{ color: 'var(--color-muted)' }}>{h.strokeIndex}</td>)}
                    <td style={{ backgroundColor: 'rgba(27,67,50,0.04)' }} />
                    <td />
                  </tr>
                  {/* Tee yardage rows */}
                  {course.tees.map(tee => (
                    <tr key={tee.name} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="px-3 py-2 sticky left-0" style={{ backgroundColor: 'var(--color-surface)' }}>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: { Black: '#1a1a1a', Blue: '#1d4ed8', White: '#9ca3af', Gold: '#b8972a', Red: '#dc2626' }[tee.name] || '#999' }} />
                          <span className="font-medium text-xs" style={{ color: 'var(--color-text)' }}>{tee.name}</span>
                        </div>
                      </td>
                      {course.holes.slice(0, 9).map(h => (
                        <td key={h.number} className="py-2 text-center text-xs" style={{ color: 'var(--color-muted)' }}>
                          {h.yardages?.[tee.name] || '—'}
                        </td>
                      ))}
                      <td className="py-2 text-center font-medium text-xs px-2" style={{ backgroundColor: 'rgba(27,67,50,0.04)', color: 'var(--color-text)' }}>
                        {course.holes.slice(0, 9).reduce((s, h) => s + (h.yardages?.[tee.name] || 0), 0)}
                      </td>
                      {course.holes.slice(9).map(h => (
                        <td key={h.number} className="py-2 text-center text-xs" style={{ color: 'var(--color-muted)' }}>
                          {h.yardages?.[tee.name] || '—'}
                        </td>
                      ))}
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

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <TopBar title="Courses" subtitle={`${courses.length} courses in database`}>
        <Button variant="primary" size="md" onClick={() => setShowAdd(true)}>
          <Plus size={15} className="mr-1.5" />
          Add Course
        </Button>
      </TopBar>

      <div className="p-6 space-y-5 max-w-5xl mx-auto">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
          <input
            type="text"
            placeholder="Search courses by name, city, or state..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
          />
        </div>

        {/* Course list */}
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

      {/* Add Course Modal */}
      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setLibrarySearch(''); setAddTab('library'); }} title="Add Course" size="lg">
        <div className="space-y-4">
          {/* Tab switcher */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--color-bg)' }}>
            <button
              onClick={() => setAddTab('library')}
              className="flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: addTab === 'library' ? 'var(--color-primary)' : 'transparent',
                color: addTab === 'library' ? 'white' : 'var(--color-muted)',
              }}
            >
              Browse Library
            </button>
            <button
              onClick={() => setAddTab('manual')}
              className="flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: addTab === 'manual' ? 'var(--color-primary)' : 'transparent',
                color: addTab === 'manual' ? 'white' : 'var(--color-muted)',
              }}
            >
              Add Manually
            </button>
          </div>

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
              : unadded.slice(0, 20);

            return (
              <div className="space-y-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search by name or state..."
                    value={librarySearch}
                    onChange={e => setLibrarySearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                  />
                </div>
                {unadded.length === 0 ? (
                  <p className="text-center py-8 text-sm" style={{ color: 'var(--color-muted)' }}>
                    All courses from the library are already in your league.
                  </p>
                ) : displayed.length === 0 ? (
                  <p className="text-center py-8 text-sm" style={{ color: 'var(--color-muted)' }}>
                    No courses match your search.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-80 overflow-y-auto">
                    {displayed.map(course => (
                      <button
                        key={course.id}
                        onClick={() => { setCourses(prev => [...prev, course]); setShowAdd(false); setLibrarySearch(''); setAddTab('library'); }}
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
                          <Plus size={14} style={{ color: 'var(--color-primary)' }} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {addTab === 'manual' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Course Name" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} className="col-span-2" placeholder="e.g. Pebble Beach Golf Links" />
                <Input label="City" value={addForm.city} onChange={e => setAddForm(f => ({ ...f, city: e.target.value }))} />
                <Input label="State" value={addForm.state} onChange={e => setAddForm(f => ({ ...f, state: e.target.value }))} placeholder="IL" />
                <Input label="Country" value={addForm.country} onChange={e => setAddForm(f => ({ ...f, country: e.target.value }))} />
                <Input label="Par" type="number" value={addForm.par} onChange={e => setAddForm(f => ({ ...f, par: e.target.value }))} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Tees</label>
                  <Button variant="ghost" size="sm" onClick={addTee}>
                    <Plus size={13} className="mr-1" /> Add Tee
                  </Button>
                </div>
                <div className="space-y-2">
                  {addForm.tees.map((tee, i) => (
                    <div key={i} className="grid grid-cols-5 gap-2 items-end">
                      <input
                        placeholder="Name"
                        value={tee.name}
                        onChange={e => updateTee(i, 'name', e.target.value)}
                        className="px-2 py-1.5 rounded border text-sm"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                      <input
                        placeholder="Rating"
                        type="number"
                        value={tee.rating}
                        onChange={e => updateTee(i, 'rating', e.target.value)}
                        className="px-2 py-1.5 rounded border text-sm"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                      <input
                        placeholder="Slope"
                        type="number"
                        value={tee.slope}
                        onChange={e => updateTee(i, 'slope', e.target.value)}
                        className="px-2 py-1.5 rounded border text-sm"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                      <input
                        placeholder="Yardage"
                        type="number"
                        value={tee.yardage}
                        onChange={e => updateTee(i, 'yardage', e.target.value)}
                        className="px-2 py-1.5 rounded border text-sm"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                      <button onClick={() => removeTee(i)} className="p-1.5 rounded hover:bg-red-50">
                        <X size={14} style={{ color: 'var(--color-danger)' }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button variant="primary" onClick={saveNewCourse}>Add Course</Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
