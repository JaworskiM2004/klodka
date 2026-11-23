import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextIndex, clampIndex, mapsUrl, progressLabel, fitSize, photoPath, screenFor, displayTitle, timeUnlocked } from '../js/logic.js';
import { stops } from '../js/stops.js';

test('nextIndex stops at the end screen', () => {
  assert.equal(nextIndex(0, 13), 1);
  assert.equal(nextIndex(12, 13), 13);
  assert.equal(nextIndex(13, 13), 13);
  assert.equal(nextIndex(-5, 13), 1);
});

test('clampIndex handles junk', () => {
  assert.equal(clampIndex(99, 13), 13);
  assert.equal(clampIndex(-1, 13), 0);
  assert.equal(clampIndex(NaN, 13), 0);
});

test('mapsUrl walks to coords or named destination', () => {
  const u = mapsUrl({ lat: 53.1, lng: 18.6 });
  assert.match(u, /travelmode=walking/);
  assert.match(u, /destination=53\.1,18\.6/);
  assert.match(mapsUrl({ lat: 1, lng: 2, dest: 'Szeroka 40, Toruń' }), /destination=Szeroka%2040%2C%20Toru%C5%84/);
});

test('progressLabel', () => {
  assert.equal(progressLabel(0, 13), '1 / 13');
  assert.equal(progressLabel(13, 13), '13 / 13');
});

test('fitSize never upscales', () => {
  assert.deepEqual(fitSize(4032, 3024, 2400), { w: 2400, h: 1800 });
  assert.deepEqual(fitSize(800, 600, 2400), { w: 800, h: 600 });
});

test('photoPath is per stop and jpg', () => {
  assert.match(photoPath('jagodka', 1, 0.5), /^jagodka\/1-[a-z0-9]+\.jpg$/);
});

test('every stop is complete and ids unique', () => {
  assert.equal(new Set(stops.map(s => s.id)).size, stops.length);
  for (const s of stops) {
    assert.ok(s.title && s.hint && s.task, s.id);
    assert.ok(!('where' in s), s.id);
    assert.ok(Number.isFinite(s.lat) && Number.isFinite(s.lng), s.id);
    assert.ok(s.facts.length >= 2, s.id);
  }
  assert.equal(stops.at(-1).id, 'holistian');
});

test('copy keeps the surprise and skips touristy gingerbread', () => {
  const all = JSON.stringify(stops).toLowerCase();
  for (const w of [/piernik/, /róż/, /piwnic/, /\bdomi(?![a-ząćęłńóśźż])/, /dominik[ao](?![a-ząćęłńóśźż])/, /randk/]) {
    assert.ok(!w.test(all), `forbidden word: ${w}`);
  }
});

test('screenFor: locked shows tutorial in browser, lock on home screen', () => {
  const base = { unlocked: false, standalone: false, tutorialDone: false, current: 0, total: 16, introSeen: false };
  assert.equal(screenFor(base), 'tutorial');
  assert.equal(screenFor({ ...base, standalone: true }), 'lock');
  assert.equal(screenFor({ ...base, tutorialDone: true }), 'lock');
  assert.equal(screenFor({ ...base, unlocked: true }), 'intro');
  assert.equal(screenFor({ ...base, unlocked: true, introSeen: true }), 'stop');
  assert.equal(screenFor({ ...base, unlocked: true, current: 3 }), 'stop');
  assert.equal(screenFor({ ...base, unlocked: true, current: 16 }), 'end');
});

test('displayTitle hides surprises until revealed', () => {
  assert.equal(displayTitle({ title: 'Jarmark', secret: true }, false), 'Niespodzianka ✨');
  assert.equal(displayTitle({ title: 'Jarmark', secret: true }, true), 'Jarmark');
  assert.equal(displayTitle({ title: 'Jonasz' }, false), 'Jonasz');
});

test('route splits the market from its angels, ends at the tower', () => {
  const ids = stops.map(s => s.id);
  assert.deepEqual(ids.slice(2, 5), ['jarmark', 'jonasz', 'iga']);
  assert.ok(stops.filter(s => s.kind === 'place').every(s => s.secret));
});

test('padlock opens by itself at 19:00 on the day', () => {
  assert.equal(timeUnlocked(new Date(2026, 10, 23, 18, 59, 59)), false);
  assert.equal(timeUnlocked(new Date(2026, 10, 23, 19, 0, 0)), true);
  assert.equal(timeUnlocked(new Date(2026, 10, 22, 23, 0)), false);
});
