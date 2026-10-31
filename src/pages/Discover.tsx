import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listActivities } from '../api';
import ActivityCard from '../components/ActivityCard';
import { ErrorBox, Loading } from '../components/Async';
import { categories } from '../data';
import { useAsync } from '../lib/useAsync';

type Sort = 'soonest' | 'popular';

export default function Discover() {
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').toLowerCase();
  const [cat, setCat] = useState<(typeof categories)[number]>('All');
  const [sort, setSort] = useState<Sort>('soonest');
  const { data, error, loading, reload } = useAsync(listActivities, []);

  const list = useMemo(() => {
    const filtered = (data ?? []).filter(
      (a) => (cat === 'All' || a.category === cat) && (!q || `${a.title} ${a.category} ${a.location}`.toLowerCase().includes(q)),
    );
    return sort === 'popular' ? [...filtered].sort((a, b) => b.registered_count - a.registered_count) : filtered;
  }, [data, cat, q, sort]);

  const trending = list.filter((a) => a.featured);
  const rest = list.filter((a) => !a.featured);

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Find your next thing.</h1>
          <p className="sub">Activities, communities, and little moments that make campus yours.</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="chips" role="group" aria-label="Category">
          {categories.map((c) => (
            <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="selects">
          <label className="sr-only" htmlFor="sort">
            Sort by
          </label>
          <select id="sort" className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="soonest">Soonest</option>
            <option value="popular">Most popular</option>
          </select>
          <span className="muted" style={{ fontSize: 13 }} aria-live="polite">
            {list.length} {list.length === 1 ? 'activity' : 'activities'}
          </span>
        </div>
      </div>

      {q && (
        <p className="muted" style={{ margin: '8px 0' }}>
          Results for “{params.get('q')}”
        </p>
      )}

      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {!loading && !error && list.length === 0 && <p className="card empty">No activities match. Try a different category or search.</p>}

      {trending.length > 0 && (
        <>
          <div className="section-head">
            <h2>Trending this week</h2>
          </div>
          <div className="grid cols-4">
            {trending.map((a) => (
              <ActivityCard key={a.id} a={a} />
            ))}
          </div>
        </>
      )}

      {rest.length > 0 && (
        <>
          <div className="section-head">
            <h2>Recommended for you</h2>
          </div>
          <div className="grid cols-4">
            {rest.map((a) => (
              <ActivityCard key={a.id} a={a} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
