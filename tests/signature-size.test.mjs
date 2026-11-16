import test from 'node:test';
import assert from 'node:assert/strict';
import { resizeSignatureStamp, MIN_SIGNATURE_SIZE, MAX_SIGNATURE_SIZE } from '../src/signature-size.js';
function makeStamp() {
  return { type: 'signature', x: .8, y: .86, width: .27,
    aspect: 3.2, signedAtLabel: 'Firmado: 16/11/2026 15:17:54 UTC-05:00',
    signedAtUtcISO: '2026-11-16T20:17:54.000Z' };
}
test('Change signature from 27% to 42% keeping timestamp and aspect ratio', () => {
  const stamp = makeStamp();
  const ts = stamp.signedAtLabel;
  const iso = stamp.signedAtUtcISO;
  const ratio = stamp.aspect;
  resizeSignatureStamp(stamp, 42, 600, 780, 1);
  assert.equal(stamp.width, .42);
  assert.equal(stamp.aspect, ratio);
  assert.equal(stamp.signedAtLabel, ts);
  assert.equal(stamp.signedAtUtcISO, iso);
  assert.ok(stamp.x + stamp.width <= 1);
});
test('Slider minimum and maximum safe bounds', () => {
  const stamp = makeStamp();
  resizeSignatureStamp(stamp, -100, 600, 780);
  assert.equal(stamp.width, MIN_SIGNATURE_SIZE / 100);
  resizeSignatureStamp(stamp, 200, 600, 780);
  assert.equal(stamp.width, MAX_SIGNATURE_SIZE / 100);
});
test('Very tall signature fits inside page with caption', () => {
  const stamp = { ...makeStamp(), aspect: .35 };
  resizeSignatureStamp(stamp, 70, 600, 400, 1);
  const verticalSpace = (stamp.width * 600 / stamp.aspect) + 14;
  assert.ok(stamp.width <= .7);
  assert.ok(stamp.y >= 0);
  assert.ok(stamp.y * 400 + verticalSpace <= 400);
});
test('Corrupt signature or dimensions are rejected', () => {
  assert.throws(() => resizeSignatureStamp({type:'text', aspect:1},27,600,780), /inválida/);
  assert.throws(() => resizeSignatureStamp(makeStamp(),27,0,780), /inválida/);
});
