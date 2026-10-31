import { supabase } from './lib/supabase';

export type Role = 'student' | 'teacher' | 'coordinator' | 'principal';
export type Status = 'draft' | 'pending' | 'approved' | 'declined';

export interface Activity {
  id: string;
  slug: string;
  title: string;
  category: string;
  starts_at: string;
  location: string;
  location_note: string;
  cover: string;
  capacity: number;
  registered_count: number;
  checked_in_count: number;
  tagline: string;
  organizer: string;
  about: string;
  about_body: string;
  requirements: string;
  schedule: { time: string; label: string }[];
  featured: boolean;
  status: Status;
  approval_mode: 'auto' | 'manual';
  parent_id: string | null;
  parent: { title: string; slug: string } | null;
}

/** Competitions sit inside an event, for example the sports inside Annual Sports Day. */
export const SUB_LABEL = 'Competition';
export const SUB_LABEL_PLURAL = 'Competitions';

export const fullTitle = (a: Pick<Activity, 'title' | 'parent'>) => (a.parent ? `${a.parent.title}: ${a.title}` : a.title);

export type RegStatus = 'pending' | 'approved' | 'rejected' | 'waitlisted';

export const REG_LABEL: Record<RegStatus, string> = {
  pending: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
};

export interface Registration {
  id: string;
  status: RegStatus;
  activity_id: string;
  pass_code: string;
  checked_in_at: string | null;
  activities: Activity;
}

export interface Announcement {
  id: string;
  tag: string;
  title: string;
  body: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  year: string | null;
}

const ACTIVITY_COLS =
  'id, slug, title, category, starts_at, location, location_note, cover, capacity, registered_count, checked_in_count, tagline, organizer, about, about_body, requirements, schedule, featured, status, approval_mode, parent_id, parent:parent_id (title, slug)';

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const spotsLeft = (a: Pick<Activity, 'capacity' | 'registered_count'>) => a.capacity - a.registered_count;

export async function getProfile(userId: string): Promise<Profile> {
  return unwrap(await supabase.from('profiles').select('id, full_name, role, year').eq('id', userId).single());
}

export async function listActivities(): Promise<Activity[]> {
  return unwrap(await supabase.from('activities').select(ACTIVITY_COLS).eq('status', 'approved').is('parent_id', null).order('starts_at')) as unknown as Activity[];
}

export async function listCheckInEvents(): Promise<Activity[]> {
  return unwrap(await supabase.from('activities').select(ACTIVITY_COLS).eq('status', 'approved').order('starts_at').order('title')) as unknown as Activity[];
}

export async function listSubEvents(parentId: string): Promise<Activity[]> {
  return unwrap(await supabase.from('activities').select(ACTIVITY_COLS).eq('parent_id', parentId).order('starts_at').order('title')) as unknown as Activity[];
}

export async function subEventCounts(): Promise<Record<string, number>> {
  const rows = unwrap(await supabase.from('activities').select('parent_id').eq('status', 'approved').not('parent_id', 'is', null)) as { parent_id: string }[];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.parent_id] = (out[r.parent_id] ?? 0) + 1;
  return out;
}

export interface SubEventInput {
  title: string;
  capacity: number;
  starts_at: string | null;
  location: string;
  about: string;
  approval_mode: 'auto' | 'manual';
}

export async function addSubEvent(parentId: string, s: SubEventInput): Promise<string> {
  const { data, error } = await supabase.rpc('add_sub_event', {
    p_parent: parentId, p_title: s.title, p_capacity: s.capacity, p_starts_at: s.starts_at, p_location: s.location, p_about: s.about, p_approval: s.approval_mode,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function updateSubEvent(id: string, s: SubEventInput) {
  const { error } = await supabase.rpc('update_sub_event', {
    p_id: id, p_title: s.title, p_capacity: s.capacity, p_starts_at: s.starts_at, p_location: s.location, p_about: s.about, p_approval: s.approval_mode,
  });
  if (error) throw new Error(error.message);
}

export async function removeSubEvent(id: string) {
  const { error } = await supabase.rpc('remove_sub_event', { p_id: id });
  if (error) throw new Error(error.message);
}

export async function getActivity(slug: string): Promise<Activity | null> {
  return unwrap(await supabase.from('activities').select(ACTIVITY_COLS).eq('slug', slug).maybeSingle()) as unknown as Activity | null;
}

export async function listMyRegistrations(): Promise<Registration[]> {
  const rows = unwrap(
    await supabase
      .from('registrations')
      .select(`id, status, activity_id, pass_code, checked_in_at, activities (${ACTIVITY_COLS})`)
      .order('created_at', { ascending: false }),
  );
  return rows as unknown as Registration[];
}

export async function register(activityId: string, userId: string) {
  const { error } = await supabase.from('registrations').insert({ activity_id: activityId, user_id: userId });
  if (error) {
    if (error.code === '23505') return; // already registered: treat as success
    throw new Error(error.message);
  }
}

export async function cancelRegistration(id: string) {
  const { error } = await supabase.from('registrations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listAnnouncements(): Promise<Announcement[]> {
  return unwrap(await supabase.from('announcements').select('id, tag, title, body').order('created_at', { ascending: false }));
}

export interface MyEvent extends Activity {
  decline_reason: string | null;
}

export async function listMyEvents(userId: string): Promise<MyEvent[]> {
  return unwrap(
    await supabase
      .from('activities')
      .select(`${ACTIVITY_COLS}, decline_reason`)
      .eq('created_by', userId)
      .order('created_at', { ascending: false }),
  ) as unknown as MyEvent[];
}

export async function updateEvent(
  id: string,
  patch: { title: string; category: string; capacity: number; location: string; about_body: string; approval_mode: 'auto' | 'manual' },
) {
  const { data, error } = await supabase.from('activities').update(patch).eq('id', id).select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('This event can no longer be edited.');
}

export async function withdrawEvent(id: string) {
  const { data, error } = await supabase.from('activities').delete().eq('id', id).select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('Only unapproved events can be withdrawn.');
}

export interface Registrant {
  id: string;
  full_name: string;
  pass_code: string;
  status: RegStatus;
  checked_in_at: string | null;
  created_at: string;
}

export async function listRegistrants(activityId: string): Promise<Registrant[]> {
  return unwrap(await supabase.rpc('event_registrations', { p_activity: activityId })) as Registrant[];
}

export interface PendingRegistration {
  id: string;
  activity_id: string;
  activity_title: string;
  full_name: string;
  created_at: string;
}

export async function listPendingRegistrations(): Promise<PendingRegistration[]> {
  return unwrap(await supabase.rpc('pending_registrations')) as PendingRegistration[];
}

export async function decideRegistration(id: string, status: 'approved' | 'rejected') {
  const { error } = await supabase.rpc('decide_registration', { p_id: id, p_status: status });
  if (error) throw new Error(error.message);
}

export interface Analytics {
  weekly: { week: string; n: number }[];
  categories: { name: string; n: number }[];
  events: { title: string; category: string; capacity: number; registered: number; checked_in: number }[];
}

export async function getAnalytics(): Promise<Analytics> {
  return unwrap(await supabase.rpc('analytics_summary')) as Analytics;
}

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export async function listNotifications(): Promise<AppNotification[]> {
  return unwrap(
    await supabase.from('notifications').select('id, kind, title, body, link, read_at, created_at').order('created_at', { ascending: false }).limit(100),
  );
}

export async function countUnread(): Promise<number> {
  const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markNotificationsRead(ids?: string[]) {
  let q = supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  if (ids) q = q.in('id', ids);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

export interface AppUser {
  id: string;
  full_name: string;
  email: string;
  role: Role;
}

export async function listUsers(): Promise<AppUser[]> {
  return unwrap(await supabase.rpc('list_users')) as AppUser[];
}

export async function setUserRole(userId: string, role: Role) {
  const { error } = await supabase.rpc('set_user_role', { p_user: userId, p_role: role });
  if (error) throw new Error(error.message);
}

export async function getInstituteName(): Promise<string> {
  const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'institute_name').maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value ?? '';
}

export async function setInstituteName(name: string) {
  const { error } = await supabase.rpc('set_institute_name', { p_name: name });
  if (error) throw new Error(error.message);
}

export async function postAnnouncement(a: { tag: string; title: string; body: string }) {
  const { error } = await supabase.from('announcements').insert(a);
  if (error) throw new Error(error.message);
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listPending(): Promise<Activity[]> {
  return unwrap(await supabase.from('activities').select(ACTIVITY_COLS).eq('status', 'pending').order('created_at')) as unknown as Activity[];
}

export async function decide(id: string, status: 'approved' | 'declined', reason?: string) {
  const { error } = await supabase
    .from('activities')
    .update({ status, decline_reason: status === 'declined' ? reason || null : null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export interface NewActivity {
  title: string;
  category: string;
  capacity: number;
  location: string;
  about: string;
  about_body: string;
  schedule: { time: string; label: string }[];
  starts_at: string;
  approval_mode: 'auto' | 'manual';
}

export async function submitActivity(a: NewActivity, userId: string, publish = false): Promise<string> {
  const slug = `${a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await supabase.from('activities').insert({ ...a, slug, status: publish ? 'approved' : 'pending', created_by: userId }).select('id').single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export interface CheckInResult {
  ok: boolean;
  reason?: 'not_found' | 'wrong_event' | 'already' | 'not_approved';
  name?: string;
}

export async function checkIn(code: string, activityId: string): Promise<CheckInResult> {
  return unwrap(await supabase.rpc('check_in', { p_code: code, p_activity: activityId })) as CheckInResult;
}

// Campus-local wall-clock time is stored as UTC and rendered as UTC so it never shifts with the viewer's timezone.
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...o });
export const fmtDay = (iso: string) => fmt({ weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso));
export const fmtTime = (iso: string) => fmt({ hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
export const fmtWhen = (iso: string) => `${fmtDay(iso)} · ${fmtTime(iso)}`;
