import { useState } from 'react';
import { submitActivity } from '../api';
import { categories } from '../data';
import { useStore } from '../store';

const steps = ['Basics', 'Schedule & venue', 'Registration', 'Resources & team', 'Review & publish'];

interface Plan {
  title: string;
  sessions: { time: string; label: string }[];
  checklist: { label: string; done: boolean }[];
}

// Template planner: derives an editable draft from the prompt without any paid AI service.
function draftPlan(name: string, prompt: string): Plan {
  const sports = /sport|track|run|team|game/i.test(`${name} ${prompt}`);
  const sessions = sports
    ? [
        { time: '8:30', label: 'Opening ceremony' },
        { time: '9:15', label: 'Track & field heats' },
        { time: '11:30', label: 'Team games' },
        { time: '1:30', label: 'Finals & awards' },
      ]
    : [
        { time: '5:00', label: 'Doors & welcome' },
        { time: '5:30', label: 'Main program' },
        { time: '7:00', label: 'Q&A and networking' },
        { time: '8:00', label: 'Wrap-up' },
      ];
  const students = prompt.match(/(\d{2,4})\s*students/i)?.[1];
  return {
    title: sports ? 'A campus-wide sports day' : `Plan for ${name || 'your event'}`,
    sessions,
    checklist: [
      { label: 'Reserve venue', done: true },
      { label: sports ? 'Request 8 field kits' : 'Request AV equipment', done: true },
      { label: `Assign ${students ? Math.max(4, Math.round(Number(students) / 25)) : 8} volunteers`, done: false },
    ],
  };
}

// Next Friday 9:00, stored as campus-local wall-clock time (see api.ts).
function nextFriday() {
  const d = new Date();
  d.setUTCHours(9, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + ((5 - d.getUTCDay() + 7) % 7 || 7));
  return d.toISOString();
}

export default function Studio() {
  const { session, profile } = useStore();
  const isCoordinator = profile?.role === 'coordinator';
  const [approval, setApproval] = useState<'auto' | 'manual'>('auto');
  const [name, setName] = useState('Annual Sports Day');
  const [prompt, setPrompt] = useState('Organize a sports day for 300 students next Friday. Include track events, team games, and an opening ceremony.');
  const [category, setCategory] = useState('Sports');
  const [capacity, setCapacity] = useState(300);
  const [venue, setVenue] = useState('Stadium');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState('Not saved yet');

  const generate = () => {
    setPlan(draftPlan(name, prompt));
    setSubmitted(false);
    setError(null);
    setSaved('Draft updated just now');
  };

  const submit = async () => {
    if (!plan || !session) return;
    setBusy(true);
    setError(null);
    try {
      await submitActivity(
        {
          title: name.trim(),
          category,
          capacity,
          location: venue.trim(),
          about: plan.title,
          about_body: prompt.trim(),
          schedule: plan.sessions,
          starts_at: nextFriday(),
          approval_mode: approval,
        },
        session.user.id,
        isCoordinator,
      );
      setSubmitted(true);
      setSaved(isCoordinator ? 'Published' : 'Submitted for approval');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow brand">Manage activities / New event</p>
          <h1>Let’s make something happen.</h1>
          <p className="sub">Plan an event with a starter template.</p>
        </div>
      </div>

      <section className="card creator" aria-label="Activity creator">
        <nav className="rail" aria-label="Steps">
          <span className="eyebrow" style={{ padding: '0 12px 8px' }}>
            New activity
          </span>
          {steps.map((s, i) => (
            <button key={s} className="step" aria-current={i === 0 ? 'step' : undefined}>
              {String(i + 1).padStart(2, '0')}&nbsp;&nbsp;{s}
            </button>
          ))}
          <small style={{ padding: '0 12px' }}>{saved}</small>
        </nav>

        <div className="form">
          <h2>Start with the spark.</h2>
          <p className="muted">Describe the event; refine every suggestion before it goes anywhere.</p>

          <label htmlFor="name">Activity name</label>
          <input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={160} />

          <label htmlFor="prompt">Describe your event</label>
          <textarea id="prompt" className="field" rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <p className="muted" style={{ fontSize: 12 }}>
            Synchro will draft a starter plan for your review.
          </p>

          <div className="draft-meta" style={{ alignItems: 'flex-end' }}>
            <span>
              <label htmlFor="cat" style={{ display: 'block', marginTop: 0 }}>
                Category
              </label>
              <select id="cat" className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories
                  .filter((c) => c !== 'All')
                  .map((c) => (
                    <option key={c}>{c}</option>
                  ))}
              </select>
            </span>
            <span>
              <label htmlFor="cap" style={{ display: 'block', marginTop: 0 }}>
                Capacity
              </label>
              <input id="cap" type="number" min={1} className="field" style={{ width: 110 }} value={capacity} onChange={(e) => setCapacity(Math.max(1, Number(e.target.value) || 1))} />
            </span>
            <span>
              <label htmlFor="venue" style={{ display: 'block', marginTop: 0 }}>
                Venue
              </label>
              <input id="venue" className="field" style={{ width: 160 }} value={venue} onChange={(e) => setVenue(e.target.value)} />
            </span>
          </div>

          <label htmlFor="approval">Registration</label>
          <select id="approval" className="select" style={{ maxWidth: 320 }} value={approval} onChange={(e) => setApproval(e.target.value as 'auto' | 'manual')}>
            <option value="auto">Automatic confirmation</option>
            <option value="manual">I approve each registration</option>
          </select>

          <div style={{ marginTop: 8 }}>
            <button className="btn" onClick={generate} disabled={!prompt.trim() || !name.trim()}>
              Generate event plan ✦
            </button>
          </div>
          <p className="warn">{isCoordinator ? 'Coordinators publish directly' : 'Approval required before publish'}</p>
        </div>

        <aside className="plan" aria-label="Plan preview" aria-live="polite">
          <div className="plan-head">
            <span className="avatar" aria-hidden>
              ✦
            </span>
            Planner
            <span className="pill" style={{ marginLeft: 'auto' }}>
              Template
            </span>
          </div>
          {plan ? (
            <>
              <h3 style={{ fontSize: 15 }}>{plan.title}</h3>
              <p className="muted" style={{ fontSize: 12 }}>
                {submitted ? (isCoordinator ? 'Published' : 'Submitted · waiting for the principal') : 'Draft plan · review before submitting'}
              </p>
              {plan.sessions.map((s, i) => (
                <div className="session" key={`${s.time}-${i}`}>
                  <time>{s.time}</time>
                  {s.label}
                </div>
              ))}
              <h4 style={{ margin: '8px 0 0', fontSize: 13 }}>Preparation checklist</h4>
              <ul className="checklist">
                {plan.checklist.map((c) => (
                  <li key={c.label} className={c.done ? 'done' : ''}>
                    {c.done ? '✓' : '○'}&nbsp;&nbsp;{c.label}
                  </li>
                ))}
              </ul>
              <p className="muted" style={{ fontSize: 12 }}>
                Nothing is published automatically.
              </p>
              <button className="btn block" disabled={submitted || busy} onClick={submit}>
                {submitted ? (isCoordinator ? 'Published' : 'Awaiting approval') : busy ? 'Submitting…' : isCoordinator ? 'Publish event' : 'Submit for approval'}
              </button>
              {error && (
                <p role="alert" className="warn">
                  {error}
                </p>
              )}
              <p className="muted" style={{ fontSize: 11 }}>
                Suggestions stay editable until approved.
              </p>
            </>
          ) : (
            <p className="plan-empty">Describe your event and press “Generate event plan” to see a draft here.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
