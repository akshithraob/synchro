import { Link } from 'react-router-dom';
import ActivityCard from '../components/ActivityCard';
import { useStore } from '../store';

export default function MyActivities() {
  const { registrations } = useStore();

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>My activities</h1>
          <p className="sub">Everything you’re registered for.</p>
        </div>
      </div>
      {registrations.length ? (
        <div className="grid cols-4">
          {registrations.map((r) => (
            <ActivityCard key={r.id} a={r.activities} showSpots={false} />
          ))}
        </div>
      ) : (
        <p className="card empty">
          You haven’t registered for anything yet.{' '}
          <Link to="/discover" style={{ color: 'var(--brand)', fontWeight: 600 }}>
            Find an activity
          </Link>
        </p>
      )}
    </main>
  );
}
