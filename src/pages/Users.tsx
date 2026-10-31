import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { listUsers, setUserRole, type Role } from '../api';
import { ErrorBox, Loading } from '../components/Async';
import { useAsync } from '../lib/useAsync';
import { useStore } from '../store';

const ROLES: Role[] = ['student', 'teacher', 'coordinator', 'principal'];

export default function Users() {
  const { profile, session } = useStore();
  const users = useAsync(listUsers, []);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (profile && profile.role !== 'principal') return <Navigate to="/" replace />;

  const change = async (id: string, role: Role) => {
    setBusyId(id);
    setError(null);
    try {
      await setUserRole(id, role);
      users.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>People &amp; roles</h1>
          <p className="sub">Choose what each person can do. Changes apply the next time they load the app.</p>
        </div>
      </div>
      {users.loading && <Loading />}
      {users.error && <ErrorBox message={users.error} onRetry={users.reload} />}
      {error && <p role="alert" className="warn">{error}</p>}
      <div style={{ display: 'grid', gap: 8 }}>
        {(users.data ?? []).map((u) => {
          const me = u.id === session?.user.id;
          return (
            <div className="card panel" key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong>{u.full_name || '—'}</strong> {me && <span className="pill">You</span>}
                <p className="muted" style={{ fontSize: 13 }}>{u.email}</p>
              </div>
              <label className="sr-only" htmlFor={`r-${u.id}`}>Role for {u.email}</label>
              <select id={`r-${u.id}`} className="select" value={u.role} disabled={me || busyId === u.id} onChange={(e) => change(u.id, e.target.value as Role)}>
                {ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </main>
  );
}
