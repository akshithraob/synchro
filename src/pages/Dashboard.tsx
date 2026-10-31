import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fmtDay, fmtTime, listActivities, listAnnouncements } from '../api';
import ActivityCard from '../components/ActivityCard';
import { ErrorBox, Loading } from '../components/Async';
import { useAsync } from '../lib/useAsync';
import { useStore } from '../store';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const utcDay = (iso: string) => iso.slice(0, 10);

export default function Dashboard() {
  const { registrations, profile } = useStore();
  const all = useAsync(listActivities, []);
  const notes = useAsync(listAnnouncements, []);

  const upcoming = registrations.map((r) => r.activities).filter((a) => a.status === 'approved');
  const registeredIds = new Set(registrations.map((r) => r.activity_id));
  const picks = (all.data ?? []).filter((a) => !registeredIds.has(a.id)).slice(0, 2);

  // Week strip: the 7 days starting from the earliest upcoming event, or today's campus week.
  const week = useMemo(() => {
    const start = upcoming.length ? new Date(upcoming.map((a) => a.starts_at).sort()[0]) : new Date();
    start.setUTCHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 86_400_000));
  }, [upcoming]);
  const [picked, setPicked] = useState<string | null>(null);
  const activeDay = picked ?? utcDay(week[0].toISOString());
  const events = upcoming.filter((a) => utcDay(a.starts_at) === activeDay);
  const first = (profile?.full_name || 'there').split(' ')[0];

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">
            {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}
          </p>
          <h1>Good day, {first}</h1>
          <p className="sub">Your next big thing is closer than you think.</p>
        </div>
        <Link to="/discover" className="btn">
          Explore activities →
        </Link>
      </div>

      <div className="hero-row">
        <section className="hero">
          <h2>Make room for what moves you.</h2>
          <p>Find your people, try something new, and build a campus life that feels like yours.</p>
          <span className="blob" aria-hidden />
          <span className="blob sm" aria-hidden />
        </section>
        <div className="card stat">
          <span className="label">Activities joined</span>
          <span className="value">{String(registrations.length).padStart(2, '0')}</span>
          <span className="trend">{registrations.filter((r) => r.checked_in_at).length} attended</span>
        </div>
        <div className="card stat">
          <span className="label">Coming up</span>
          <span className="value">{upcoming.length}</span>
          <span className="trend">Registered events</span>
        </div>
      </div>

      <div className="section-head">
        <div>
          <h2>Your next up</h2>
          <p>You’re all set for these events.</p>
        </div>
      </div>
      <div className="two-col">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {upcoming.length ? (
            upcoming.map((a) => <ActivityCard key={a.id} a={a} showSpots={false} />)
          ) : (
            <p className="card empty">Nothing booked yet. Find something in Discover.</p>
          )}
        </div>
        <section className="card week" aria-label="Your week">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ fontSize: 16 }}>Your week</h2>
            <span className="eyebrow">
              {fmtDay(week[0].toISOString())} — {fmtDay(week[6].toISOString())}
            </span>
          </div>
          <div className="days">
            {week.map((d) => {
              const key = utcDay(d.toISOString());
              return (
                <button key={key} aria-pressed={activeDay === key} onClick={() => setPicked(key)} aria-label={fmtDay(d.toISOString())}>
                  {DAY_LETTERS[d.getUTCDay()]}
                  <br />
                  {d.getUTCDate()}
                </button>
              );
            })}
          </div>
          {events.length ? (
            events.map((a) => (
              <div className="timeline-row" key={a.id}>
                <time>{fmtTime(a.starts_at)}</time>
                <span style={{ fontWeight: 500 }}>
                  {a.title} · {a.location}
                </span>
              </div>
            ))
          ) : (
            <p className="muted timeline-row">Nothing scheduled.</p>
          )}
        </section>
      </div>

      <div className="section-head">
        <h2>Picked for you</h2>
      </div>
      <div className="two-col">
        {all.loading ? (
          <Loading />
        ) : all.error ? (
          <ErrorBox message={all.error} onRetry={all.reload} />
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {picks.map((a) => (
              <ActivityCard key={a.id} a={a} />
            ))}
          </div>
        )}
        <section className="card notes" aria-label="Campus notes">
          <h2 style={{ fontSize: 16 }}>Campus notes</h2>
          {notes.error && <p className="warn">{notes.error}</p>}
          {(notes.data ?? []).map((n) => (
            <article className="note" key={n.id}>
              <span className="pill">{n.tag}</span>
              <h3>{n.title}</h3>
              <p>{n.body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
