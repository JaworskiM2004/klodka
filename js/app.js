import { stops } from './stops.js';
import { mapsUrl, clampIndex } from './logic.js';
import * as api from './api.js';
import { shrink } from './shrink.js';

const TOTAL = stops.length;
const app = document.getElementById('app');
const toastEl = document.getElementById('toast');

const state = {
  current: Number(safeGet('aniolki.current') ?? 0),
  photos: [],
  pending: {},              // stopId -> liczba wysyłanych zdjęć
  arrived: new Set(JSON.parse(safeGet('aniolki.arrived') || '[]')),
  introSeen: safeGet('aniolki.intro') === '1',
  busy: false,
  sheet: false,
};

function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* prywatny tryb */ } }

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg, ms = 3200) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { toastEl.hidden = true; }, ms);
}

const ANGEL_SVG = `
<svg class="angel-mark" viewBox="0 0 96 96" aria-hidden="true">
  <ellipse cx="48" cy="20" rx="17" ry="6" fill="none" stroke="#c3b4f0" stroke-width="4"/>
  <path d="M44 52 C30 36 12 38 8 50 C18 50 22 60 34 62 C26 64 24 70 26 74 C34 70 40 64 44 60Z" fill="#a593e3"/>
  <path d="M52 52 C66 36 84 38 88 50 C78 50 74 60 62 62 C70 64 72 70 70 74 C62 70 56 64 52 60Z" fill="#a593e3"/>
  <circle cx="48" cy="40" r="10" fill="#f2eff8"/>
  <path d="M36 86 C38 66 42 54 48 54 C54 54 58 66 60 86Z" fill="#f2eff8"/>
</svg>`;

// ---------- dane ----------

function setCurrent(c) {
  const v = clampIndex(c, TOTAL);
  if (v !== state.current) {
    state.current = v;
    // "Jesteśmy!" dotyczy tylko bieżącego przystanku — po zmianie zaczynamy od czystej karty.
    state.arrived.clear();
    safeSet('aniolki.arrived', '[]');
  }
  safeSet('aniolki.current', String(v));
}

async function refresh() {
  try {
    const [c, photos] = await Promise.all([api.getCurrent(), api.listPhotos()]);
    const changed = c !== state.current || photos.length !== state.photos.length || !state.loaded;
    state.loaded = true;
    setCurrent(c);
    state.photos = photos;
    if (changed) render();
  } catch (e) {
    console.warn(e);
  }
}

function photosFor(stopId) {
  return state.photos.filter((p) => p.stop_id === stopId);
}

function isArrived(stop) {
  return state.arrived.has(stop.id) || photosFor(stop.id).length > 0;
}

function markArrived(stop) {
  state.arrived.add(stop.id);
  safeSet('aniolki.arrived', JSON.stringify([...state.arrived]));
}

// ---------- akcje ----------

async function goNext() {
  if (state.busy) return;
  state.busy = true;
  render();
  try {
    const c = await api.advance(state.current);
    setCurrent(c);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    console.warn(e);
    toast('Coś z internetem 🙈 Spróbuj jeszcze raz.');
  } finally {
    state.busy = false;
    render();
  }
}

async function jumpTo(i) {
  state.sheet = false;
  try {
    setCurrent(await api.setCurrent(i));
    window.scrollTo({ top: 0 });
  } catch (e) {
    console.warn(e);
    toast('Nie udało się przełączyć — brak internetu?');
  }
  render();
}

async function addPhotos(stop, files) {
  const list = [...files];
  if (!list.length) return;
  state.pending[stop.id] = (state.pending[stop.id] || 0) + list.length;
  render();
  let failed = 0;
  for (const file of list) {
    try {
      const blob = await shrink(file);
      const row = await api.uploadPhoto(stop.id, blob);
      if (!state.photos.some((p) => p.id === row.id)) state.photos.push(row);
    } catch (e) {
      console.warn(e);
      failed++;
    } finally {
      state.pending[stop.id]--;
      render();
    }
  }
  if (failed) toast(`Nie wysłało się ${failed} ${failed === 1 ? 'zdjęcie' : 'zdjęć'} — spróbuj dodać jeszcze raz.`, 4500);
}

// ---------- widoki ----------

function viewIntro() {
  return `
  <section class="hero fade-in">
    ${ANGEL_SVG}
    <h1>Śladem toruńskich aniołków</h1>
    <p>Mały wieczorny szlak: kilkanaście aniołków, grzaniec i gorąca czekolada.</p>
    <p>Przy każdym przystanku jest wspólna fota — albo i nie, jak kto woli. Klikać można z dowolnego telefonu, oba widzą to samo.</p>
    <div class="chips">
      <span class="chip">😇 15 aniołków</span>
      <span class="chip">🍷 jarmark</span>
      <span class="chip">☕ Wedel</span>
    </div>
    <div class="actions">
      <button class="btn btn-primary" data-act="start">Zaczynamy ✨</button>
    </div>
  </section>`;
}

function topBar() {
  const pct = Math.round((state.current / TOTAL) * 100);
  return `
  <div class="top">
    <div class="brand">Śladem toruńskich aniołków</div>
    <button class="icon-btn" data-act="sheet">${Math.min(state.current + 1, TOTAL)} / ${TOTAL} ☰</button>
  </div>
  <div class="progress"><i style="width:${pct}%"></i></div>`;
}

function photoGrid(stop) {
  const imgs = photosFor(stop.id)
    .map((p) => `<a href="${esc(api.publicUrl(p.path))}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(api.publicUrl(p.path))}" alt="Zdjęcie"></a>`)
    .join('');
  const pend = Array.from({ length: state.pending[stop.id] || 0 }, () => '<div class="ph"><div class="spin"></div></div>').join('');
  const n = photosFor(stop.id).length;
  return `
  <div class="photos">
    ${imgs}${pend}
    <label>
      <input type="file" accept="image/*" multiple data-upload="${esc(stop.id)}">
      <div><span>📷</span>${n ? 'Jeszcze jedno' : 'Dodaj zdjęcie'}</div>
    </label>
  </div>`;
}

function viewStop() {
  const stop = stops[state.current];
  const next = stops[state.current + 1];
  const arrived = isArrived(stop);
  const isLast = state.current === TOTAL - 1;
  const kicker = stop.kind === 'angel' ? `Przystanek ${state.current + 1} · aniołek` : `Przystanek ${state.current + 1}`;

  const head = `
    <div class="kicker">${kicker}</div>
    <h1 class="title">${esc(stop.title)}</h1>
    <div class="where"><span>📍</span><span>${esc(stop.where)}</span></div>`;

  if (!arrived) {
    return `${topBar()}
    <section class="card fade-in">
      ${head}
      <div class="actions">
        <a class="btn btn-ghost" href="${esc(mapsUrl(stop))}" target="_blank" rel="noopener">🧭 Prowadź (Google Maps)</a>
        <button class="btn btn-primary" data-act="arrive">Jesteśmy! ✨</button>
      </div>
      <button class="link" data-act="next" ${state.busy ? 'disabled' : ''}>pomiń ten przystanek</button>
    </section>`;
  }

  const n = photosFor(stop.id).length;
  const uploading = (state.pending[stop.id] || 0) > 0;
  const nextLabel = isLast ? 'Kończymy ✨' : n ? 'Dalej →' : 'Dalej bez zdjęcia →';
  return `${topBar()}
  <section class="card fade-in">
    ${head}
    <div class="task"><span class="kicker">Zadanie</span>${esc(stop.task)}</div>
    ${photoGrid(stop)}
    <ul class="facts">${stop.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    <div class="actions">
      <button class="btn btn-primary" data-act="next" ${state.busy || uploading ? 'disabled' : ''}>${uploading ? 'Wysyłam zdjęcia…' : nextLabel}</button>
    </div>
    ${next ? `<div class="next">Następny: <b>${esc(next.title)}</b></div>` : ''}
  </section>`;
}

function viewEnd() {
  const all = state.photos;
  return `
  <section class="hero fade-in">
    ${ANGEL_SVG}
    <h1>Szlak zaliczony ✨</h1>
    <p>${TOTAL} przystanków${all.length ? ` i ${all.length} ${all.length === 1 ? 'zdjęcie' : all.length < 5 ? 'zdjęcia' : 'zdjęć'}` : ''}. Dzięki za ten spacer.</p>
  </section>
  ${all.length ? `<div class="photos">${all.map((p) => `<a href="${esc(api.publicUrl(p.path))}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(api.publicUrl(p.path))}" alt="Zdjęcie"></a>`).join('')}</div>` : ''}
  <button class="link" data-act="sheet">lista przystanków</button>`;
}

function viewSheet() {
  const items = stops.map((s, i) => {
    const cls = i < state.current ? 'done' : i === state.current ? 'now' : '';
    const dot = i < state.current ? '✓' : i + 1;
    const n = photosFor(s.id).length;
    return `<li class="${cls}"><button data-jump="${i}">
      <span class="dot">${dot}</span>
      <span>${esc(s.title)}<small>${esc(s.where)}${n ? ` · 📷 ${n}` : ''}</small></span>
    </button></li>`;
  }).join('');
  return `
  <div class="sheet-bg" data-act="close">
    <div class="sheet" role="dialog" aria-label="Lista przystanków">
      <h2>Przystanki</h2>
      <ol>${items}</ol>
      <button class="link" data-act="close">zamknij</button>
    </div>
  </div>`;
}

// Gdy otwarty jest wybór zdjęć, nie podmieniamy HTML (zgubilibyśmy wybrane pliki).
let picking = 0;
function render() {
  if (picking && Date.now() - picking < 120000) { render.queued = true; return; }
  picking = 0;
  let html;
  if (state.current >= TOTAL) html = viewEnd();
  else if (!state.introSeen && state.current === 0 && state.photos.length === 0) html = viewIntro();
  else html = viewStop();
  if (state.sheet) html += viewSheet();
  app.innerHTML = html;
}

// ---------- zdarzenia ----------

app.addEventListener('click', (e) => {
  if (e.target.closest('input[type=file]')) { picking = Date.now(); return; }
  const jump = e.target.closest('[data-jump]');
  if (jump) return jumpTo(Number(jump.dataset.jump));
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  if (act === 'close' && el.classList.contains('sheet-bg') && e.target !== el) return;
  if (act === 'start') { state.introSeen = true; safeSet('aniolki.intro', '1'); render(); }
  if (act === 'arrive') { markArrived(stops[state.current]); render(); }
  if (act === 'next') goNext();
  if (act === 'sheet') { state.sheet = true; render(); }
  if (act === 'close') { state.sheet = false; render(); }
});

app.addEventListener('change', (e) => {
  const input = e.target.closest('[data-upload]');
  if (!input) return;
  picking = 0;
  const stop = stops.find((s) => s.id === input.dataset.upload);
  if (stop) addPhotos(stop, input.files);
  else render();
});

app.addEventListener('cancel', (e) => {
  if (e.target.matches?.('input[type=file]')) { picking = 0; if (render.queued) { render.queued = false; render(); } }
}, true);

api.subscribe({
  onGame: (c) => { setCurrent(c); render(); },
  onPhoto: (row) => {
    if (!state.photos.some((p) => p.id === row.id)) { state.photos.push(row); render(); }
  },
});

document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
// Anulowany wybór zdjęć: wracamy do normalnego odświeżania.
window.addEventListener('focus', () => setTimeout(() => {
  if (picking && Date.now() - picking > 1500) { picking = 0; if (render.queued) { render.queued = false; render(); } }
}, 800));
setInterval(() => { if (!document.hidden) refresh(); }, 10000);

render();
refresh();
