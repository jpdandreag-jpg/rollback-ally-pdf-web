/** Timestamp based on the device clock, NOT an authority-certified timestamp. */
const pad2 = n => String(n).padStart(2, '0');
export function formatSigningTimestamp(utcISO, offsetMinutes) {
  const millis = Date.parse(utcISO);
  if (!Number.isFinite(millis) || !Number.isFinite(offsetMinutes)) {
    throw new TypeError('Fecha de firma inválida');
  }
  const local = new Date(millis - offsetMinutes * 60000);
  const zoneSign = offsetMinutes <= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const tz = 'UTC' + zoneSign + pad2(Math.floor(abs / 60)) + ':' + pad2(abs % 60);
  const day = pad2(local.getUTCDate()) + '/' + pad2(local.getUTCMonth() + 1) +
    '/' + local.getUTCFullYear();
  const clock = pad2(local.getUTCHours()) + ':' + pad2(local.getUTCMinutes()) +
    ':' + pad2(local.getUTCSeconds());
  return day + ' ' + clock + ' ' + tz;
}
export function captureSigningTime(deviceNow = new Date()) {
  if (!(deviceNow instanceof Date) || Number.isNaN(deviceNow.getTime())) {
    throw new TypeError('No se pudo leer la fecha del dispositivo');
  }
  const utcISO = deviceNow.toISOString();
  const offsetMinutes = deviceNow.getTimezoneOffset();
  return {
    signedAtUtcISO: utcISO,
    signedAtOffsetMinutes: offsetMinutes,
    signedAtLabel: 'Firmado: ' + formatSigningTimestamp(utcISO, offsetMinutes),
  };
}
/** Draw the saved handwriting and the time captured when the user placed it.
 * Moving, reusing or re-exporting never changes that time. */
export function drawTimedSignature(page, image, font, stamp, color) {
  if (!stamp.signedAtLabel) throw new Error('La firma no tiene fecha y hora');
  const pageW = page.getWidth();
  const pageH = page.getHeight();
  let imageW = Math.max(20, Math.min(pageW * (stamp.width || .27), pageW - 6));
  let imageH = imageW / stamp.aspect;
  if (imageH > pageH - 25) {
    imageH = Math.max(10, pageH - 25);
    imageW = imageH * stamp.aspect;
  }
  let labelSize = 7.6;
  const labelWidthAtDefault = font.widthOfTextAtSize(stamp.signedAtLabel, labelSize);
  if (labelWidthAtDefault > pageW - 8) {
    labelSize *= (pageW - 8) / labelWidthAtDefault;
  }
  const labelWidth = font.widthOfTextAtSize(stamp.signedAtLabel, labelSize);
  const x = Math.max(2, Math.min(stamp.x * pageW, pageW - Math.max(imageW, labelWidth) - 3));
  const top = Math.max(2, Math.min(stamp.y * pageH, pageH - imageH - labelSize - 8));
  const imageY = pageH - top - imageH;
  const captionY = imageY - labelSize - 3;
  page.drawImage(image, { x, y: imageY, width: imageW, height: imageH });
  page.drawText(stamp.signedAtLabel, {
    x, y: Math.max(2, captionY), size: labelSize, font, color,
  });
  return { x, imageY, captionY, imageW, imageH, label: stamp.signedAtLabel };
}
