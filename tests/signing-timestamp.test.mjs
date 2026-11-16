import test from 'node:test';
import assert from 'node:assert/strict';
import { captureSigningTime, formatSigningTimestamp, drawTimedSignature } from '../src/signing-timestamp.js';

test('Colombia: date, seconds and UTC-05:00 zone', () => {
  assert.equal(formatSigningTimestamp('2026-11-16T20:17:54.000Z', 300),
    '16/11/2026 15:17:54 UTC-05:00');
});
test('Half-hour zone, crossing midnight', () => {
  assert.equal(formatSigningTimestamp('2026-11-16T20:17:54.000Z', -330),
    '17/11/2026 01:47:54 UTC+05:30');
});
test('Capture a single instant when the signature is placed', () => {
  const stamp = captureSigningTime(new Date('2026-11-16T20:17:54.000Z'));
  assert.equal(stamp.signedAtUtcISO, '2026-11-16T20:17:54.000Z');
  assert.match(stamp.signedAtLabel,
    /^Firmado: \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2} UTC[+-]\d{2}:\d{2}$/);
  assert.throws(() => captureSigningTime(new Date('invalid')), /fecha/);
});
test('Export both signature and original captured timestamp to the PDF', () => {
  const operations = [];
  const page = {
    getWidth: () => 612, getHeight: () => 792,
    drawImage: (_, data) => operations.push({kind: 'image', ...data}),
    drawText: (text, data) => operations.push({kind: 'timestamp', text, ...data}),
  };
  const font = {widthOfTextAtSize: (s, size) => s.length * size * .49};
  const stamp = {x: .55, y: .7, width: .27, aspect: 3,
    signedAtLabel: 'Firmado: 16/11/2026 15:17:54 UTC-05:00'};
  drawTimedSignature(page, {}, font, stamp, 'dark');
  assert.equal(operations.length, 2);
  assert.equal(operations[0].kind, 'image');
  assert.equal(operations[1].text, stamp.signedAtLabel);
  assert.ok(operations[1].y < operations[0].y);
  drawTimedSignature(page, {}, font, stamp, 'dark');
  assert.equal(operations[3].text, stamp.signedAtLabel, 'Re-export must preserve signing time');
});
test('Signing near page edge retains visible timestamp', () => {
  const operations = [];
  const page = {
    getWidth: () => 612, getHeight: () => 792,
    drawImage: (_, data) => operations.push(data),
    drawText: (text, data) => operations.push({text, ...data}),
  };
  const font = {widthOfTextAtSize: (s, size) => s.length * size * .5};
  const stamp = {x: .98, y: .98, width: .27, aspect: 3.6,
    signedAtLabel: 'Firmado: 16/11/2026 15:17:54 UTC-05:00'};
  drawTimedSignature(page, {}, font, stamp, 'dark');
  assert.ok(operations[0].x + operations[0].width <= 612);
  assert.ok(operations[1].y >= 0);
  assert.ok(operations[1].x + font.widthOfTextAtSize(operations[1].text, operations[1].size) <= 612);
});
