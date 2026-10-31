import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fmtWhen, listSubEvents, REG_LABEL, spotsLeft, SUB_LABEL_PLURAL, type Activity } from '../api';
import { useAsync } from '../lib/useAsync';
import { useStore } from '../store';
import { ErrorBox, Loading } from './Async';

export default function SubEventList({ parent }: { parent: Activity }) {
  const { registrations, register, cancel } = useStore();
  const subs = useAsync(() => listSubEvents(parent.id), [parent.id]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = (subs.data ?? []).filter((s) => s.status === 'approved');
  if (!subs.loading && !subs.error && open.length === 0) return null;

  const act = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      subs.reload();
      setBusyId(null);
    }
  };

  return (
    <section className="card details" aria-label={SUB_LABEL_PLURAL}>
      <h2 style={{ fontSize: 17, marginBottom: 4 }}>{SUB_LABEL_PLURAL}</h2>
      <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Pick the ones you want to take part in. Each has its own seats.</p>
      {subs.loading && <Loading />}
      {subs.error && <ErrorBox message={subs.error} onRetry={subs.reload} />}
      {error && <p role="alert" className="warn">{error}</p>}
      <div className="subrows">
        {open.map((s) => {
          const mine = registrations.find((r) => r.activity_id === s.id);
          const left = spotsLeft(s);
          const busy = busyId === s.id;
          return (
            <div className="subrow" key={s.id}>
              <div style={{ minWidth: 0 }}>
                <Link to={`/activity/${s.slug}`} style={{ fontWeight: 600 }}>{s.title}</Link>
                <small className="muted" style={{ display: 'block' }}>
                  {fmtWhen(s.starts_at)}{s.location ? ` · ${s.location}` : ''} · {left > 0 ? `${left} of ${s.capacity} seats left` : 'Full'}
                </small>
              </div>
              <div className="subact">
                {mine ? (
                  <>
                    <span className="pill">{REG_LABEL[mine.status]}</span>
                    {mine.status === 'approved' && <Link to={`/activity/${s.slug}/confirmed`} className="btn ghost">Ticket</Link>}
                    <button className="btn ghost" disabled={busy} onClick={() => act(s.id, () => cancel(s.id))}>
                      {mine.status === 'waitlisted' ? 'Leave' : 'Cancel'}
                    </button>
                  </>
                ) : (
                  <button className="btn" disabled={busy} onClick={() => act(s.id, () => register(s.id))}>
                    {busy ? '…' : left <= 0 ? 'Join waitlist' : s.approval_mode === 'manual' ? 'Request to join' : 'Register'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
