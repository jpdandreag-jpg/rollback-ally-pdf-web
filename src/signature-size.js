export const MIN_SIGNATURE_SIZE = 8;
export const MAX_SIGNATURE_SIZE = 70;
/** Rescale one signature on the PDF without distorting its aspect ratio or
 * replacing its captured timestamp. Width is a fraction of page width. */
export function resizeSignatureStamp(stamp, requestedPercent, frameWidth, frameHeight, scale = 1) {
  if (!stamp || stamp.type !== 'signature' ||
      !(Number.isFinite(stamp.aspect) && stamp.aspect > 0)) {
    throw new TypeError('Firma inválida');
  }
  const pageW = Number(frameWidth);
  const pageH = Number(frameHeight);
  const zoom = Number.isFinite(scale) && scale > 0 ? scale : 1;
  if (!(pageW > 0 && pageH > 0)) throw new TypeError('Página inválida');
  const percent = Number.isFinite(requestedPercent) ? requestedPercent : 27;
  const requestedWidth = Math.min(MAX_SIGNATURE_SIZE,
    Math.max(MIN_SIGNATURE_SIZE, percent)) / 100;
  // Leave room for the visible timestamp caption at the bottom.
  const captionHeight = 14 * zoom;
  const heightBound = Math.max(0.01, (pageH - captionHeight - 6) * stamp.aspect / pageW);
  stamp.width = Math.min(requestedWidth, heightBound);
  stamp.x = Math.max(0, Math.min(Number(stamp.x) || 0, 1 - stamp.width));
  const heightFraction = (stamp.width * pageW / stamp.aspect + captionHeight) / pageH;
  stamp.y = Math.max(0, Math.min(Number(stamp.y) || 0, 1 - heightFraction));
  return stamp;
}
