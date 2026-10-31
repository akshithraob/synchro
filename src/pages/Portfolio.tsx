import { Link } from 'react-router-dom';
import { fmtDay, fullTitle } from '../api';
import { useStore } from '../store';

export default function Portfolio() {
  const { profile, registrations, institute } = useStore();
  const attended = registrations
    .filter((r) => r.checked_in_at)
    .sort((a, b) => a.activities.starts_at.localeCompare(b.activities.starts_at));

  const byCategory = new Map<string, number>();
  for (const r of attended) byCategory.set(r.activities.category, (byCategory.get(r.activities.category) ?? 0) + 1);

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Portfolio</h1>
          <p className="sub">{profile?.full_name || 'Your'} verified activity record{institute ? ` at ${institute}` : ''}.</p>
        </div>
        <button className="btn" onClick={() => window.print()} disabled={!attended.length}>
          Print / save as PDF
        </button>
      </div>

      {attended.length === 0 ? (
        <p className="card empty">
          Events appear here once you’ve been checked in at them.{' '}
          <Link to="/discover" style={{ color: 'var(--brand)', fontWeight: 600 }}>Find an activity</Link>
        </p>
      ) : (
        <>
          <div className="metrics" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <div className="card stat">
              <span className="label">Events attended</span>
              <span className="value">{attended.length}</span>
            </div>
            {[...byCategory].map(([name, n]) => (
              <div className="card stat" key={name}>
                <span className="label">{name}</span>
                <span className="value">{n}</span>
              </div>
            ))}
          </div>

          <section className="card panel" style={{ marginTop: 20 }}>
            <h2>Attended events</h2>
            {attended.map((r) => (
              <div className="approval" key={r.id}>
                <div>
                  <strong style={{ fontSize: 14 }}>{fullTitle(r.activities)}</strong>
                  <small>
                    {r.activities.category} · {r.activities.location}
                  </small>
                </div>
                <span className="muted">{fmtDay(r.activities.starts_at)}</span>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
