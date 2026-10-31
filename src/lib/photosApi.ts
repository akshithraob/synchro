import { supabase } from './supabase';

const BUCKET = 'event-photos';

export type PhotoStatus = 'pending' | 'approved' | 'declined';

export interface EventPhoto {
  id: string;
  path: string;
  caption: string;
  status: PhotoStatus;
  created_by: string | null;
  url: string;
}

export interface PendingPhoto extends EventPhoto {
  activity_id: string;
  activities: { title: string; slug: string; parent: { title: string } | null } | null;
}

const publicUrl = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

export async function listPhotos(activityId: string): Promise<EventPhoto[]> {
  const { data, error } = await supabase.from('event_photos').select('id, path, caption, status, created_by').eq('activity_id', activityId).order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({ ...(p as Omit<EventPhoto, 'url'>), url: publicUrl(p.path) }));
}

export async function listPendingPhotos(): Promise<PendingPhoto[]> {
  const { data, error } = await supabase
    .from('event_photos')
    .select('id, path, caption, status, created_by, activity_id, activities (title, slug, parent:parent_id (title))')
    .eq('status', 'pending')
    .order('created_at');
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Omit<PendingPhoto, 'url'>[]).map((p) => ({ ...p, url: publicUrl(p.path) }));
}

/** Shrinks big camera photos so they upload fast and stay inside the free storage quota. */
async function shrink(file: File, maxSide = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot process images.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read that image.'))), 'image/jpeg', 0.85));
}

export async function uploadPhoto(activityId: string, file: File, caption = '') {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error(`${file.name}: use a JPG, PNG or WebP image.`);
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) throw new Error('Sign in to add photos.');
  const blob = await shrink(file);
  const path = `u/${uid}/${crypto.randomUUID()}.jpg`;
  const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
  if (up.error) throw new Error(up.error.message);
  const { error } = await supabase.from('event_photos').insert({ activity_id: activityId, path, caption });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(error.message);
  }
}

export async function decidePhoto(id: string, status: 'approved' | 'declined') {
  const { data, error } = await supabase.from('event_photos').update({ status }).eq('id', id).select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('Only the principal can approve or decline photos.');
}

export async function deletePhoto(p: Pick<EventPhoto, 'id' | 'path'>) {
  const { error } = await supabase.from('event_photos').delete().eq('id', p.id);
  if (error) throw new Error(error.message);
  await supabase.storage.from(BUCKET).remove([p.path]);
}
