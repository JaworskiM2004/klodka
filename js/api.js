// Wszystko, co rozmawia z Supabase.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { photoPath } from './logic.js';

const URL = 'https://trzqhiimdoqexfunqpan.supabase.co';
// Klucz publiczny (anon) — przeznaczony do użycia w przeglądarce, chroniony przez RLS.
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyenFoaWltZG9xZXhmdW5xcGFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNTM1ODgsImV4cCI6MjEwODYyOTU4OH0.oUPFrF_FHTfvV55K09FHvyPMFy_cwbajjM12pl9DG8U';
const BUCKET = 'aniolki-photos';

export const sb = createClient(URL, KEY, { auth: { persistSession: false } });

function check({ data, error }) {
  if (error) throw error;
  return data;
}

export async function getCurrent() {
  const row = check(await sb.from('aniolki_game').select('current').eq('id', 'main').single());
  return row.current;
}

export async function advance(expected) {
  return check(await sb.rpc('aniolki_advance', { expected }));
}

export async function setCurrent(target) {
  return check(await sb.rpc('aniolki_set', { target }));
}

export async function listPhotos() {
  return check(await sb.from('aniolki_photos').select('id, stop_id, path, created_at').order('created_at'));
}

export function publicUrl(path) {
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadPhoto(stopId, blob) {
  const path = photoPath(stopId);
  check(await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false }));
  const rows = check(await sb.from('aniolki_photos').insert({ stop_id: stopId, path }).select());
  return rows[0];
}

export function subscribe({ onGame, onPhoto }) {
  return sb
    .channel('aniolki')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'aniolki_game' }, (p) => onGame?.(p.new.current))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'aniolki_photos' }, (p) => onPhoto?.(p.new))
    .subscribe();
}
