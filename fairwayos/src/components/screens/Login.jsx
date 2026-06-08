import { useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';

export function Login() {
  const { login, register, registerDemo, joinLeague } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'join' | 'restore'
  const [form, setForm] = useState({ name: '', email: '', password: '', leagueName: '', code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Restore tab state
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreData, setRestoreData] = useState(null);
  const [restoreError, setRestoreError] = useState('');
  const restoreInputRef = useRef(null);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        login({ email: form.email, password: form.password });
      } else if (tab === 'register') {
        if (!form.name || !form.email || !form.password) throw new Error('All fields are required.');
        if (form.password.length < 6) throw new Error('Password must be at least 6 characters.');
        register({ name: form.name, email: form.email, password: form.password, leagueName: form.leagueName || form.name + "'s League" });
      } else {
        if (!form.code || form.code.length !== 6) throw new Error('Enter a valid 6-character league code.');
        if (!form.email || !form.password) throw new Error('Email and password required to join.');
        // Try login first, if no account register with a temp name
        try {
          login({ email: form.email, password: form.password });
          joinLeague(form.code);
        } catch {
          register({ name: form.email.split('@')[0], email: form.email, password: form.password });
          joinLeague(form.code);
        }
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  const handleRestoreFile = (file) => {
    if (!file) return;
    setRestoreError('');
    setRestoreData(null);
    setRestoreFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.league || !data.players) {
          setRestoreError('Invalid file: missing league or players data.');
          setRestoreFile(null);
          return;
        }
        setRestoreData(data);
      } catch {
        setRestoreError('Failed to parse file. Make sure it is a valid FairwayOS JSON export.');
        setRestoreFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = () => {
    if (!restoreData) return;
    if (!form.name || !form.email || !form.password) {
      setRestoreError('Please fill in your name, email, and password.');
      return;
    }
    if (form.password.length < 6) {
      setRestoreError('Password must be at least 6 characters.');
      return;
    }
    setRestoreError('');
    setLoading(true);
    try {
      const leagueId = restoreData.league.id || `restored_${Date.now()}`;
      // Write all league slices to localStorage
      const leagueKey = (suffix) => `fos_${leagueId}_${suffix}`;
      localStorage.setItem(leagueKey('league'), JSON.stringify(restoreData.league));
      localStorage.setItem(leagueKey('players'), JSON.stringify(restoreData.players || []));
      localStorage.setItem(leagueKey('rounds'), JSON.stringify(restoreData.rounds || []));
      localStorage.setItem(leagueKey('courses'), JSON.stringify(restoreData.courses || []));
      localStorage.setItem(leagueKey('teams'), JSON.stringify(restoreData.teams || []));
      localStorage.setItem(leagueKey('schedule'), JSON.stringify(restoreData.schedule || []));
      localStorage.setItem(leagueKey('announcements'), JSON.stringify(restoreData.announcements || []));
      localStorage.setItem(leagueKey('ryderCups'), JSON.stringify(restoreData.ryderCups || []));
      localStorage.setItem(leagueKey('initialized'), JSON.stringify(true));

      // Create user account and session
      const existingUsers = JSON.parse(localStorage.getItem('fos_users') || '[]');
      if (existingUsers.find(u => u.email.toLowerCase() === form.email.toLowerCase())) {
        setRestoreError('An account with this email already exists. Sign in instead, or use a different email.');
        setLoading(false);
        return;
      }
      const userId = `user_${Date.now()}`;
      const newUser = {
        id: userId,
        name: form.name,
        email: form.email,
        passwordHash: btoa(unescape(encodeURIComponent(form.password))),
        leagueIds: [leagueId],
        createdAt: new Date().toISOString(),
      };
      existingUsers.push(newUser);
      localStorage.setItem('fos_users', JSON.stringify(existingUsers));
      localStorage.setItem('fos_session', JSON.stringify({ userId, leagueId }));
      window.location.reload();
    } catch (err) {
      setRestoreError(err.message || 'Restore failed. Please try again.');
      setLoading(false);
    }
  };

  const Field = ({ label, type = 'text', field, placeholder, autoFocus }) => (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>{label}</label>
      <input
        type={type}
        value={form[field] || ''}
        onChange={e => update(field, e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none transition-all"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
        required
      />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ backgroundColor: 'var(--color-primary)' }}>
            <span className="text-2xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-accent)' }}>FO</span>
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-primary)' }}>
            FairwayOS
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Golf league management for serious players</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl shadow-lg border p-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {/* Tabs */}
          <div className="flex rounded-xl border p-1 mb-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
            {[['login','Sign In'],['register','Create Account'],['join','Join League'],['restore','Restore']].map(([t, label]) => (
              <button key={t} onClick={() => { setTab(t); setError(''); setRestoreError(''); }}
                className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
                style={{
                  backgroundColor: tab === t ? 'var(--color-primary)' : 'transparent',
                  color: tab === t ? 'white' : 'var(--color-muted)',
                }}>
                {label}
              </button>
            ))}
          </div>

          {tab !== 'restore' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === 'register' && (
                <>
                  <Field label="Your Name" field="name" placeholder="Mike Harrington" autoFocus />
                  <Field label="League Name (optional)" field="leagueName" placeholder="Westside Golf League" />
                </>
              )}
              {tab === 'join' && (
                <Field label="League Invite Code" field="code" placeholder="WGL25X" />
              )}
              <Field label="Email Address" type="email" field="email" placeholder="golfer@example.com" autoFocus={tab === 'login'} />
              <Field label="Password" type="password" field="password" placeholder="••••••••" />

              {error && (
                <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--color-danger)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-60 mt-2"
                style={{ backgroundColor: 'var(--color-primary)' }}>
                {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : tab === 'register' ? 'Create Account & League' : 'Join League'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {/* File drop zone */}
              <div
                className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all"
                style={{ borderColor: restoreData ? 'var(--color-primary)' : 'var(--color-border)', backgroundColor: restoreData ? 'rgba(27,67,50,0.04)' : 'transparent' }}
                onClick={() => restoreInputRef.current?.click()}
              >
                <input
                  ref={restoreInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={e => { handleRestoreFile(e.target.files[0]); e.target.value = ''; }}
                />
                <div className="text-2xl mb-2">{restoreData ? '✅' : '📂'}</div>
                <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {restoreFile ? restoreFile.name : 'Select your exported FairwayOS JSON file'}
                </div>
                {!restoreData && (
                  <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                    Click to browse · accepts .json exports
                  </div>
                )}
              </div>

              {/* Preview */}
              {restoreData && (
                <div className="p-3 rounded-lg border text-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
                  <div className="font-semibold" style={{ color: 'var(--color-primary)', fontFamily: 'Cormorant Garamond, serif', fontSize: '15px' }}>
                    {restoreData.league.name}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {restoreData.players?.length || 0} players &middot; {restoreData.rounds?.length || 0} rounds
                    {restoreData.exportedAt ? ` · Exported ${new Date(restoreData.exportedAt).toLocaleDateString()}` : ''}
                  </div>
                </div>
              )}

              {/* Account fields — shown once file is validated */}
              {restoreData && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Create your account</div>
                  <Field label="Your Name" field="name" placeholder="Mike Harrington" autoFocus />
                  <Field label="Email Address" type="email" field="email" placeholder="golfer@example.com" />
                  <Field label="Password" type="password" field="password" placeholder="••••••••" />
                </div>
              )}

              {restoreError && (
                <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--color-danger)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  {restoreError}
                </div>
              )}

              {restoreData && (
                <button
                  onClick={handleRestore}
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-60"
                  style={{ backgroundColor: 'var(--color-primary)' }}>
                  {loading ? 'Restoring...' : 'Restore League'}
                </button>
              )}
            </div>
          )}

          {tab === 'login' && (
            <p className="text-center text-xs mt-4" style={{ color: 'var(--color-muted)' }}>
              No account?{' '}
              <button onClick={() => setTab('register')} className="font-medium" style={{ color: 'var(--color-primary)' }}>Create one free</button>
            </p>
          )}
        </div>

        {/* Demo shortcut */}
        <div className="mt-4 p-4 rounded-xl border text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-muted)' }}>Demo — skip login</p>
          <button
            onClick={() => {
              try {
                login({ email: 'demo@fairwayos.com', password: 'demo123' });
              } catch {
                registerDemo({ name: 'Demo Commissioner', email: 'demo@fairwayos.com', password: 'demo123', leagueName: 'Westside Golf League' });
              }
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-all"
            style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)', backgroundColor: 'rgba(184,151,42,0.06)' }}
          >
            Open Demo League
          </button>
        </div>
      </div>
    </div>
  );
}
