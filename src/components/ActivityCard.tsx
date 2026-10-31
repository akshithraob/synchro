import { Link } from 'react-router-dom';
import { fmtWhen, spotsLeft, type Activity } from '../api';

export default function ActivityCard({ a, showSpots = true }: { a: Activity; showSpots?: boolean }) {
  const left = spotsLeft(a);
  return (
    <Link to={`/activity/${a.slug}`} className="card activity" aria-label={a.title}>
      <div className="cover" style={{ background: a.cover }}>
        <span className="pill">{a.category}</span>
        <span className="glyph" aria-hidden>
          ✦
        </span>
      </div>
      <h3>{a.title}</h3>
      <p className="meta">
        {fmtWhen(a.starts_at)} · {a.location}
      </p>
      {showSpots && <p className="avail">{left > 0 ? `Registration open · ${left} spots` : 'Full'}</p>}
      <span className="go">View details →</span>
    </Link>
  );
}
