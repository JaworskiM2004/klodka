import { stops, ANGEL_COUNT } from './stops.js';
import { mapsUrl, clampIndex, nextIndex, screenFor, displayTitle, timeUnlocked } from './logic.js';
import * as api from './api.js';
import { shrink } from './shrink.js';
import { viewTutorial, wireTutorial, tutorialGo, isStandalone, PADLOCK } from './tutorial.js';

const TOTAL = stops.length;
const app = document.getElementById('app');
const toastEl = document.getElementById('toast');

function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* tryb prywatny */ } }

const state = {
  loaded: false,
  unlocked: safeGet('aniolki.unlocked') === '1',
  current: clampIndex(Number(safeGet('aniolki.current') ?? 0), TOTAL),
  photos: [],
  pending: {},
  arrived: new Set(JSON.parse(safeGet('aniolki.arrived') || '[]')),
  introSeen: safeGet('aniolki.intro') === '1',
  tutorialDone: safeGet('aniolki.tutorial') === '1',
  standalone: isStandalone(),
  busy: false,
  sheet: false,
  unlocking: false,
};

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

// ---------- stan ----------

function setCurrent(c) {
  const v = clampIndex(c, TOTAL);
  if (v === state.current) return false;
  state.current = v;
  state.facts = false;
  state.arrived.clear(); // "Jesteśmy!" dotyczy tylko bieżącego przystanku
  safeSet('aniolki.arrived', '[]');
  safeSet('aniolki.current', String(v));
  return true;
}

function setUnlocked(u) {
  if (u === state.unlocked) return false;
  state.unlocked = u;
  safeSet('aniolki.unlocked', u ? '1' : '0');
  return true;
}

function applyGame(g) {
  const open = !!g.unlocked || timeUnlocked();
  if (!state.unlocked && open && screen() === 'lock') return unlockAnimation(g);
  const a = setUnlocked(open);
  const b = setCurrent(g.current);
  return a || b;
}

async function refresh() {
  try {
    const [g, photos] = await Promise.all([api.getGame(), api.listPhotos()]);
    const first = !state.loaded;
    state.loaded = true;
    const photosChanged = photos.length !== state.photos.length;
    state.photos = photos;
    const changed = applyGame(g);
    if (first || changed || photosChanged) render();
  } catch (e) {
    console.warn(e);
    if (!state.loaded) { state.loaded = true; render(); toast('Słaby internet — próbuję dalej…'); }
  }
}

const photosFor = (id) => state.photos.filter((p) => p.stop_id === id);
const isArrived = (stop) => state.arrived.has(stop.id) || photosFor(stop.id).length > 0;

function markArrived(stop) {
  state.arrived.add(stop.id);
  safeSet('aniolki.arrived', JSON.stringify([...state.arrived]));
}

function screen() {
  return screenFor({ ...state, total: TOTAL });
}

// ---------- akcje ----------

async function goNext() {
  if (state.busy) return;
  const from = state.current;
  state.busy = true;
  setCurrent(nextIndex(from, TOTAL)); // od razu, bez czekania na serwer
  window.scrollTo(0, 0);
  render();
  try {
    const c = await api.advance(from);
    if (setCurrent(c)) render();
  } catch (e) {
    console.warn(e);
    setCurrent(from);
    render();
    toast('Coś z internetem 🙈 Spróbuj jeszcze raz.');
  } finally {
    state.busy = false;
  }
}

async function jumpTo(i) {
  state.sheet = false;
  const from = state.current;
  setCurrent(i);
  window.scrollTo(0, 0);
  render();
  try {
    if (setCurrent(await api.setCurrent(i))) render();
  } catch (e) {
    console.warn(e);
    setCurrent(from);
    render();
    toast('Nie udało się przełączyć — brak internetu?');
  }
}

async function addPhotos(stop, files) {
  const list = [...files];
  if (!list.length) return;
  state.pending[stop.id] = (state.pending[stop.id] || 0) + list.length;
  render();
  let failed = 0;
  for (const file of list) {
    try {
      const row = await api.uploadPhoto(stop.id, await shrink(file));
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

function shakeLock() {
  const lock = app.querySelector('.padlock');
  if (!lock) return;
  lock.classList.remove('shake');
  void lock.getBoundingClientRect();
  lock.classList.add('shake');
}

function unlockAnimation(g) {
  if (state.unlocking) return false;
  state.unlocking = true;
  app.querySelector('.padlock')?.classList.add('open');
  // Kłódka się otwiera, a potem zamienia w aniołka.
  setTimeout(() => {
    const btn = app.querySelector('.lock-btn');
    if (btn) { btn.innerHTML = ANGEL_SVG; btn.firstElementChild.classList.add('morph', 'big-angel'); }
    const t = app.querySelector('.lock-time');
    if (t) { t.textContent = 'Śladem toruńskich aniołków'; t.classList.add('morph'); }
  }, 1000);
  setTimeout(() => {
    state.unlocking = false;
    setUnlocked(true);
    setCurrent(g.current);
    render();
  }, 2800);
  return false;
}

// ---------- widoki ----------

function viewLock() {
  return `
  <section class="lock-screen">
    <button class="lock-btn" data-act="lock" aria-label="Kłódka">${PADLOCK()}</button>
    <h1 class="lock-time">19:00</h1>
  </section>`;
}

function viewIntro() {
  return `
  <section class="hero">
    ${ANGEL_SVG}
    <h1>Śladem toruńskich aniołków</h1>
    <div class="actions">
      <button class="btn btn-primary" data-act="start">Zaczynamy</button>
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

const thumb = (p, extra = '') => {
  const u = esc(api.publicUrl(p.path));
  return `<a class="thumb" href="${u}" target="_blank" rel="noopener"><img loading="lazy" src="${u}" alt="Zdjęcie">${extra}</a>`;
};

// Jeden rząd miniaturek — bez przewijania. Nadmiar jako "+N".
function photoStrip(stop) {
  const list = photosFor(stop.id);
  const pend = state.pending[stop.id] || 0;
  if (!list.length && !pend) {
    return `<label class="strip-empty"><input type="file" accept="image/*" multiple data-upload="${esc(stop.id)}">📷 Dodaj wspólne zdjęcie</label>`;
  }
  const MAX = 4;
  const spinners = Array.from({ length: Math.min(pend, MAX) }, () => '<div class="thumb ph"><div class="spin"></div></div>');
  const shown = list.slice(-(MAX - spinners.length));
  const hidden = list.length - shown.length;
  const tiles = shown.map((p, i) => thumb(p, i === 0 && hidden ? `<span class="more">+${hidden}</span>` : ''));
  return `<div class="strip">${[...tiles, ...spinners].join('')}</div>`;
}

function nextTeaser() {
  const next = stops[state.current + 1];
  if (!next) return '';
  return `<div class="next">Następny: <b>${esc(displayTitle(next, false))}${next.secret ? ' ✨' : ''}</b></div>`;
}

function viewStop() {
  const stop = stops[state.current];
  const arrived = isArrived(stop);
  const isLast = state.current === TOTAL - 1;
  const kicker = stop.kind === 'angel' ? `Przystanek ${state.current + 1} · aniołek` : `Przystanek ${state.current + 1}`;
  const head = `
    <div class="kicker">${kicker}</div>
    <h1 class="title">${esc(displayTitle(stop, arrived))}</h1>`;

  if (!arrived) {
    const mark = stop.secret ? '<div class="stop-spark">✨</div>' : ANGEL_SVG;
    return `${topBar()}
    <section class="stop-pre">
      <div class="stop-hero">
        ${mark}
        ${head}
      </div>
      <div class="stop-actions">
        <a class="btn btn-ghost" href="${esc(mapsUrl(stop))}" target="_blank" rel="noopener">🧭 Prowadź</a>
        <button class="btn btn-primary" data-act="arrive">Jesteśmy! ✨</button>
        <button class="link" data-act="next">pomiń ten przystanek</button>
      </div>
    </section>`;
  }

  const n = photosFor(stop.id).length;
  const uploading = (state.pending[stop.id] || 0) > 0;
  const label = uploading ? 'Wysyłam…' : isLast ? 'Kończymy ✨' : n ? 'Dalej →' : 'Dalej bez zdjęcia →';
  return `${topBar()}
  <section class="stop-on">
    ${head}
    <div class="where"><span>📍</span><span>${esc(stop.hint)}</span></div>
    <div class="task"><span class="kicker">Zadanie</span>${esc(stop.task)}</div>
    ${photoStrip(stop)}
    <button class="facts-btn" data-act="facts"><span>✦ Ciekawostki</span><span class="count">${stop.facts.length} ›</span></button>
    ${nextTeaser()}
  </section>
  <div class="dock">
    <label class="btn btn-ghost dock-photo" aria-label="Dodaj zdjęcie">
      <input type="file" accept="image/*" multiple data-upload="${esc(stop.id)}">📷
    </label>
    <button class="btn btn-primary" data-act="next" ${uploading ? 'disabled' : ''}>${label}</button>
  </div>`;
}

function viewFacts() {
  const stop = stops[state.current];
  return `
  <div class="sheet-bg" data-act="close">
    <div class="sheet" role="dialog" aria-label="Ciekawostki">
      <h2>${esc(displayTitle(stop, true))}</h2>
      <ul class="facts">${stop.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      <button class="link" data-act="close">zamknij</button>
    </div>
  </div>`;
}

function viewEnd() {
  const all = state.photos;
  const word = all.length === 1 ? 'zdjęcie' : all.length % 10 >= 2 && all.length % 10 <= 4 && (all.length < 10 || all.length > 20) ? 'zdjęcia' : 'zdjęć';
  const MAX = 9;
  const shown = all.slice(0, MAX);
  const rest = all.length - shown.length;
  return `
  <section class="hero end">
    ${ANGEL_SVG}
    <h1>Szlak zaliczony</h1>
    <p>${ANGEL_COUNT} aniołków${all.length ? ` i ${all.length} ${word}` : ''}</p>
    ${shown.length ? `<div class="collage">${shown.map((p, i) => thumb(p, i === MAX - 1 && rest ? `<span class="more">+${rest}</span>` : '')).join('')}</div>` : ''}
    <button class="link" data-act="sheet">lista przystanków</button>
  </section>`;
}

function viewSheet() {
  const items = stops.map((s, i) => {
    const cls = i < state.current ? 'done' : i === state.current ? 'now' : '';
    const dot = i < state.current ? '✓' : i + 1;
    const revealed = i < state.current || (i === state.current && isArrived(s));
    return `<li class="${cls}"><button data-jump="${i}">
      <span class="dot">${dot}</span><span class="name">${esc(displayTitle(s, revealed))}</span>
    </button></li>`;
  }).join('');
  return `
  <div class="sheet-bg" data-act="close">
    <div class="sheet" role="dialog" aria-label="Lista przystanków">
      <h2>Przystanki</h2>
      <ol class="stop-grid">${items}</ol>
      <button class="link" data-act="close">zamknij</button>
    </div>
  </div>`;
}

// Gdy otwarty jest wybór zdjęć, nie podmieniamy HTML (zgubilibyśmy wybrane pliki).
let picking = 0;
let lastKey = '';
function render() {
  if (picking && Date.now() - picking < 120000) { render.queued = true; return; }
  picking = 0;
  if (!state.loaded) return; // ekran ładowania z index.html
  const scr = screen();
  document.body.classList.add('fit'); // nic się nie przewija — wszystko mieści się na ekranie
  let html;
  let key = scr;
  if (scr === 'tutorial') html = viewTutorial();
  else if (scr === 'lock') html = viewLock();
  else if (scr === 'intro') html = viewIntro();
  else if (scr === 'end') html = viewEnd();
  else {
    html = viewStop();
    key += `:${state.current}:${isArrived(stops[state.current])}`;
  }
  // Poradnik renderujemy raz — inaczej przewijane slajdy wracałyby na początek.
  if (scr === 'tutorial' && lastKey === key && !state.sheet) return;
  const animate = key !== lastKey;
  lastKey = key;
  app.innerHTML = `<div class="view${animate ? ' fade-in' : ''}">${html}</div>${state.sheet && scr !== 'tutorial' && scr !== 'lock' ? viewSheet() : ''}${state.facts && scr === 'stop' ? viewFacts() : ''}`;
  if (scr === 'tutorial') wireTutorial(app);
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
  switch (act) {
    case 'start': state.introSeen = true; safeSet('aniolki.intro', '1'); window.scrollTo(0, 0); render(); break;
    case 'arrive': markArrived(stops[state.current]); render(); break;
    case 'next': goNext(); break;
    case 'sheet': state.sheet = true; render(); break;
    case 'close': state.sheet = false; state.facts = false; render(); break;
    case 'facts': state.facts = true; render(); break;
    case 'lock': shakeLock(); break;
    case 'tut-next': tutorialGo(app, 1); break;
    case 'tut-again': tutorialGo(app, 'start'); break;
    case 'tut-yes': state.tutorialDone = true; safeSet('aniolki.tutorial', '1'); window.scrollTo(0, 0); render(); break;
  }
});

app.addEventListener('change', (e) => {
  const input = e.target.closest('[data-upload]');
  if (!input) return;
  picking = 0;
  const stop = stops.find((s) => s.id === input.dataset.upload);
  if (stop) addPhotos(stop, input.files);
  else render();
});

const flushPicking = () => { picking = 0; if (render.queued) { render.queued = false; render(); } };
app.addEventListener('cancel', (e) => { if (e.target.matches?.('input[type=file]')) flushPicking(); }, true);
window.addEventListener('focus', () => setTimeout(() => {
  if (picking && Date.now() - picking > 1500) flushPicking();
}, 800));

api.subscribe({
  onGame: (g) => { if (applyGame(g)) render(); },
  onPhoto: (row) => {
    if (!state.photos.some((p) => p.id === row.id)) { state.photos.push(row); render(); }
  },
});

document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
setInterval(() => { if (!document.hidden) refresh(); }, 8000);

// O 19:00 kłódka otwiera się sama — także gdy aplikacja jest właśnie otwarta.
setInterval(() => {
  if (state.loaded && !state.unlocked && !state.unlocking && timeUnlocked()) {
    if (screen() === 'lock') unlockAnimation({ current: state.current });
    else { setUnlocked(true); render(); }
    api.setUnlocked(true).catch(() => {});
  }
}, 1000);

refresh();
