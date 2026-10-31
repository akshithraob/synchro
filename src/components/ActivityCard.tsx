import { Link } from 'react-router-dom';
import { fmtWhen, fullTitle, spotsLeft, type Activity } from '../api';

export default function ActivityCard({ a, showSpots = true, subCount = 0 }: { a: Activity; showSpots?: boolean; subCount?: number }) {
  const left = spotsLeft(a);
  return (
    <Link to={`/activity/${a.slug}`} className="card activity" aria-label={fullTitle(a)}>
      <div className="cover" style={{ background: a.cover }}>
        <span className="pill">{a.category}</span>
        <span className="glyph" aria-hidden>
          ✦
        </span>
      </div>
      <h3>{fullTitle(a)}</h3>
      <p className="meta">
        {fmtWhen(a.starts_at)} · {a.location}
      </p>
      {subCount > 0 && <p className="avail">{subCount} {subCount === 1 ? 'competition' : 'competitions'} inside</p>}
      {showSpots && <p className="avail">{left > 0 ? `Registration open · ${left} spots` : 'Full'}</p>}
      <span className="go">View details →</span>
    </Link>
  );
}
