import { stops } from './stops.js';
import * as api from './api.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let photos = [];
let prepared = null; // File[] gotowe do udostępnienia

function toast(msg, ms = 3500) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms);
}

function fileName(p, i) {
  const idx = stops.findIndex((s) => s.id === p.stop_id);
  return `${String(idx + 1).padStart(2, '0')}-${p.stop_id}-${String(i + 1).padStart(2, '0')}.jpg`;
}

async function load() {
  photos = await api.listPhotos();
  $('summary').textContent = photos.length ? `${photos.length} zdjęć z ${new Set(photos.map((p) => p.stop_id)).size} przystanków` : 'Jeszcze nie ma żadnych zdjęć.';
  $('groups').innerHTML = stops.map((s) => {
    const list = photos.filter((p) => p.stop_id === s.id);
    if (!list.length) return '';
    return `<div class="group"><h2>${esc(s.title)}</h2><div class="muted">${list.length} zdj.</div>
      <div class="photos">${list.map((p) => `<a href="${esc(api.publicUrl(p.path))}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(api.publicUrl(p.path))}" alt=""></a>`).join('')}</div></div>`;
  }).join('');
  const cur = await api.getCurrent();
  $('jump').innerHTML = stops.map((s, i) => `<option value="${i}" ${i === cur ? 'selected' : ''}>${i + 1}. ${esc(s.title)}</option>`).join('')
    + `<option value="${stops.length}" ${cur >= stops.length ? 'selected' : ''}>✨ Ekran końcowy</option>`;
}

async function fetchAll() {
  const ordered = stops.flatMap((s) => photos.filter((p) => p.stop_id === s.id));
  const files = [];
  for (const [i, p] of ordered.entries()) {
    $('prep').textContent = `Przygotowuję ${i + 1} / ${ordered.length}…`;
    const blob = await (await fetch(api.publicUrl(p.path))).blob();
    const within = ordered.slice(0, i + 1).filter((q) => q.stop_id === p.stop_id).length - 1;
    files.push(new File([blob], fileName(p, within), { type: 'image/jpeg' }));
  }
  return files;
}

$('prep').addEventListener('click', async () => {
  if (!photos.length) return toast('Nie ma jeszcze zdjęć.');
  if (prepared) {
    try {
      if (navigator.canShare?.({ files: prepared })) await navigator.share({ files: prepared });
      else toast('Ten telefon nie umie zapisać wszystkich na raz — użyj ZIP albo przytrzymaj zdjęcie.');
    } catch { /* anulowane */ }
    return;
  }
  try {
    $('prep').disabled = true;
    prepared = await fetchAll();
    $('prep').textContent = `✅ Gotowe (${prepared.length}) — kliknij, żeby zapisać`;
  } catch (e) {
    console.warn(e);
    $('prep').textContent = '📲 Zapisz wszystkie w telefonie';
    toast('Nie udało się pobrać zdjęć — sprawdź internet.');
  } finally {
    $('prep').disabled = false;
  }
});

$('zip').addEventListener('click', async () => {
  if (!photos.length) return toast('Nie ma jeszcze zdjęć.');
  try {
    $('zip').disabled = true;
    $('zip').textContent = 'Pakuję…';
    const { default: JSZip } = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
    const files = prepared || await fetchAll();
    $('prep').textContent = '📲 Zapisz wszystkie w telefonie';
    const zip = new JSZip();
    files.forEach((f) => zip.file(f.name, f));
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'aniolki-zdjecia.zip';
    document.body.appendChild(a); a.click(); a.remove();
  } catch (e) {
    console.warn(e);
    toast('Nie udało się spakować zdjęć.');
  } finally {
    $('zip').disabled = false;
    $('zip').textContent = '🗂️ Pobierz jako ZIP';
  }
});

$('jumpBtn').addEventListener('click', async () => {
  try { await api.setCurrent(Number($('jump').value)); toast('Ustawione ✓'); } catch { toast('Nie udało się — brak internetu?'); }
});

$('reset').addEventListener('click', async () => {
  if (!confirm('Na pewno zacząć od pierwszego przystanku? Zdjęcia zostaną.')) return;
  try { await api.setCurrent(0); await load(); toast('Gra od początku ✓'); } catch { toast('Nie udało się.'); }
});

load().catch((e) => { console.warn(e); $('summary').textContent = 'Nie mogę się połączyć — sprawdź internet i odśwież.'; });
