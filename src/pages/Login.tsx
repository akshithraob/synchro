import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../store';

export default function Login() {
  const { session, signIn, signUp } = useStore();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'in') {
        await signIn(email, password);
      } else {
        const { needsConfirmation } = await signUp(email, password, name);
        if (needsConfirmation) setInfo('Check your email to confirm your account, then sign in.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="confirm-wrap">
      <form className="card confirm" onSubmit={submit} style={{ textAlign: 'left', alignItems: 'stretch' }}>
        <div className="brand" style={{ justifyContent: 'center', marginBottom: 8 }}>
          <span className="brand-mark" aria-hidden>
            S
          </span>
          <strong style={{ fontSize: 20 }}>synchro</strong>
        </div>
        <h1 style={{ fontSize: 22, textAlign: 'center' }}>{mode === 'in' ? 'Welcome back' : 'Create your account'}</h1>

        {mode === 'up' && (
          <>
            <label className="eyebrow" htmlFor="name" style={{ marginTop: 8 }}>
              Full name
            </label>
            <input id="name" className="field" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </>
        )}
        <label className="eyebrow" htmlFor="email" style={{ marginTop: 8 }}>
          Email
        </label>
        <input id="email" type="email" className="field" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <label className="eyebrow" htmlFor="password" style={{ marginTop: 8 }}>
          Password
        </label>
        <input
          id="password"
          type="password"
          className="field"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
        />

        {error && (
          <p role="alert" className="warn">
            {error}
          </p>
        )}
        {info && <p className="good">{info}</p>}

        <button className="btn block" disabled={busy} style={{ marginTop: 10 }}>
          {busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Sign up'}
        </button>
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setMode(mode === 'in' ? 'up' : 'in');
            setError(null);
            setInfo(null);
          }}
        >
          {mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}
        </button>
      </form>
    </main>
  );
}
