/** One opt-in handwritten signature per browser / installed PWA origin.
 *  It never leaves this device and can be deleted by the user. */
export const SIGNATURE_STORAGE_KEY = 'rollback-ally-pdf.saved-signature.v1';
const MAX_DATA_URL_LENGTH = 2_000_000;

function validateSignature(value) {
  return value !== null
    && typeof value === 'object'
    && typeof value.data === 'string'
    && value.data.length <= MAX_DATA_URL_LENGTH
    && /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value.data)
    && typeof value.ratio === 'number'
    && Number.isFinite(value.ratio)
    && value.ratio > 0.05
    && value.ratio < 50;
}
export function loadSavedSignature(storage) {
  try {
    const raw = storage?.getItem(SIGNATURE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return validateSignature(parsed) ? { data: parsed.data, ratio: parsed.ratio } : null;
  } catch (_) {
    // iOS private browsing and strict browser policies may restrict localStorage.
    return null;
  }
}
export function saveSignature(storage, value) {
  if (!storage) throw new Error('Almacenamiento local no disponible');
  if (!validateSignature(value)) throw new TypeError('Firma PNG inválida');
  storage.setItem(SIGNATURE_STORAGE_KEY, JSON.stringify({
    version: 1, data: value.data, ratio: value.ratio,
  }));
  return true;
}
export function deleteSavedSignature(storage) {
  if (!storage) throw new Error('Almacenamiento local no disponible');
  storage.removeItem(SIGNATURE_STORAGE_KEY);
}
