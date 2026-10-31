import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { checkIn, fmtDay, fullTitle, listCheckInEvents, type Activity } from '../api';
import { ErrorBox, Loading } from '../components/Async';
import { useAsync } from '../lib/useAsync';
import { useStore } from '../store';

interface Result {
  ok: boolean;
  title: string;
  note: string;
}

const REASONS: Record<string, string> = {
  not_found: 'No registration found for that pass',
  wrong_event: 'This pass is for a different event',
  already: 'Already checked in',
  not_approved: 'Registration is not approved yet',
};

// BarcodeDetector is not in every browser's TS lib or runtime; we feature-detect it.
type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
const makeDetector = (): Detector | null => {
  const Ctor = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
  return Ctor ? new Ctor({ formats: ['qr_code'] }) : null;
};

export default function Scanner() {
  const { profile } = useStore();
  const events = useAsync(listCheckInEvents, []);
  const [activityId, setActivityId] = useState<string>('');
  const [result, setResult] = useState<Result | null>(null);
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState<'idle' | 'on' | 'unsupported' | 'denied'>('idle');
  const video = useRef<HTMLVideoElement>(null);
  const lastScan = useRef('');

  const list: Activity[] = events.data ?? [];
  const current = list.find((a) => a.id === activityId) ?? list.find((a) => a.slug === 'springlight') ?? list[0];

  const submitCode = async (raw: string) => {
    if (!current || busy || !raw.trim()) return;
    setBusy(true);
    try {
      const r = await checkIn(raw, current.id);
      setResult(
        r.ok
          ? { ok: true, title: r.name ?? 'Checked in', note: 'Checked in just now' }
          : { ok: false, title: r.name ?? 'Check-in failed', note: REASONS[r.reason ?? ''] ?? 'Could not check in' },
      );
      events.reload();
    } catch (e) {
      setResult({ ok: false, title: 'Check-in failed', note: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  // Camera scanning where the browser supports BarcodeDetector; manual entry is always available.
  useEffect(() => {
    const detector = makeDetector();
    if (!detector || !navigator.mediaDevices?.getUserMedia) {
      setCamera('unsupported');
      return;
    }
    let stream: MediaStream | undefined;
    let timer: number | undefined;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
        setCamera('on');
        timer = window.setInterval(async () => {
          if (!video.current || video.current.readyState < 2) return;
          const found = await detector.detect(video.current).catch(() => []);
          const value = found[0]?.rawValue;
          if (value && value !== lastScan.current) {
            lastScan.current = value;
            void submitCode(value);
            window.setTimeout(() => (lastScan.current = ''), 3000);
          }
        }, 500);
      })
      .catch(() => setCamera('denied'));
    return () => {
      window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (profile && !['coordinator', 'teacher', 'principal'].includes(profile.role)) return <Navigate to="/" replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void submitCode(code);
    setCode('');
  };

  const pct = current && current.registered_count ? Math.round((current.checked_in_count / current.registered_count) * 100) : 0;

  return (
    <main className="scanner">
      <header>
        <Link to="/" aria-label="Back to dashboard" style={{ fontSize: 26, lineHeight: 1 }}>
          ‹
        </Link>
        Event operations
      </header>

      {events.loading && <Loading />}
      {events.error && <ErrorBox message={events.error} onRetry={events.reload} />}

      {current && (
        <>
          <div>
            <label className="sr-only" htmlFor="event">
              Event
            </label>
            <select id="event" className="select" style={{ width: '100%', color: 'var(--ink)', fontWeight: 600 }} value={current.id} onChange={(e) => setActivityId(e.target.value)}>
              {list.map((a) => (
                <option key={a.id} value={a.id}>
                  {fullTitle(a)}
                </option>
              ))}
            </select>
            <p className="eyebrow" style={{ marginTop: 8 }}>
              {fmtDay(current.starts_at)} · {current.location}
            </p>
          </div>

          <section className="card counts" aria-live="polite">
            <div>
              <strong>{current.checked_in_count}</strong>
              <small>checked in</small>
            </div>
            <span className="sep" />
            <div>
              <strong style={{ fontSize: 22 }}>{current.registered_count}</strong>
              <small>registered</small>
            </div>
            <span className="pill">{pct}%</span>
          </section>

          <section>
            <h2 style={{ fontSize: 17 }}>Scan to check in</h2>
            <p className="muted" style={{ fontSize: 13, margin: '2px 0 12px' }}>
              Center the attendee’s event pass in the frame.
            </p>
            <div className="viewfinder">
              {camera === 'on' && <video ref={video} muted playsInline style={{ position: 'absolute', inset: 22, width: 'calc(100% - 44px)', height: 'calc(100% - 44px)', objectFit: 'cover', borderRadius: 12 }} />}
              <span>
                {camera === 'on' && 'Scanning…'}
                {camera === 'unsupported' && 'Camera scanning isn’t supported in this browser — enter the pass code'}
                {camera === 'denied' && 'Camera blocked — enter the pass code'}
                {camera === 'idle' && 'Starting camera…'}
              </span>
            </div>
          </section>

          {result && (
            <section className={`card result ${result.ok ? '' : 'bad'}`} aria-live="polite">
              <span className="avatar">{result.ok ? '✓' : '!'}</span>
              <div>
                <strong>{result.title}</strong>
                <p className="muted" style={{ fontSize: 12 }}>
                  {result.note}
                </p>
              </div>
            </section>
          )}

          {manual || camera !== 'on' ? (
            <form className="manual" onSubmit={submit}>
              <label className="sr-only" htmlFor="code">
                Pass code
              </label>
              <input id="code" className="field" placeholder="e.g. CMP-1A2B3C" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
              <button className="btn" disabled={busy || !code.trim()}>
                Check in
              </button>
            </form>
          ) : (
            <button className="btn ghost block" onClick={() => setManual(true)}>
              Enter manually
            </button>
          )}
        </>
      )}
    </main>
  );
}
