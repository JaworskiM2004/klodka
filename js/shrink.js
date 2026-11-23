// Zmniejsza zdjęcie przed wysłaniem (szybciej na mobilnym internecie).
// 2400 px na dłuższym boku wystarcza do odbitki 10x15 w dobrej jakości.
import { fitSize } from './logic.js';

const MAX = 2400;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

export async function shrink(file) {
  try {
    const img = await loadImage(file);
    const { w, h } = fitSize(img.naturalWidth, img.naturalHeight, MAX);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.88));
    return blob || file;
  } catch {
    return file; // nie udało się przetworzyć — wysyłamy oryginał
  }
}
