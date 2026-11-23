// Poradnik "dodaj do ekranu początkowego" — slajdy z narysowanymi zrzutami ekranu.

const ua = navigator.userAgent;
export const platform = {
  ios: /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  android: /Android/.test(ua),
  inApp: /FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\//.test(ua),
};

export function isStandalone() {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

export const PADLOCK = (cls = '') => `
<svg class="padlock ${cls}" viewBox="0 0 120 140" aria-hidden="true">
  <g class="shackle"><path d="M34 64 V44 a26 26 0 0 1 52 0 V64" fill="none" stroke="#c3b4f0" stroke-width="12" stroke-linecap="round"/></g>
  <rect x="16" y="60" width="88" height="72" rx="20" fill="#a593e3"/>
  <rect x="16" y="60" width="88" height="20" rx="10" fill="#b6a6ec" opacity=".55"/>
  <circle cx="60" cy="92" r="9" fill="#2d2a34"/>
  <rect x="56" y="94" width="8" height="18" rx="4" fill="#2d2a34"/>
</svg>`;

const SHARE = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>`;
const PLUS = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>`;

// --- narysowane "zrzuty ekranu" (iOS 26, na podstawie prawdziwych zrzutów) ---
const BLANK_ICON = `<span class="m-tile">${PADLOCK()}</span>`;
const LINES = '<div class="m-page"><div class="m-line w70"></div><div class="m-line w50"></div><div class="m-line w60"></div></div>';
const BAR = (hlMenu) => `
    <div class="m-bar">
      <span class="m-round">‹</span>
      <span class="m-url"><span class="m-burger${hlMenu ? ' hl' : ''}">☰</span><span class="m-url-txt">jaworskim2004.github.io</span><span>↻</span></span>
      <span class="m-round">⧉</span>
    </div>`;
const SHEET_HEAD = `
      <div class="m-sheet-head">${BLANK_ICON}<div><small>jaworskim2004.github.io</small><span class="m-opt">Opcje ›</span></div></div>
      <div class="m-people"><i></i><i></i><i></i><i></i></div>`;
const ACTIONS = (more) => `
      <div class="m-actions">
        <span><i>⧉</i>Kopiuj</span><span><i>🔖</i>Zakładki</span><span><i>👓</i>Czytelnia</span>
        <span class="${more === 'more' ? 'hl-wrap' : ''}"><i class="${more === 'more' ? 'hl' : ''}">${more === 'more' ? '⌄' : '⌃'}</i>${more === 'more' ? 'Pokaż więcej' : 'Pokaż mniej'}</span>
      </div>`;

const mockSafariBar = `<div class="mock">${LINES}${BAR(true)}</div>`;

const mockMenu = `
  <div class="mock">
    ${LINES}
    <div class="m-menu">
      <div class="m-item"><span class="m-ico">文</span><span>Przetłumacz</span></div>
      <div class="m-item hl">${SHARE}<span>Udostępnij</span></div>
      <div class="m-item"><span class="m-ico">🔖</span><span>Dodaj do Zakładki</span></div>
      <div class="m-item"><span class="m-ico">⌕</span><span>Znajdź na stronie</span></div>
    </div>
    ${BAR(false)}
  </div>`;

const mockSheet = `
  <div class="mock">
    <div class="m-sheet">${SHEET_HEAD}${ACTIONS('more')}</div>
  </div>`;

const mockSheetMore = `
  <div class="mock">
    <div class="m-sheet m-sheet-up">
      ${ACTIONS('less')}
      <div class="m-list">
        <div class="m-item"><span class="m-ico">☆</span><span>Dodaj do ulubionych</span></div>
        <div class="m-item"><span class="m-ico">⌕</span><span>Znajdź na stronie</span></div>
        <div class="m-item hl">${PLUS}<span>Do ekranu głównego</span></div>
      </div>
    </div>
  </div>`;

const mockAdd = `
  <div class="mock">
    <div class="m-sheet m-add">
      <div class="m-add-head"><span class="m-round">✕</span><span class="hl m-add-btn">Dodaj</span></div>
      <div class="m-add-row">${BLANK_ICON}<div><span class="m-field">&nbsp;</span><small>jaworskim2004.github.io</small></div></div>
      <div class="m-add-row m-toggle"><span>Otwórz jako aplikację internetową</span><i></i></div>
    </div>
  </div>`;

const mockHome = `
  <div class="mock m-home">
    <div class="m-grid">${'<i></i>'.repeat(5)}<span class="m-home-app"><span class="m-app hl">${PADLOCK()}</span></span>${'<i></i>'.repeat(6)}</div>
  </div>`;

const mockInApp = `
  <div class="mock">
    <div class="m-top"><span>✕</span><span class="m-url sm">jaworskim2004.github.io</span><span class="hl m-round">•••</span></div>
    <div class="m-menu m-menu-top">
      <div class="m-item hl"><span class="m-ico">🧭</span><span>Otwórz w przeglądarce</span></div>
      <div class="m-item"><span class="m-ico">⧉</span><span>Kopiuj link</span></div>
    </div>
  </div>`;

const mockAndroidTop = `
  <div class="mock">
    <div class="m-top"><span class="m-url sm">jaworskim2004.github.io</span><span class="hl m-round">⋮</span></div>
    <div class="m-page"><div class="m-line w70"></div><div class="m-line w50"></div><div class="m-line w60"></div></div>
  </div>`;

const mockAndroidMenu = `
  <div class="mock">
    <div class="m-top"><span class="m-url sm">jaworskim2004.github.io</span><span class="m-round">⋮</span></div>
    <div class="m-menu m-menu-top">
      <div class="m-item"><span class="m-ico">↻</span><span>Odśwież</span></div>
      <div class="m-item hl">${PLUS}<span>Dodaj do ekranu głównego</span></div>
      <div class="m-item"><span class="m-ico">⚙</span><span>Ustawienia</span></div>
    </div>
  </div>`;

function slide(step, title, mock, note = '') {
  return `<section class="slide">
    ${step ? `<div class="kicker">${step}</div>` : ''}
    <h2>${title}</h2>
    ${mock}
    ${note ? `<p class="slide-note">${note}</p>` : ''}
  </section>`;
}

export function tutorialSlides() {
  const s = [];
  if (platform.inApp) {
    s.push(slide('Najpierw', 'Otwórz tę stronę w Safari', mockInApp,
      'Kliknij ••• w rogu i wybierz „Otwórz w przeglądarce”.'));
  }
  if (platform.android) {
    s.push(slide('Krok 1', 'Kliknij ⋮ w prawym górnym rogu', mockAndroidTop));
    s.push(slide('Krok 2', 'Wybierz „Dodaj do ekranu głównego”', mockAndroidMenu, 'Czasem nazywa się to „Zainstaluj aplikację”. Potem potwierdź „Dodaj”.'));
  } else {
    s.push(slide('Krok 1', 'Kliknij ☰ w pasku adresu', mockSafariBar, 'Na dole ekranu, po lewej stronie adresu.'));
    s.push(slide('Krok 2', 'Wybierz „Udostępnij”', mockMenu));
    s.push(slide('Krok 3', 'Kliknij „Pokaż więcej”', mockSheet));
    s.push(slide('Krok 4', 'Wybierz „Do ekranu głównego”', mockSheetMore));
    s.push(slide('Krok 5', 'Kliknij „Dodaj”', mockAdd,
      'Nazwy nie zmieniaj — ma zostać pusta. Przełącznik „Otwórz jako aplikację internetową” zostaw włączony.'));
  }
  s.push(`<section class="slide slide-ask">
    ${mockHome}
    <h2>Widzisz kłódkę na ekranie głównym?</h2>
    <div class="actions">
      <button class="btn btn-primary" data-act="tut-yes">Tak</button>
      <button class="btn btn-ghost" data-act="tut-again">Nie — pokaż jeszcze raz</button>
    </div>
  </section>`);
  return s;
}

export function viewTutorial() {
  const slides = tutorialSlides();
  return `
  <div class="tutorial">
    <div class="slides" id="slides">${slides.join('')}</div>
    <div class="dots" id="dots">${slides.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div>
    <button class="btn btn-ghost tut-next" data-act="tut-next">Dalej →</button>
  </div>`;
}

// Kropeczki + przycisk "Dalej" — podpinane po każdym wyrenderowaniu poradnika.
export function wireTutorial(root) {
  const track = root.querySelector('#slides');
  if (!track) return;
  const dots = [...root.querySelectorAll('#dots i')];
  const next = root.querySelector('.tut-next');
  const update = () => {
    const i = Math.round(track.scrollLeft / track.clientWidth);
    dots.forEach((d, j) => d.classList.toggle('on', j === i));
    if (next) next.style.visibility = i >= dots.length - 1 ? 'hidden' : 'visible';
  };
  track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  update();
}

export function tutorialGo(root, delta) {
  const track = root.querySelector('#slides');
  if (!track) return;
  const i = Math.round(track.scrollLeft / track.clientWidth);
  const target = delta === 'start' ? 0 : i + delta;
  track.scrollTo({ left: target * track.clientWidth, behavior: 'smooth' });
}
