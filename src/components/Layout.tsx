import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { countUnread, type Role } from '../api';
import { useStore } from '../store';
import InstallButton from './InstallButton';
import PalettePicker from './PalettePicker';

const main = [
  { to: '/', icon: '⌂', label: 'Overview', end: true },
  { to: '/discover', icon: '⌕', label: 'Discover' },
  { to: '/my-activities', icon: '◷', label: 'My activities' },
  { to: '/calendar', icon: '▦', label: 'Calendar' },
  { to: '/announcements', icon: '≋', label: 'Announcements' },
  { to: '/portfolio', icon: '✦', label: 'Portfolio' },
];

const admin: { to: string; label: string; roles: Role[] }[] = [
  { to: '/manage', label: 'Manage activities', roles: ['teacher', 'coordinator', 'principal'] },
  { to: '/scanner', label: 'Event check-in', roles: ['coordinator', 'teacher', 'principal'] },
  { to: '/principal', label: 'Analytics', roles: ['principal'] },
  { to: '/users', label: 'People & roles', roles: ['principal'] },
];

const mobileTabs = [
  { to: '/', icon: '⌂', label: 'Home', end: true },
  { to: '/discover', icon: '⌕', label: 'Discover' },
  { to: '/my-activities', icon: '◷', label: 'Mine' },
  { to: '/notifications', icon: '◔', label: 'Alerts', badge: true },
];

const moreLinks = [
  { to: '/calendar', label: 'Calendar' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/portfolio', label: 'Portfolio' },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

export default function Layout() {
  const { theme, toggleTheme, session, profile, ready, signOut, institute } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [unread, setUnread] = useState(0);
  const [more, setMore] = useState(false);
  const { pathname } = useLocation();
  const uid = session?.user.id;

  // Poll for new notifications; also refresh on every page change.
  useEffect(() => {
    if (!uid) return;
    let live = true;
    const load = () => countUnread().then((n) => live && setUnread(n)).catch(() => {});
    load();
    const t = window.setInterval(load, 30000);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, [uid, pathname]);

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
            S
          </span>
          <div>
            <strong>synchro</strong>
            {institute && <small>{institute}</small>}
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

        <PalettePicker />

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
          <Link to="/" className="m-brand" aria-label="Synchro home">
            <span className="brand-mark" aria-hidden>
              S
            </span>
            <strong>synchro</strong>
          </Link>
          <Link to="/discover" className="icon-btn m-search" aria-label="Search activities">
            ⌕
          </Link>
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
            <InstallButton />
            <button className="icon-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
              {theme === 'light' ? '☾' : '☀'}
            </button>
            <Link to="/notifications" className="icon-btn" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
              ◔
              {unread > 0 && (
                <span
                  style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: 'var(--brand)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center' }}
                >
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
            <button className="avatar" style={{ border: 0 }} onClick={signOut} aria-label="Sign out" title="Sign out">
              {initials(name)}
            </button>
          </div>
        </header>
        <Outlet />
      </div>

      <nav className="bottom-nav" aria-label="Primary">
        {mobileTabs.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setMore(false)}>
            <span aria-hidden className="tab-ico">
              {n.icon}
              {n.badge && unread > 0 && <b className="tab-badge">{unread > 9 ? '9+' : unread}</b>}
            </span>
            {n.label}
          </NavLink>
        ))}
        <button className={more ? 'tab-more open' : 'tab-more'} onClick={() => setMore((v) => !v)} aria-expanded={more} aria-controls="more-sheet">
          <span aria-hidden className="tab-ico">
            ☰
          </span>
          More
        </button>
      </nav>

      {more && (
        <>
          <div className="sheet-backdrop" onClick={() => setMore(false)} />
          <div className="sheet" id="more-sheet" role="dialog" aria-label="More">
            <div className="sheet-handle" aria-hidden />
            <div className="sheet-profile">
              <span className="avatar">{initials(name)}</span>
              <div>
                <strong>{name}</strong>
                <small style={{ textTransform: 'capitalize' }}>{role}</small>
              </div>
            </div>
            {[...moreLinks, ...links].map((n) => (
              <Link key={n.to} to={n.to} className="sheet-link" onClick={() => setMore(false)}>
                {n.label}
              </Link>
            ))}
            <div className="sheet-actions">
              <InstallButton />
              <PalettePicker />
              <button className="btn ghost" onClick={toggleTheme}>
                {theme === 'light' ? 'Dark theme' : 'Light theme'}
              </button>
              <button className="btn ghost" onClick={signOut}>
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
