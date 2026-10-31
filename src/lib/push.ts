import { supabase } from './supabase';

// Public VAPID key (safe to ship in the client); the private half stays in the database.
const PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ?? 'BB7Rp90MmIlSfo39a2YSgnKQqW4oMetsvhfFQjszKnTTnrW4AXBKWq4JK7ZZNCL2ZWj8_A4X6n2qCWhFa2YZA1w';

const toBytes = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export type PushState = 'unsupported' | 'denied' | 'off' | 'on';

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

export async function enablePush() {
  const reg = await navigator.serviceWorker.ready;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications were not allowed in your browser settings.');
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(PUBLIC_KEY) }));
  const j = sub.toJSON();
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { endpoint: sub.endpoint, p256dh: j.keys!.p256dh, auth: j.keys!.auth, user_agent: navigator.userAgent.slice(0, 200) },
      { onConflict: 'endpoint', ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}
