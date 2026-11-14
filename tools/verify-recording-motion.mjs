import assert from 'node:assert/strict';
import fs from 'node:fs';
import config from '../tailwind.config.mjs';

const wave = config.theme.extend.keyframes['venture-ring'];
for (const stop of Object.values(wave)) {
  assert.ok(!('width' in stop) && !('height' in stop), 'Pulse must not animate layout dimensions');
}
assert.equal(wave['0%'].opacity, '0', 'A new wave must start invisible');
assert.equal(wave['100%'].opacity, '0', 'The outgoing wave must fade before its reset');
const rings = fs.readFileSync('src/components/WhyVentureRings.tsx', 'utf8');
assert.equal((rings.match(/animate-venture-ring-/g) || []).length, 3);
assert.equal((rings.match(/size-\[495\.56px\]/g) || []).length, 3, 'Existing base dimensions must remain unchanged');
assert.equal((rings.match(/motion-reduce:animate-none/g) || []).length, 3);
assert.doesNotMatch(rings, /useState|setInterval|requestAnimationFrame/);
const page = fs.readFileSync('src/app/page.tsx', 'utf8');
assert.match(page, /className="rounded-circle rounded-circle--inner rounded-circle--1[^\"]*"[^>]*><WhyVentureRings \/>/);
const cards = [...page.matchAll(/className="card card--features [^\"]*"/g)];
assert.equal(cards.length, 5);
for (const [card] of cards) {
  assert.doesNotMatch(card, /hover:\[transform:/, 'Cards must remain stationary on hover');
  assert.ok(card.includes('hover:[background-color:#e2f4f3]'), 'Each card must use the original teal hover');
}
console.log('Animation checks passed: existing pulse waves and stationary cards with background-only hover.');
