import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listNotifications, markNotificationsRead, type AppNotification } from '../api';
import { ErrorBox, Loading } from '../components/Async';
import { disablePush, enablePush, pushState, type PushState } from '../lib/push';
import { useAsync } from '../lib/useAsync';

const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

function PushCard() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pushState().then(setState).catch(() => setState('unsupported'));
  }, []);

  if (!state || state === 'unsupported') return null;

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      if (state === 'on') await disablePush();
      else await enablePush();
      setState(await pushState());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card panel" style={{ marginBottom: 16, display: 'grid', gap: 8 }} aria-label="Push notifications">
      <h2 style={{ fontSize: 16 }}>Alerts on this device</h2>
      <p className="muted" style={{ fontSize: 13 }}>
        {state === 'on'
          ? 'You’ll get an alert when your registration is approved, a seat opens up, or something new is posted.'
          : state === 'denied'
            ? 'Notifications are blocked for this site. Allow them in your browser’s site settings, then come back.'
            : 'Get an alert when your registration is approved, a waitlist seat opens, or a new activity is published, even when Synchro is closed.'}
      </p>
      {state !== 'denied' && (
        <div>
          <button className={state === 'on' ? 'btn ghost' : 'btn'} onClick={toggle} disabled={busy}>
            {busy ? 'Working…' : state === 'on' ? 'Turn off alerts' : 'Turn on alerts'}
          </button>
        </div>
      )}
      {error && <p role="alert" className="warn">{error}</p>}
    </section>
  );
}

export default function Notifications() {
  const list = useAsync(listNotifications, []);
  const navigate = useNavigate();
  const items = list.data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  const open = async (n: AppNotification) => {
    if (!n.read_at) await markNotificationsRead([n.id]).catch(() => {});
    if (n.link) navigate(n.link);
    else list.reload();
  };

  const markAll = async () => {
    await markNotificationsRead().catch(() => {});
    list.reload();
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Notifications</h1>
          <p className="sub">{unread ? `${unread} unread` : 'You’re all caught up.'}</p>
        </div>
        <button className="btn ghost" onClick={markAll} disabled={!unread}>
          Mark all as read
        </button>
      </div>

      <PushCard />

      {list.loading && <Loading />}
      {list.error && <ErrorBox message={list.error} onRetry={list.reload} />}
      {!list.loading && !items.length && (
        <p className="card empty">
          Nothing yet. Updates about your registrations and new activities show up here.{' '}
          <Link to="/discover" style={{ color: 'var(--brand)', fontWeight: 600 }}>Find an activity</Link>
        </p>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((n) => (
          <button
            key={n.id}
            className="card panel"
            onClick={() => open(n)}
            style={{ textAlign: 'left', display: 'block', width: '100%', cursor: 'pointer', borderLeft: n.read_at ? undefined : '3px solid var(--brand)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong style={{ fontWeight: n.read_at ? 500 : 700 }}>{n.title}</strong>
              <small className="muted">{ago(n.created_at)}</small>
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>{n.body}</p>
          </button>
        ))}
      </div>
    </main>
  );
}
