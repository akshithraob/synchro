import { useEffect, useRef, useState } from 'react';
import { decidePhoto, deletePhoto, listPhotos, uploadPhoto, type EventPhoto } from '../lib/photosApi';
import { useAsync } from '../lib/useAsync';
import { ErrorBox, Loading } from './Async';

export default function EventGallery({ activityId, isPrincipal, userId }: { activityId: string; isPrincipal: boolean; userId?: string }) {
  const photos = useAsync(() => listPhotos(activityId), [activityId]);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const all = photos.data ?? [];
  const live = all.filter((p) => p.status === 'approved');
  const waiting = all.filter((p) => p.status === 'pending' && (isPrincipal || p.created_by === userId));
  const declined = all.filter((p) => p.status === 'declined' && (isPrincipal || p.created_by === userId));

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') setOpen((i) => (i === null ? i : (i + 1) % live.length));
      if (e.key === 'ArrowLeft') setOpen((i) => (i === null ? i : (i - 1 + live.length) % live.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, live.length]);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    setNote(null);
    const failures: string[] = [];
    let ok = 0;
    for (const f of Array.from(files)) {
      try {
        await uploadPhoto(activityId, f);
        ok++;
      } catch (e) {
        failures.push((e as Error).message);
      }
    }
    if (failures.length) setError(failures.join(' '));
    if (ok && !isPrincipal) setNote(`${ok} ${ok === 1 ? 'photo' : 'photos'} sent for review. You will get an alert when the admin decides.`);
    if (input.current) input.current.value = '';
    setBusy(false);
    photos.reload();
  };

  const act = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
      photos.reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = (p: EventPhoto) => {
    if (!window.confirm('Delete this photo?')) return;
    setOpen(null);
    return act(() => deletePhoto(p));
  };

  const current = open !== null ? live[open] : null;

  return (
    <section className="card details" aria-label="Photo gallery">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 17 }}>Photos{live.length > 0 && <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {live.length}</span>}</h2>
        {userId && (
          <>
            <label className="btn" htmlFor={`photo-${activityId}`} style={{ cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Uploading…' : isPrincipal ? 'Add photos' : 'Add your photos'}
            </label>
            <input id={`photo-${activityId}`} ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy} onChange={(e) => add(e.target.files)} />
          </>
        )}
      </div>
      {!isPrincipal && userId && <p className="muted" style={{ fontSize: 12 }}>Photos you add are checked by the admin before everyone can see them.</p>}
      {photos.loading && <Loading />}
      {photos.error && <ErrorBox message={photos.error} onRetry={photos.reload} />}
      {error && <p role="alert" className="warn">{error}</p>}
      {note && <p role="status" className="muted" style={{ fontSize: 13 }}>{note}</p>}
      {!photos.loading && !photos.error && live.length === 0 && waiting.length === 0 && declined.length === 0 && (
        <p className="muted" style={{ fontSize: 13 }}>No photos yet. Be the first to share one from this event.</p>
      )}

      <div className="gallery">
        {live.map((p, i) => (
          <button key={p.id} type="button" className="shot" onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1} of ${live.length}`}>
            <img src={p.url} alt={p.caption || `Event photo ${i + 1}`} loading="lazy" />
          </button>
        ))}
      </div>

      {waiting.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, marginTop: 14 }}>{isPrincipal ? `Waiting for your approval (${waiting.length})` : `Waiting for review (${waiting.length})`}</h3>
          <div className="gallery">
            {waiting.map((p) => (
              <div key={p.id} className="shot-wrap">
                <div className="shot"><img src={p.url} alt="Photo waiting for review" loading="lazy" /></div>
                <div className="shot-actions">
                  {isPrincipal ? (
                    <>
                      <button className="btn" onClick={() => act(() => decidePhoto(p.id, 'approved'))}>Approve</button>
                      <button className="btn ghost" onClick={() => act(() => decidePhoto(p.id, 'declined'))}>Decline</button>
                    </>
                  ) : (
                    <button className="btn ghost" onClick={() => remove(p)}>Withdraw</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {declined.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, marginTop: 14 }}>{isPrincipal ? 'Declined' : 'Not approved'}</h3>
          <div className="gallery">
            {declined.map((p) => (
              <div key={p.id} className="shot-wrap">
                <div className="shot" style={{ opacity: 0.55 }}><img src={p.url} alt="Declined photo" loading="lazy" /></div>
                <div className="shot-actions">
                  {isPrincipal && <button className="btn" onClick={() => act(() => decidePhoto(p.id, 'approved'))}>Approve</button>}
                  <button className="btn ghost" onClick={() => remove(p)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {current && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={() => setOpen(null)}>
          <img src={current.url} alt={current.caption || 'Event photo'} onClick={(e) => e.stopPropagation()} />
          <div className="lb-bar" onClick={(e) => e.stopPropagation()}>
            {live.length > 1 && <button className="btn ghost" onClick={() => setOpen((open! - 1 + live.length) % live.length)} aria-label="Previous photo">‹</button>}
            <span>{open! + 1} / {live.length}</span>
            {live.length > 1 && <button className="btn ghost" onClick={() => setOpen((open! + 1) % live.length)} aria-label="Next photo">›</button>}
            {isPrincipal && <button className="btn ghost" onClick={() => remove(current)}>Delete</button>}
            <button className="btn" onClick={() => setOpen(null)}>Close</button>
          </div>
        </div>
      )}
    </section>
  );
}
