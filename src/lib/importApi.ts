import { supabase } from './supabase';

export interface ImportRow {
  full_name: string;
  email: string;
  role: string;
  year: string;
  password: string;
}

export interface ImportResult {
  email: string;
  status: 'created' | 'exists' | 'failed' | 'partial';
  reason?: string;
  password?: string;
}

export async function importUsers(users: ImportRow[]): Promise<ImportResult[]> {
  const { data, error } = await supabase.functions.invoke('import-users', { body: { users } });
  if (error) {
    let msg = error.message;
    try {
      const body = await (error as unknown as { context: Response }).context.json();
      if (body?.error) msg = body.error;
    } catch {
      /* keep the default message */
    }
    throw new Error(msg);
  }
  return (data as { results: ImportResult[] }).results;
}
