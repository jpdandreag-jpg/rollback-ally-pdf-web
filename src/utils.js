export function exportFileName(fileName) {
  const trimmed = String(fileName || 'Documento.pdf').trim();
  const base = trimmed.toLowerCase().endsWith('.pdf')
    ? trimmed.slice(0, -4)
    : trimmed;
  const clean = (base || 'Documento').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_');
  return clean + '_editado.pdf';
}
export function safePosition(number) {
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(.98, number));
}
