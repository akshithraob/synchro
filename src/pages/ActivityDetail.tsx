import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { fmtDay, fmtTime, getActivity, REG_LABEL, spotsLeft } from '../api';
import { ErrorBox, Loading } from '../components/Async';
import SubEventList from '../components/SubEventList';
import { useAsync } from '../lib/useAsync';
import { useStore } from '../store';

export default function ActivityDetail() {
  const { slug = '' } = useParams();
  const { registrations, register, cancel } = useStore();
  const navigate = useNavigate();
  const { data: a, error, loading, reload } = useAsync(() => getActivity(slug), [slug]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading) return <main className="page"><Loading /></main>;
  if (error) return <main className="page"><ErrorBox message={error} onRetry={reload} /></main>;
  if (!a) return <Navigate to="/discover" replace />;

  const mine = registrations.find((r) => r.activity_id === a.id);
  const isIn = !!mine;
  const left = spotsLeft(a);
  const full = left <= 0 && !isIn;
  const pct = Math.min(100, Math.round((a.registered_count / a.capacity) * 100));

  const run = async (fn: () => Promise<void>, then?: () => void) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      reload();
      then?.();
    } catch (e) {
      setActionError((e as Error).message);
      reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <p className="crumbs">
        <Link to="/discover">Discover</Link> &nbsp;/&nbsp;{' '}
        {a.parent ? (
          <>
            <Link to={`/activity/${a.parent.slug}`}>{a.parent.title}</Link> &nbsp;/&nbsp; {a.title}
          </>
        ) : (
          a.category
        )}
      </p>

      <section className="banner" style={{ background: a.cover }}>
        <span className="pill">{a.category}</span>
        <h1>{a.title}</h1>
        <p>{a.parent ? `Part of ${a.parent.title}` : a.tagline}</p>
        <p style={{ fontSize: 13 }}>Hosted by {a.organizer}</p>
      </section>

      <div className="detail-grid">
        <div style={{ display: 'grid', gap: 20 }}>
          <section className="card details">
            <h2>{a.about}</h2>
            <p className="muted">{a.about_body}</p>
            <div className="facts">
              <div className="fact">
                <span className="ico" aria-hidden>
                  ◷
                </span>
                <div>
                  <strong>{fmtDay(a.starts_at)}</strong>
                  <small>{fmtTime(a.starts_at)}</small>
                </div>
              </div>
              <div className="fact">
                <span className="ico" aria-hidden>
                  ⌖
                </span>
                <div>
                  <strong>{a.location}</strong>
                  <small>{a.location_note}</small>
                </div>
              </div>
              <div className="fact">
                <span className="ico" aria-hidden>
                  ◎
                </span>
                <div>
                  <strong>Open to everyone</strong>
                  <small>No prerequisites</small>
                </div>
              </div>
            </div>
            {a.requirements && (
              <>
                <hr style={{ border: 0, borderTop: '1px solid var(--line)' }} />
                <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
                  {a.requirements}
                </p>
              </>
            )}
          </section>

          {!a.parent_id && <SubEventList parent={a} />}

          {a.schedule.length > 0 && (
            <section className="card schedule">
              <h2 style={{ fontSize: 17, marginBottom: 6 }}>Schedule</h2>
              {a.schedule.map((s) => (
                <div className="sched-row" key={s.time + s.label}>
                  <time>{s.time}</time>
                  <span style={{ fontWeight: 500 }}>{s.label}</span>
                </div>
              ))}
            </section>
          )}
        </div>

        <aside className="card reg" aria-label="Registration">
          <h2>Save your spot</h2>
          <span className="pill" style={{ alignSelf: 'flex-start' }}>
            {mine ? REG_LABEL[mine.status] : full ? 'Full · waitlist open' : 'Registration open'}
          </span>
          <div>
            <p style={{ fontSize: 13, marginBottom: 6 }}>
              {a.registered_count} of {a.capacity} seats filled
            </p>
            <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="organizer">
            <span className="avatar">
              {a.organizer
                .split(' ')
                .map((w) => w[0])
                .slice(0, 2)
                .join('')}
            </span>
            {a.organizer}
          </div>
          {isIn ? (
            <>
              {mine?.status === 'approved' ? (
                <Link to={`/activity/${a.slug}/confirmed`} className="btn block">
                  View my ticket
                </Link>
              ) : (
                <p className="muted" style={{ fontSize: 13 }}>
                  {mine?.status === 'pending' && 'The organizer will review your registration. You will get your pass once approved.'}
                  {mine?.status === 'waitlisted' && 'The event is full. You will move up automatically if a seat opens.'}
                  {mine?.status === 'rejected' && 'Your registration was not approved.'}
                </p>
              )}
              <button className="btn ghost block" disabled={busy} onClick={() => run(() => cancel(a.id))}>
                {mine?.status === 'waitlisted' ? 'Leave waitlist' : 'Cancel registration'}
              </button>
            </>
          ) : (
            <button
              className="btn block"
              onClick={() => run(() => register(a.id), () => navigate(a.approval_mode === 'auto' && !full ? `/activity/${a.slug}/confirmed` : '/my-activities'))}
              disabled={busy}
            >
              {busy ? 'Registering…' : full ? 'Join waitlist' : a.approval_mode === 'manual' ? 'Request to join' : 'Register for event'}
            </button>
          )}
          {actionError && (
            <p role="alert" className="warn">
              {actionError}
            </p>
          )}
          <p className="muted" style={{ fontSize: 12 }}>
            {a.approval_mode === 'manual' ? 'Free · Organizer approval required' : 'Free · Confirmation is instant'}
          </p>
        </aside>
      </div>
    </main>
  );
}
