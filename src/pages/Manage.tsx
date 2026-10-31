import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { decideRegistration, fmtWhen, listMyEvents, listPendingRegistrations, listRegistrants, REG_LABEL, updateEvent, withdrawEvent, type MyEvent } from '../api';
import { ErrorBox, Loading } from '../components/Async';
import SubEventsAdmin from '../components/SubEventsAdmin';
import { categories } from '../data';
import { useAsync } from '../lib/useAsync';
import { useStore } from '../store';

const STATUS_LABEL: Record<string, string> = { draft: 'Draft', pending: 'Awaiting approval', approved: 'Live', declined: 'Declined' };

function Registrants({ id, onChanged }: { id: string; onChanged: () => void }) {
  const r = useAsync(() => listRegistrants(id), [id]);
  const [error, setError] = useState<string | null>(null);

  const decide = async (rid: string, status: 'approved' | 'rejected') => {
    setError(null);
    try {
      await decideRegistration(rid, status);
      r.reload();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (r.loading) return <Loading />;
  if (r.error) return <ErrorBox message={r.error} onRetry={r.reload} />;
  if (!r.data?.length) return <p className="muted">No registrations yet.</p>;
  return (
    <>
      {error && <p role="alert" className="warn">{error}</p>}
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th>Name</th>
            <th>Status</th>
            <th>Checked in</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {r.data.map((x) => (
            <tr key={x.id}>
              <td>{x.full_name || '—'}</td>
              <td>{REG_LABEL[x.status]}</td>
              <td>{x.checked_in_at ? '✓' : '—'}</td>
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                {x.status === 'pending' && (
                  <button className="btn" onClick={() => decide(x.id, 'approved')}>Approve</button>
                )}{' '}
                {x.status !== 'rejected' && !x.checked_in_at && (
                  <button className="btn ghost" onClick={() => decide(x.id, 'rejected')}>Reject</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function EditForm({ e, onDone }: { e: MyEvent; onDone: (saved: boolean) => void }) {
  const [title, setTitle] = useState(e.title);
  const [category, setCategory] = useState(e.category);
  const [capacity, setCapacity] = useState(e.capacity);
  const [location, setLocation] = useState(e.location);
  const [about, setAbout] = useState(e.about_body);
  const [approval, setApproval] = useState<'auto' | 'manual'>(e.approval_mode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await updateEvent(e.id, { title: title.trim(), category, capacity, location: location.trim(), about_body: about.trim(), approval_mode: approval });
      onDone(true);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
      <label htmlFor={`t-${e.id}`}>Title</label>
      <input id={`t-${e.id}`} className="field" value={title} onChange={(x) => setTitle(x.target.value)} maxLength={160} />
      <label htmlFor={`c-${e.id}`}>Category</label>
      <select id={`c-${e.id}`} className="select" value={category} onChange={(x) => setCategory(x.target.value)}>
        {categories.filter((c) => c !== 'All').map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <label htmlFor={`cap-${e.id}`}>Capacity</label>
      <input id={`cap-${e.id}`} type="number" min={1} className="field" value={capacity} onChange={(x) => setCapacity(Math.max(1, Number(x.target.value) || 1))} />
      <label htmlFor={`l-${e.id}`}>Venue</label>
      <input id={`l-${e.id}`} className="field" value={location} onChange={(x) => setLocation(x.target.value)} />
      <label htmlFor={`m-${e.id}`}>Registration</label>
      <select id={`m-${e.id}`} className="select" value={approval} onChange={(x) => setApproval(x.target.value as 'auto' | 'manual')}>
        <option value="auto">Automatic confirmation</option>
        <option value="manual">Organizer approves each registration</option>
      </select>
      <label htmlFor={`a-${e.id}`}>Description</label>
      <textarea id={`a-${e.id}`} className="field" rows={3} value={about} onChange={(x) => setAbout(x.target.value)} />
      {error && <p role="alert" className="warn">{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" disabled={busy || !title.trim()} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        <button className="btn ghost" onClick={() => onDone(false)}>Cancel</button>
      </div>
    </div>
  );
}

export default function Manage() {
  const { profile, session } = useStore();
  const uid = session?.user.id;
  const events = useAsync(() => (uid ? listMyEvents(uid) : Promise.resolve([])), [uid]);
  const queue = useAsync(listPendingRegistrations, []);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showing, setShowing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (profile && !['teacher', 'coordinator', 'principal'].includes(profile.role)) return <Navigate to="/" replace />;

  const decideQueued = async (id: string, status: 'approved' | 'rejected') => {
    setQueueError(null);
    try {
      await decideRegistration(id, status);
      queue.reload();
      events.reload();
    } catch (err) {
      setQueueError((err as Error).message);
    }
  };

  const withdraw = async (e: MyEvent) => {
    if (!window.confirm(`Delete “${e.title}”? This can't be undone.`)) return;
    setError(null);
    try {
      await withdrawEvent(e.id);
      events.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Manage activities</h1>
          <p className="sub">Events you’ve created.</p>
        </div>
        <Link to="/studio" className="btn">New event</Link>
      </div>

      {(queue.data?.length ?? 0) > 0 && (
        <section className="card panel" aria-label="Registrations awaiting approval" style={{ marginBottom: 20 }}>
          <h2>Registrations awaiting approval</h2>
          {queueError && <p role="alert" className="warn">{queueError}</p>}
          {queue.data?.map((q) => (
            <div className="approval" key={q.id}>
              <div>
                <strong style={{ fontSize: 14 }}>{q.full_name || 'Student'}</strong>
                <small>{q.activity_title}</small>
              </div>
              <span style={{ display: 'flex', gap: 6 }}>
                <button className="btn ghost" onClick={() => decideQueued(q.id, 'rejected')}>Reject</button>
                <button className="btn" onClick={() => decideQueued(q.id, 'approved')}>Approve</button>
              </span>
            </div>
          ))}
        </section>
      )}

      {events.loading && <Loading />}
      {events.error && <ErrorBox message={events.error} onRetry={events.reload} />}
      {error && <p role="alert" className="warn">{error}</p>}
      {!events.loading && events.data?.length === 0 && (
        <p className="card empty">
          You haven’t created any events. <Link to="/studio" style={{ color: 'var(--brand)', fontWeight: 600 }}>Start one</Link>
        </p>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {(events.data ?? []).filter((e) => !e.parent_id).map((e) => {
          const editable = e.status === 'draft' || e.status === 'pending';
          return (
            <article className="card panel" key={e.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <h2>{e.title}</h2>
                  <p className="muted" style={{ fontSize: 13 }}>
                    {e.category} · {fmtWhen(e.starts_at)} · {e.location}
                  </p>
                </div>
                <span className="pill" style={{ alignSelf: 'flex-start' }}>{STATUS_LABEL[e.status]}</span>
              </div>

              {e.status === 'approved' && (
                <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                  {e.registered_count}/{e.capacity} seats held · {e.checked_in_count} checked in · {e.approval_mode === 'manual' ? 'manual approval' : 'auto-confirm'}
                </p>
              )}
              {e.status === 'declined' && (
                <p className="warn">Declined{e.decline_reason ? `: ${e.decline_reason}` : '.'}</p>
              )}

              {editing === e.id ? (
                <EditForm
                  e={e}
                  onDone={(saved) => {
                    setEditing(null);
                    if (saved) events.reload();
                  }}
                />
              ) : (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {editable && <button className="btn ghost" onClick={() => setEditing(e.id)}>Edit</button>}
                  {e.status === 'approved' && (
                    <>
                      <Link to={`/activity/${e.slug}`} className="btn ghost">View page</Link>
                      <button className="btn ghost" onClick={() => setShowing(showing === e.id ? null : e.id)}>
                        {showing === e.id ? 'Hide registrants' : 'Registrants'}
                      </button>
                    </>
                  )}
                  {e.status !== 'approved' && <button className="btn ghost" onClick={() => withdraw(e)}>{e.status === 'declined' ? 'Delete' : 'Withdraw'}</button>}
                </div>
              )}

              {showing === e.id && (
                <div style={{ marginTop: 12 }}>
                  <Registrants id={e.id} onChanged={() => { events.reload(); queue.reload(); }} />
                </div>
              )}

              <SubEventsAdmin
                parent={e}
                subs={(events.data ?? []).filter((x) => x.parent_id === e.id).sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.title.localeCompare(b.title))}
                onChanged={() => { events.reload(); queue.reload(); }}
                renderRegistrants={(id) => <Registrants id={id} onChanged={() => { events.reload(); queue.reload(); }} />}
              />
            </article>
          );
        })}
      </div>
    </main>
  );
}
