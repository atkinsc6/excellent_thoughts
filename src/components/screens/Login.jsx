import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export function Login() {
  const { login, register, joinLeague } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'join'
  const [form, setForm] = useState({ name: '', email: '', password: '', leagueName: '', code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
            {[['login','Sign In'],['register','Create Account'],['join','Join League']].map(([t, label]) => (
              <button key={t} onClick={() => { setTab(t); setError(''); }}
                className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
                style={{
                  backgroundColor: tab === t ? 'var(--color-primary)' : 'transparent',
                  color: tab === t ? 'white' : 'var(--color-muted)',
                }}>
                {label}
              </button>
            ))}
          </div>

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
                register({ name: 'Demo Commissioner', email: 'demo@fairwayos.com', password: 'demo123', leagueName: 'Westside Golf League' });
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
