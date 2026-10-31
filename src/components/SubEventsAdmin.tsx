import { useState, type ReactNode } from 'react';
import { addSubEvent, fmtWhen, removeSubEvent, SUB_LABEL, SUB_LABEL_PLURAL, updateSubEvent, type Activity, type SubEventInput } from '../api';

const toLocalInput = (iso: string) => iso.slice(0, 16);
const fromLocalInput = (v: string) => (v ? `${v}:00.000Z` : null);

function SubEventForm({ initial, parent, onSave, onCancel }: { initial?: Activity; parent: Activity; onSave: (v: SubEventInput) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [capacity, setCapacity] = useState(initial?.capacity ?? 30);
  const [when, setWhen] = useState(toLocalInput(initial?.starts_at ?? parent.starts_at));
  const [venue, setVenue] = useState(initial?.location ?? parent.location);
  const [approval, setApproval] = useState<'auto' | 'manual'>(initial?.approval_mode ?? 'auto');
  const [about, setAbout] = useState(initial?.about_body ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = initial?.id ?? 'new-' + parent.id;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave({ title: title.trim(), capacity, starts_at: fromLocalInput(when), location: venue.trim(), about: about.trim(), approval_mode: approval });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 8, padding: '12px 0', borderTop: '1px solid var(--line)' }}>
      <label htmlFor={`st-${id}`}>{SUB_LABEL} name</label>
      <input id={`st-${id}`} className="field" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} placeholder="For example: 100m sprint" />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <span>
          <label htmlFor={`sc-${id}`} style={{ display: 'block' }}>Seats</label>
          <input id={`sc-${id}`} type="number" min={1} className="field" style={{ width: 110 }} value={capacity} onChange={(e) => setCapacity(Math.max(1, Number(e.target.value) || 1))} />
        </span>
        <span>
          <label htmlFor={`sw-${id}`} style={{ display: 'block' }}>When</label>
          <input id={`sw-${id}`} type="datetime-local" className="field" value={when} onChange={(e) => setWhen(e.target.value)} />
        </span>
        <span style={{ flex: '1 1 160px' }}>
          <label htmlFor={`sv-${id}`} style={{ display: 'block' }}>Venue</label>
          <input id={`sv-${id}`} className="field" style={{ width: '100%' }} value={venue} onChange={(e) => setVenue(e.target.value)} />
        </span>
      </div>
      <label htmlFor={`sm-${id}`}>Registration</label>
      <select id={`sm-${id}`} className="select" style={{ maxWidth: 320 }} value={approval} onChange={(e) => setApproval(e.target.value as 'auto' | 'manual')}>
        <option value="auto">Automatic confirmation</option>
        <option value="manual">Organizer approves each registration</option>
      </select>
      <label htmlFor={`sa-${id}`}>Details (optional)</label>
      <textarea id={`sa-${id}`} className="field" rows={2} value={about} onChange={(e) => setAbout(e.target.value)} />
      {error && <p role="alert" className="warn">{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" disabled={busy || title.trim().length < 2} onClick={submit}>{busy ? 'Saving…' : initial ? 'Save' : `Add ${SUB_LABEL.toLowerCase()}`}</button>
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function SubEventsAdmin({
  parent,
  subs,
  onChanged,
  renderRegistrants,
}: {
  parent: Activity;
  subs: Activity[];
  onChanged: () => void;
  renderRegistrants: (id: string) => ReactNode;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [showing, setShowing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = async (s: Activity) => {
    if (!window.confirm(`Remove “${s.title}”?`)) return;
    setError(null);
    try {
      await removeSubEvent(s.id);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 14 }}>{SUB_LABEL_PLURAL} ({subs.length})</h3>
        {!adding && parent.status !== 'declined' && (
          <button className="btn ghost" onClick={() => setAdding(true)}>Add {SUB_LABEL.toLowerCase()}</button>
        )}
      </div>
      {error && <p role="alert" className="warn">{error}</p>}
      {subs.length === 0 && !adding && (
        <p className="muted" style={{ fontSize: 13 }}>
          None yet. Add {SUB_LABEL_PLURAL.toLowerCase()} such as the separate sports in a sports day, so students can register for each one.
        </p>
      )}

      {subs.map((s) =>
        editing === s.id ? (
          <SubEventForm
            key={s.id}
            initial={s}
            parent={parent}
            onCancel={() => setEditing(null)}
            onSave={async (v) => {
              await updateSubEvent(s.id, v);
              setEditing(null);
              onChanged();
            }}
          />
        ) : (
          <div key={s.id} style={{ borderTop: '1px solid var(--line)', padding: '10px 0' }}>
            <div className="subrow" style={{ border: 0, padding: 0 }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 14 }}>{s.title}</strong>
                <small className="muted" style={{ display: 'block' }}>
                  {fmtWhen(s.starts_at)}{s.location ? ` · ${s.location}` : ''} · {s.registered_count}/{s.capacity} seats held · {s.checked_in_count} checked in · {s.approval_mode === 'manual' ? 'manual approval' : 'auto-confirm'}
                </small>
              </div>
              <div className="subact">
                {s.status === 'approved' && (
                  <button className="btn ghost" onClick={() => setShowing(showing === s.id ? null : s.id)}>{showing === s.id ? 'Hide registrants' : 'Registrants'}</button>
                )}
                <button className="btn ghost" onClick={() => setEditing(s.id)}>Edit</button>
                <button className="btn ghost" onClick={() => remove(s)}>Remove</button>
              </div>
            </div>
            {showing === s.id && <div style={{ marginTop: 10 }}>{renderRegistrants(s.id)}</div>}
          </div>
        ),
      )}

      {adding && (
        <SubEventForm
          parent={parent}
          onCancel={() => setAdding(false)}
          onSave={async (v) => {
            await addSubEvent(parent.id, v);
            setAdding(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
