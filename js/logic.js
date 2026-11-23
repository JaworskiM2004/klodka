// Czysta logika — bez DOM i sieci, testowana w Node.

export function nextIndex(current, total) {
  return Math.min(Math.max(current, 0) + 1, total);
}

export function clampIndex(i, total) {
  return Math.min(Math.max(Number.isFinite(i) ? i : 0, 0), total);
}

export function mapsUrl(stop) {
  const dest = stop.dest
    ? encodeURIComponent(stop.dest)
    : `${stop.lat},${stop.lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`;
}

export function progressLabel(current, total) {
  return `${Math.min(current + 1, total)} / ${total}`;
}

// Wymiary po zmniejszeniu (dłuższy bok <= max), bez powiększania.
export function fitSize(w, h, max) {
  const s = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * s), h: Math.round(h * s) };
}

export function photoPath(stopId, now = Date.now(), rand = Math.random()) {
  return `${stopId}/${now}-${Math.floor(rand * 1e8).toString(36)}.jpg`;
}

// Który ekran pokazać.
export function screenFor({ unlocked, standalone, tutorialDone, current, total, introSeen }) {
  if (!unlocked) return standalone || tutorialDone ? 'lock' : 'tutorial';
  if (current >= total) return 'end';
  if (!introSeen && current === 0) return 'intro';
  return 'stop';
}

// Niespodzianki (jarmark, Wedel) zdradzamy dopiero na miejscu.
export function displayTitle(stop, revealed) {
  return stop.secret && !revealed ? 'Niespodzianka ✨' : stop.title;
}
