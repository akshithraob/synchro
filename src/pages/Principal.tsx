import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { decide, getAnalytics, listActivities, listPending } from '../api';
import { ErrorBox, Loading } from '../components/Async';
import { useAsync } from '../lib/useAsync';
import { useStore } from '../store';

export default function Principal() {
  const { profile } = useStore();
  const pending = useAsync(listPending, []);
  const approved = useAsync(listActivities, []);
  const analytics = useAsync(getAnalytics, []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (profile && profile.role !== 'principal') return <Navigate to="/" replace />;

  const act = async (id: string, status: 'approved' | 'declined') => {
    const reason = status === 'declined' ? window.prompt('Reason for declining (shown to the organizer):') : '';
    if (reason === null) return;
    setBusyId(id);
    setError(null);
    try {
      await decide(id, status, reason);
      pending.reload();
      approved.reload();
      analytics.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const live = approved.data ?? [];
  const registrations = live.reduce((n, a) => n + a.registered_count, 0);
  const checkedIn = live.reduce((n, a) => n + a.checked_in_count, 0);
  const metrics = [
    { label: 'Registrations', value: registrations.toLocaleString(), trend: `across ${live.length} live activities` },
    { label: 'Activities live', value: String(live.length), trend: 'approved and open' },
    { label: 'Attendance rate', value: registrations ? `${Math.round((checkedIn / registrations) * 100)}%` : '—', trend: `${checkedIn} checked in` },
    { label: 'Pending approvals', value: String(pending.data?.length ?? 0).padStart(2, '0'), trend: pending.data?.length ? 'Needs your review' : 'All caught up' },
  ];

  const weekly = analytics.data?.weekly ?? [];
  const maxWeek = Math.max(1, ...weekly.map((w) => w.n));
  const events = analytics.data?.events ?? [];
  const catTotal = (analytics.data?.categories ?? []).reduce((n, c) => n + c.n, 0);
  const categoryPct = (analytics.data?.categories ?? []).map((c) => ({ name: c.name, pct: catTotal ? Math.round((c.n / catTotal) * 100) : 0 }));

  const exportCsv = () => {
    const rows = [['Event', 'Category', 'Capacity', 'Registered', 'Checked in'], ...events.map((e) => [e.title, e.category, e.capacity, e.registered, e.checked_in])];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campusly-attendance.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Northstar at a glance</h1>
          <p className="sub">Campus engagement · Fall 2026</p>
        </div>
        <span className="pill">Live</span>
      </div>

      <div className="metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {metrics.map((m) => (
          <div className="card stat" key={m.label}>
            <span className="label">{m.label}</span>
            <span className="value">{m.value}</span>
            <span className="trend">{m.trend}</span>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <section className="card panel" aria-label="Approvals">
          <h2>Needs your review</h2>
          {pending.loading && <Loading />}
          {pending.error && <ErrorBox message={pending.error} onRetry={pending.reload} />}
          {error && (
            <p role="alert" className="warn">
              {error}
            </p>
          )}
          {!pending.loading && pending.data?.length === 0 && <p className="muted" style={{ marginTop: 12 }}>Nothing waiting for review.</p>}
          {(pending.data ?? []).map((a) => (
            <div className="approval" key={a.id}>
              <div>
                <strong style={{ fontSize: 14 }}>{a.title}</strong>
                <small>
                  {a.category} · {a.capacity} students
                </small>
              </div>
              <span style={{ display: 'flex', gap: 6 }}>
                <button className="btn ghost" disabled={busyId === a.id} onClick={() => act(a.id, 'declined')}>
                  Decline
                </button>
                <button className="btn" disabled={busyId === a.id} onClick={() => act(a.id, 'approved')}>
                  Approve
                </button>
              </span>
            </div>
          ))}
        </section>

        <section className="card panel">
          <h2>Weekly check-ins</h2>
          <p className="muted" style={{ fontSize: 12 }}>Students checked in at events · last 8 weeks</p>
          {analytics.loading && <Loading />}
          {analytics.error && <ErrorBox message={analytics.error} onRetry={analytics.reload} />}
          {weekly.length > 0 && (
            <div className="chart" role="img" aria-label={`Weekly check-ins, ${weekly.map((w) => w.n).join(', ')}`}>
              {weekly.map((w, i) => (
                <div className="col" key={w.week} title={`${w.week}: ${w.n}`}>
                  <i style={{ height: `${(w.n / maxWeek) * 100}%` }} />W{i + 1}
                </div>
              ))}
            </div>
          )}
          {weekly.length > 0 && maxWeek === 1 && weekly.every((w) => w.n === 0) && (
            <p className="muted" style={{ fontSize: 12 }}>No check-ins recorded yet.</p>
          )}
        </section>

        <section className="card panel">
          <h2>What students join</h2>
          <p className="muted" style={{ fontSize: 12 }}>Share of registrations by category</p>
          {categoryPct.map((c) => (
            <div className="meter" key={c.name}>
              <span>{c.name}</span>
              <div className="bar">
                <i style={{ width: `${c.pct}%` }} />
              </div>
              <span className="muted">{c.pct}%</span>
            </div>
          ))}
        </section>

        <section className="card panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Attendance by event</h2>
            <button className="btn ghost" onClick={exportCsv} disabled={!events.length}>Export CSV</button>
          </div>
          <p className="muted" style={{ fontSize: 12 }}>Checked in vs registered</p>
          {events.map((e, i) => (
            <div className="meter" key={`${e.title}-${i}`}>
              <span>{e.title}</span>
              <div className="bar">
                <i style={{ width: `${e.registered ? Math.round((e.checked_in / e.registered) * 100) : 0}%` }} />
              </div>
              <span className="muted">{e.checked_in}/{e.registered}</span>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
