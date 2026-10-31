import { Link } from 'react-router-dom';

export default function ComingSoon({ title }: { title: string }) {
  return (
    <main className="page">
      <h1>{title}</h1>
      <p className="card empty" style={{ marginTop: 24 }}>
        This screen isn’t in the prototype yet. <Link to="/" style={{ color: 'var(--brand)', fontWeight: 600 }}>Back to overview</Link>
      </p>
    </main>
  );
}
