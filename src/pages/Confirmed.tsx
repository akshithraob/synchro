import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { fmtWhen } from '../api';
import { useStore } from '../store';

const ics = (title: string, when: string, where: string) =>
  `data:text/calendar;charset=utf-8,${encodeURIComponent(
    ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `SUMMARY:${title}`, `LOCATION:${where}`, `DESCRIPTION:${when}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'),
  )}`;

export default function Confirmed() {
  const { slug = '' } = useParams();
  const { registrations } = useStore();
  const reg = registrations.find((r) => r.activities.slug === slug);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!reg) return;
    QRCode.toDataURL(reg.pass_code, { margin: 1, width: 220, color: { dark: '#182522', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [reg]);

  if (!reg || reg.status !== 'approved') return <Navigate to={`/activity/${slug}`} replace />;
  const a = reg.activities;
  const when = fmtWhen(a.starts_at);

  return (
    <main className="confirm-wrap">
      <section className="card confirm">
        <span className="check" aria-hidden>
          ✓
        </span>
        <p className="eyebrow brand">You’re on the list</p>
        <h1 style={{ fontSize: 24 }}>See you at {a.title.split(':')[0]}.</h1>
        <p className="muted">Your place is saved. Show this pass at the door.</p>

        <div className="ticket">
          <p className="eyebrow brand">{when}</p>
          <p style={{ fontWeight: 600, marginTop: 4 }}>{a.title}</p>
          <p className="muted" style={{ fontSize: 13 }}>
            {a.location} · {a.location_note}
          </p>
          <div style={{ display: 'grid', placeItems: 'center', marginTop: 14 }}>
            {qr && <img src={qr} width={132} height={132} alt={`Entry pass QR code for ${a.title}`} style={{ borderRadius: 8 }} />}
            <p style={{ marginTop: 8, fontWeight: 600, letterSpacing: '0.08em' }}>{reg.pass_code}</p>
          </div>
        </div>

        <Link to="/discover" className="btn block">
          Back to activities
        </Link>
        <a className="link-btn" href={ics(a.title, when, a.location)} download={`${a.slug}.ics`}>
          Add to calendar +
        </a>
      </section>
    </main>
  );
}
