import { useRef, useState } from 'react';
import { importUsers, type ImportResult, type ImportRow } from '../lib/importApi';

const MAX_ROWS = 500;
const BATCH = 25;
const ROLES = ['student', 'teacher', 'coordinator', 'principal'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALIASES: Record<keyof ImportRow, string[]> = {
  full_name: ['name', 'full name', 'fullname', 'full_name', 'student name', 'user name'],
  email: ['email', 'e-mail', 'email address', 'mail'],
  role: ['role', 'user role', 'type'],
  year: ['year', 'class', 'grade', 'batch', 'department'],
  password: ['password', 'temporary password', 'temp password'],
};

interface Parsed extends ImportRow {
  line: number;
  error?: string;
}

function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const first = src.split(/\r?\n/, 1)[0] ?? '';
  const delim = [',', ';', '\t'].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

async function readRows(file: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import('read-excel-file/browser');
    const data = await readSheet(file);
    return data.map((r) => r.map((c) => (c == null ? '' : String(c))));
  }
  if (/\.(csv|txt|tsv)$/i.test(file.name)) return parseCsv(await file.text());
  throw new Error('Use a .xlsx or .csv file. For an older .xls file, open it in Excel and save as .xlsx or .csv.');
}

function toRows(table: string[][]): Parsed[] {
  const clean = table.filter((r) => r.some((c) => c.trim() !== ''));
  if (clean.length < 2) throw new Error('The file needs a header row and at least one person.');
  const header = clean[0].map((h) => h.trim().toLowerCase());
  const col = {} as Record<keyof ImportRow, number>;
  (Object.keys(ALIASES) as (keyof ImportRow)[]).forEach((k) => {
    col[k] = header.findIndex((h) => ALIASES[k].includes(h));
  });
  if (col.email < 0) throw new Error('No email column found. Add a column headed "email".');
  if (col.full_name < 0) throw new Error('No name column found. Add a column headed "name".');
  const body = clean.slice(1);
  if (body.length > MAX_ROWS) throw new Error(`Import up to ${MAX_ROWS} people at a time (this file has ${body.length}).`);
  const seen = new Set<string>();
  return body.map((r, i) => {
    const get = (k: keyof ImportRow) => (col[k] >= 0 ? (r[col[k]] ?? '').trim() : '');
    const p: Parsed = {
      line: i + 2,
      full_name: get('full_name'),
      email: get('email').toLowerCase(),
      role: (get('role') || 'student').toLowerCase(),
      year: get('year'),
      password: get('password'),
    };
    if (!EMAIL.test(p.email)) p.error = 'Invalid email';
    else if (!p.full_name) p.error = 'Name is missing';
    else if (!ROLES.includes(p.role)) p.error = `Unknown role "${p.role}"`;
    else if (p.password && p.password.length < 8) p.error = 'Password under 8 characters';
    else if (seen.has(p.email)) p.error = 'Duplicate email in file';
    seen.add(p.email);
    return p;
  });
}

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const TEMPLATE = 'name,email,role,year,password\nAsha Rao,asha@example.edu,student,2nd year,\nMr. Iyer,iyer@example.edu,teacher,,\n';

export default function ImportUsers({ onDone }: { onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Parsed[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[] | null>(null);

  const valid = (rows ?? []).filter((r) => !r.error);
  const invalid = (rows ?? []).length - valid.length;

  const pick = async (file?: File) => {
    setError(null);
    setResults(null);
    setRows(null);
    if (!file) return;
    try {
      setFileName(file.name);
      setRows(toRows(await readRows(file)));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const reset = () => {
    setRows(null);
    setResults(null);
    setError(null);
    setFileName('');
    if (input.current) input.current.value = '';
  };

  const run = async () => {
    setBusy(true);
    setError(null);
    setProgress(0);
    const all: ImportResult[] = [];
    try {
      for (let i = 0; i < valid.length; i += BATCH) {
        const batch = valid.slice(i, i + BATCH).map(({ full_name, email, role, year, password }) => ({ full_name, email, role, year, password }));
        all.push(...(await importUsers(batch)));
        setProgress(Math.min(valid.length, i + BATCH));
      }
    } catch (e) {
      setError(`${(e as Error).message}. ${all.length} of ${valid.length} were processed before it stopped.`);
    } finally {
      setResults(all);
      setBusy(false);
      onDone();
    }
  };

  const created = (results ?? []).filter((r) => r.status === 'created' || r.status === 'partial');
  const credentials = created.filter((r) => r.password);

  return (
    <section className="card panel" style={{ display: 'grid', gap: 10, marginBottom: 16 }} aria-label="Import people">
      <h2 style={{ fontSize: 16 }}>Import people</h2>
      <p className="muted" style={{ fontSize: 13 }}>
        Upload an Excel (.xlsx) or CSV file with columns <strong>name</strong>, <strong>email</strong>, and optionally <strong>role</strong> (default student), <strong>year</strong> and <strong>password</strong>.
        Anyone without a password gets a generated one that you can download after the import. People who already have an account are skipped.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <label className="btn" htmlFor="import-file" style={{ cursor: 'pointer' }}>
          Choose file
        </label>
        <input id="import-file" ref={input} type="file" accept=".xlsx,.csv,.tsv,.txt" className="sr-only" disabled={busy} onChange={(e) => pick(e.target.files?.[0])} />
        <button type="button" className="btn ghost" onClick={() => download('synchro-people-template.csv', TEMPLATE)}>
          Download template
        </button>
        {fileName && <span className="muted" style={{ fontSize: 13 }}>{fileName}</span>}
      </div>

      {error && <p role="alert" className="warn">{error}</p>}

      {rows && !results && (
        <>
          <p style={{ fontSize: 14 }}>
            <strong>{valid.length}</strong> ready to import
            {invalid > 0 && <>, <span className="warn">{invalid} with problems (they will be skipped)</span></>}.
          </p>
          <div style={{ overflowX: 'auto', maxHeight: 260, overflowY: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  <th>Row</th><th>Name</th><th>Email</th><th>Role</th><th>Year</th><th>Check</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((r) => (
                  <tr key={r.line} style={{ borderTop: '1px solid var(--line)' }}>
                    <td>{r.line}</td><td>{r.full_name}</td><td>{r.email}</td><td>{r.role}</td><td>{r.year}</td>
                    <td className={r.error ? 'warn' : 'muted'}>{r.error ?? 'OK'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 100 && <p className="muted" style={{ fontSize: 12 }}>Showing the first 100 of {rows.length} rows.</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={run} disabled={busy || !valid.length}>
              {busy ? `Importing… ${progress} of ${valid.length}` : `Import ${valid.length} ${valid.length === 1 ? 'person' : 'people'}`}
            </button>
            <button className="btn ghost" onClick={reset} disabled={busy}>Cancel</button>
          </div>
        </>
      )}

      {results && (
        <>
          <p role="status" style={{ fontSize: 14 }}>
            <strong>{created.length}</strong> created, {results.filter((r) => r.status === 'exists').length} already had accounts, {results.filter((r) => r.status === 'failed').length} failed.
          </p>
          {results.filter((r) => r.status === 'failed' || r.status === 'partial').map((r) => (
            <p key={r.email} className="warn" style={{ fontSize: 13 }}>{r.email}: {r.reason}</p>
          ))}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {credentials.length > 0 && (
              <button className="btn" onClick={() => download('synchro-new-logins.csv', ['email,temporary password', ...credentials.map((r) => `${csvCell(r.email)},${csvCell(r.password ?? '')}`)].join('\n'))}>
                Download logins ({credentials.length})
              </button>
            )}
            <button className="btn ghost" onClick={reset}>Import another file</button>
          </div>
          {credentials.length > 0 && <p className="muted" style={{ fontSize: 12 }}>Passwords are shown only once. Share each login privately and ask people to keep it safe.</p>}
        </>
      )}
    </section>
  );
}
