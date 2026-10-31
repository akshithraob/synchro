import { useState, type FormEvent } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { Role } from '../api';
import { useStore } from '../store';

const main = [
  { to: '/', icon: '⌂', label: 'Overview', end: true },
  { to: '/discover', icon: '⌕', label: 'Discover' },
  { to: '/my-activities', icon: '◷', label: 'My activities' },
  { to: '/calendar', icon: '▦', label: 'Calendar' },
  { to: '/announcements', icon: '≋', label: 'Announcements' },
  { to: '/portfolio', icon: '✦', label: 'Portfolio' },
];

const admin: { to: string; label: string; roles: Role[] }[] = [
  { to: '/manage', label: 'Manage activities', roles: ['teacher', 'principal'] },
  { to: '/scanner', label: 'Event check-in', roles: ['coordinator', 'teacher', 'principal'] },
  { to: '/principal', label: 'Analytics', roles: ['principal'] },
  { to: '/users', label: 'People & roles', roles: ['principal'] },
];

const mobileTabs = [
  { to: '/', icon: '⌂', label: 'Home', end: true },
  { to: '/discover', icon: '⌕', label: 'Discover' },
  { to: '/my-activities', icon: '◷', label: 'Schedule' },
  { to: '/portfolio', icon: '✦', label: 'Portfolio' },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

export default function Layout() {
  const { theme, toggleTheme, session, profile, ready, signOut } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  if (!ready) return <p className="card empty" style={{ margin: 40 }} role="status">Loading…</p>;
  if (!session) return <Navigate to="/login" replace />;

  const role = profile?.role ?? 'student';
  const name = profile?.full_name || session.user.email || 'You';
  const links = admin.filter((l) => l.roles.includes(role));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/discover?q=${encodeURIComponent(q.trim())}` : '/discover');
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            C
          </span>
          <div>
            <strong>synchro</strong>
            <small>Northstar University</small>
          </div>
        </div>

        <nav className="nav" aria-label="Main">
          {main.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <span className="ico" aria-hidden>
                {n.icon}
              </span>
              {n.label}
            </NavLink>
          ))}
          {links.length > 0 && <div className="nav-label">Campus</div>}
          {links.map((n) => (
            <NavLink key={n.to} to={n.to} className="sub">
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="profile">
          <span className="avatar">{initials(name)}</span>
          <div style={{ minWidth: 0 }}>
            <strong>{name}</strong>
            <small style={{ textTransform: 'capitalize' }}>{role}</small>
          </div>
          <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={signOut} aria-label="Sign out" title="Sign out">
            ⏻
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <form className="search" role="search" onSubmit={submit}>
            <span aria-hidden>⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search activities, people, announcements…"
              aria-label="Search activities"
            />
            <kbd>⌘ K</kbd>
          </form>
          <div className="topbar-end">
            <button className="icon-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
              {theme === 'light' ? '☾' : '☀'}
            </button>
            <button className="icon-btn" aria-label="Notifications">
              ◔<span className="dot" />
            </button>
            <button className="avatar" style={{ border: 0 }} onClick={signOut} aria-label="Sign out" title="Sign out">
              {initials(name)}
            </button>
          </div>
        </header>
        <Outlet />
      </div>

      <nav className="bottom-nav" aria-label="Primary">
        {mobileTabs.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}>
            <span aria-hidden>{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
