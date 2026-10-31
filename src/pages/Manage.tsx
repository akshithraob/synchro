import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { fmtWhen, listMyEvents, listRegistrants, updateEvent, withdrawEvent, type MyEvent } from '../api';
import { ErrorBox, Loading } from '../components/Async';
import { categories } from '../data';
import { useAsync } from '../lib/useAsync';
import { useStore } from '../store';

const STATUS_LABEL: Record<string, string> = { draft: 'Draft', pending: 'Awaiting approval', approved: 'Live', declined: 'Declined' };

function Registrants({ id }: { id: string }) {
  const r = useAsync(() => listRegistrants(id), [id]);
  if (r.loading) return <Loading />;
  if (r.error) return <ErrorBox message={r.error} onRetry={r.reload} />;
  if (!r.data?.length) return <p className="muted">No registrations yet.</p>;
  return (
    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ textAlign: 'left' }}>
          <th>Name</th>
          <th>Pass</th>
          <th>Checked in</th>
        </tr>
      </thead>
      <tbody>
        {r.data.map((x) => (
          <tr key={x.pass_code}>
            <td>{x.full_name || '—'}</td>
            <td>{x.pass_code}</td>
            <td>{x.checked_in_at ? '✓' : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EditForm({ e, onDone }: { e: MyEvent; onDone: (saved: boolean) => void }) {
  const [title, setTitle] = useState(e.title);
  const [category, setCategory] = useState(e.category);
  const [capacity, setCapacity] = useState(e.capacity);
  const [location, setLocation] = useState(e.location);
  const [about, setAbout] = useState(e.about_body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await updateEvent(e.id, { title: title.trim(), category, capacity, location: location.trim(), about_body: about.trim() });
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
  const [editing, setEditing] = useState<string | null>(null);
  const [showing, setShowing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (profile && !['teacher', 'principal'].includes(profile.role)) return <Navigate to="/" replace />;

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

      {events.loading && <Loading />}
      {events.error && <ErrorBox message={events.error} onRetry={events.reload} />}
      {error && <p role="alert" className="warn">{error}</p>}
      {!events.loading && events.data?.length === 0 && (
        <p className="card empty">
          You haven’t created any events. <Link to="/studio" style={{ color: 'var(--brand)', fontWeight: 600 }}>Start one</Link>
        </p>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {(events.data ?? []).map((e) => {
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
                  {e.registered_count}/{e.capacity} registered · {e.checked_in_count} checked in
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
                  <Registrants id={e.id} />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
