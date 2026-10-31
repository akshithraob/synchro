import { useState, type FormEvent } from 'react';
import { deleteAnnouncement, listAnnouncements, postAnnouncement } from '../api';
import { ErrorBox, Loading } from '../components/Async';
import { useAsync } from '../lib/useAsync';
import { useStore } from '../store';

const TAGS = ['Campus', 'Sports', 'Academics', 'Clubs', 'Reminder'];

export default function Announcements() {
  const { profile } = useStore();
  const list = useAsync(listAnnouncements, []);
  const [tag, setTag] = useState(TAGS[0]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPrincipal = profile?.role === 'principal';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await postAnnouncement({ tag, title: title.trim(), body: body.trim() });
      setTitle('');
      setBody('');
      list.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await deleteAnnouncement(id);
      list.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Announcements</h1>
          <p className="sub">News and reminders from across campus.</p>
        </div>
      </div>

      {isPrincipal && (
        <form className="card panel" onSubmit={submit} style={{ marginBottom: 20, display: 'grid', gap: 10 }}>
          <h2>Post an announcement</h2>
          <label className="sr-only" htmlFor="a-tag">Tag</label>
          <select id="a-tag" className="select" value={tag} onChange={(e) => setTag(e.target.value)} style={{ maxWidth: 200 }}>
            {TAGS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="a-title">Title</label>
          <input id="a-title" className="field" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
          <label className="sr-only" htmlFor="a-body">Message</label>
          <textarea id="a-body" className="field" rows={3} placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} required />
          {error && <p role="alert" className="warn">{error}</p>}
          <div>
            <button className="btn" disabled={busy || !title.trim() || !body.trim()}>{busy ? 'Posting…' : 'Post'}</button>
          </div>
        </form>
      )}

      {list.loading && <Loading />}
      {list.error && <ErrorBox message={list.error} onRetry={list.reload} />}
      {!list.loading && list.data?.length === 0 && <p className="card empty">No announcements yet.</p>}
      <div style={{ display: 'grid', gap: 12 }}>
        {(list.data ?? []).map((a) => (
          <article className="card panel" key={a.id}>
            <span className="pill">{a.tag}</span>
            <h2 style={{ marginTop: 8 }}>{a.title}</h2>
            <p className="muted" style={{ marginTop: 4 }}>{a.body}</p>
            {isPrincipal && (
              <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => remove(a.id)}>
                Delete
              </button>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
