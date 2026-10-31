import { useEffect, useRef, useState } from 'react';
import { deletePhoto, listPhotos, uploadPhoto, type EventPhoto } from '../lib/photosApi';
import { useAsync } from '../lib/useAsync';
import { ErrorBox, Loading } from './Async';

export default function EventGallery({ activityId, canEdit }: { activityId: string; canEdit: boolean }) {
  const photos = useAsync(() => listPhotos(activityId), [activityId]);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const list = photos.data ?? [];

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') setOpen((i) => (i === null ? i : (i + 1) % list.length));
      if (e.key === 'ArrowLeft') setOpen((i) => (i === null ? i : (i - 1 + list.length) % list.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, list.length]);

  if (!canEdit && !photos.loading && !photos.error && list.length === 0) return null;

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    const failures: string[] = [];
    for (const f of Array.from(files)) {
      try {
        await uploadPhoto(activityId, f, '');
      } catch (e) {
        failures.push((e as Error).message);
      }
    }
    if (failures.length) setError(failures.join(' '));
    if (input.current) input.current.value = '';
    setBusy(false);
    photos.reload();
  };

  const remove = async (p: EventPhoto) => {
    if (!window.confirm('Delete this photo?')) return;
    setError(null);
    try {
      await deletePhoto(p);
      setOpen(null);
      photos.reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const current = open !== null ? list[open] : null;

  return (
    <section className="card details" aria-label="Photo gallery">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 17 }}>Photos{list.length > 0 && <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {list.length}</span>}</h2>
        {canEdit && (
          <>
            <label className="btn" htmlFor={`photo-${activityId}`} style={{ cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Uploading…' : 'Add photos'}
            </label>
            <input id={`photo-${activityId}`} ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy} onChange={(e) => add(e.target.files)} />
          </>
        )}
      </div>
      {photos.loading && <Loading />}
      {photos.error && <ErrorBox message={photos.error} onRetry={photos.reload} />}
      {error && <p role="alert" className="warn">{error}</p>}
      {canEdit && list.length === 0 && !photos.loading && <p className="muted" style={{ fontSize: 13 }}>No photos yet. Add some and everyone will see them here.</p>}

      <div className="gallery">
        {list.map((p, i) => (
          <button key={p.id} type="button" className="shot" onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1} of ${list.length}`}>
            <img src={p.url} alt={p.caption || `Event photo ${i + 1}`} loading="lazy" />
          </button>
        ))}
      </div>

      {current && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={() => setOpen(null)}>
          <img src={current.url} alt={current.caption || 'Event photo'} onClick={(e) => e.stopPropagation()} />
          <div className="lb-bar" onClick={(e) => e.stopPropagation()}>
            {list.length > 1 && <button className="btn ghost" onClick={() => setOpen((open! - 1 + list.length) % list.length)} aria-label="Previous photo">‹</button>}
            <span>{open! + 1} / {list.length}</span>
            {list.length > 1 && <button className="btn ghost" onClick={() => setOpen((open! + 1) % list.length)} aria-label="Next photo">›</button>}
            {canEdit && <button className="btn ghost" onClick={() => remove(current)}>Delete</button>}
            <button className="btn" onClick={() => setOpen(null)}>Close</button>
          </div>
        </div>
      )}
    </section>
  );
}
