import { useState } from 'react';
import { Link } from 'react-router-dom';
import { decidePhoto, listPendingPhotos } from '../lib/photosApi';
import { useAsync } from '../lib/useAsync';

export default function PhotoQueue() {
  const q = useAsync(listPendingPhotos, []);
  const [error, setError] = useState<string | null>(null);
  const items = q.data ?? [];
  if (!items.length && !error) return null;

  const decide = async (id: string, status: 'approved' | 'declined') => {
    setError(null);
    try {
      await decidePhoto(id, status);
      q.reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <section className="card panel" aria-label="Photos awaiting approval" style={{ marginBottom: 20 }}>
      <h2>Photos awaiting approval ({items.length})</h2>
      {error && <p role="alert" className="warn">{error}</p>}
      <div className="gallery" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {items.map((p) => (
          <div key={p.id} className="shot-wrap">
            <div className="shot"><img src={p.url} alt={`Photo for ${p.activities?.title ?? 'an event'}`} loading="lazy" /></div>
            {p.activities && (
              <Link to={`/activity/${p.activities.slug}`} className="muted" style={{ fontSize: 12 }}>
                {p.activities.parent ? `${p.activities.parent.title}: ` : ''}{p.activities.title}
              </Link>
            )}
            <div className="shot-actions">
              <button className="btn" onClick={() => decide(p.id, 'approved')}>Approve</button>
              <button className="btn ghost" onClick={() => decide(p.id, 'declined')}>Decline</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
