import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextIndex, clampIndex, mapsUrl, progressLabel, fitSize, photoPath } from '../js/logic.js';
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
    assert.ok(s.title && s.where && s.task, s.id);
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
