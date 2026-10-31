import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fmtTime } from '../api';
import { useStore } from '../store';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Campus-local times are stored as UTC wall-clock, so all date math here is UTC too.
const key = (d: Date) => d.toISOString().slice(0, 10);

export default function Calendar() {
  const { registrations: all } = useStore();
  const registrations = all.filter((r) => r.status === 'approved' || r.status === 'pending');
  const now = new Date();
  const [month, setMonth] = useState(() => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));

  const byDay = useMemo(() => {
    const m = new Map<string, typeof registrations>();
    for (const r of registrations) {
      const k = r.activities.starts_at.slice(0, 10);
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return m;
  }, [registrations]);

  const first = month.getUTCDay();
  const days = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: (Date | null)[] = [
    ...Array<null>(first).fill(null),
    ...Array.from({ length: days }, (_, i) => new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), i + 1))),
  ];
  const shift = (n: number) => setMonth(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + n, 1)));
  const label = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(month);
  const today = key(now);

  const upcoming = registrations
    .filter((r) => r.activities.starts_at.slice(0, 10) >= today)
    .sort((a, b) => a.activities.starts_at.localeCompare(b.activities.starts_at));

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Calendar</h1>
          <p className="sub">Events you’re registered for.</p>
        </div>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn ghost" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
          <strong style={{ minWidth: 140, textAlign: 'center' }}>{label}</strong>
          <button className="btn ghost" onClick={() => shift(1)} aria-label="Next month">›</button>
        </span>
      </div>

      <section className="card panel" aria-label={label} style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(44px, 1fr))', gap: 4 }}>
          {DOW.map((d) => (
            <small key={d} className="eyebrow" style={{ textAlign: 'center' }}>{d}</small>
          ))}
          {cells.map((d, i) => {
            const evs = d ? byDay.get(key(d)) ?? [] : [];
            const isToday = d && key(d) === today;
            return (
              <div
                key={i}
                style={{
                  minHeight: 72,
                  padding: 4,
                  borderRadius: 8,
                  background: d ? 'var(--surface-2, transparent)' : 'transparent',
                  outline: isToday ? '2px solid var(--brand)' : undefined,
                  fontSize: 12,
                }}
              >
                {d && <span className="muted">{d.getUTCDate()}</span>}
                {evs.map((r) => (
                  <Link
                    key={r.id}
                    to={`/activity/${r.activities.slug}`}
                    className="pill"
                    style={{ display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={r.activities.title}
                  >
                    {r.activities.title}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      <h2 style={{ margin: '24px 0 8px' }}>Upcoming</h2>
      {upcoming.length === 0 ? (
        <p className="card empty">
          Nothing coming up.{' '}
          <Link to="/discover" style={{ color: 'var(--brand)', fontWeight: 600 }}>Find an activity</Link>
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {upcoming.map((r) => (
            <Link key={r.id} to={`/activity/${r.activities.slug}`} className="card panel" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{r.activities.title}</strong>
              <span className="muted">
                {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(r.activities.starts_at))} · {fmtTime(r.activities.starts_at)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
