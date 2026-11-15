import './style.css';
import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  PDFDocument, StandardFonts, rgb,
  PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup, PDFOptionList,
} from 'pdf-lib';
import { exportFileName, safePosition } from './utils.js';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
const $ = (selector) => document.querySelector(selector);
const ui = {
  file: $('#fileInput'), open: $('#openButton'), hero: $('#heroOpen'),
  save: $('#saveButton'), share: $('#shareButton'),
  empty: $('#emptyState'), workspace: $('#workspace'),
  strip: $('#toolstrip'), documentTop: $('#documentTop'),
  name: $('#currentName'), count: $('#pageCount'),
  currentPage: $('#currentPage'), totalPages: $('#totalPages'),
  prev: $('#prevPage'), next: $('#nextPage'),
  zoomOut: $('#zoomOut'), zoomIn: $('#zoomIn'), zoomIndicator: $('#zoomIndicator'),
  pageScroll: $('#pageScroll'), frame: $('#pageFrame'),
  canvas: $('#pdfCanvas'), stamps: $('#stampsLayer'), instruction: $('#instruction'),
  removeSelected: $('#removeSelected'), toast: $('#toast'),
  textDialog: $('#textDialog'), textForm: $('#textForm'), text: $('#textInput'),
  fontSize: $('#fontSize'), fontDisplay: $('#fontDisplay'),
  signDialog: $('#signatureDialog'), signCanvas: $('#signaturePad'),
  clearSign: $('#clearSignature'), useSign: $('#useSignature'),
  fieldsDialog: $('#fieldsDialog'), fieldsBody: $('#fieldsBody'),
  fieldsCount: $('#fieldCount'), finishFields: $('#finishFields'),
};
const state = {
  fileName: '', original: null, pdfjsDoc: null, loadingTask: null,
  page: 1, pageTotal: 0, zoom: 1, scale: 1,
  tool: 'move', stampText: '', fontSize: 14,
  signatureData: '', signatureRatio: 1,
  stamps: [], fields: [], fieldValues: new Map(),
  selectedId: null, renderId: 0, renderTask: null,
  busy: false, cacheFile: null, exportVersion: 0,
};
let exportTimer = null;
let nextId = 0, toastTimer;
function toast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 4800);
}
function setBusy(busy) {
  state.busy = busy;
  ui.open.disabled = busy;
  ui.hero.disabled = busy;
  ui.save.disabled = busy || !state.cacheFile;
  ui.share.disabled = busy || !state.cacheFile;
}
function setTool(tool) {
  state.tool = tool;
  document.querySelectorAll('[data-tool]').forEach(button => {
    button.classList.toggle('active', button.dataset.tool === tool);
  });
  const labels = {
    move: 'Puedes desplazarte por el PDF. Selecciona un elemento para moverlo o eliminarlo.',
    text: 'Toca la página para colocar el texto. La posición puede ajustarse después.',
    date: 'Toca la página para colocar la fecha.',
    check: 'Toca la página donde quieras colocar una marca de verificación.',
    signature: 'Toca la página donde quieres poner la firma.',
  };
  ui.instruction.textContent = labels[tool] || labels.move;
}
function updateToolbar() {
  ui.currentPage.textContent = state.page;
  ui.totalPages.textContent = state.pageTotal;
  ui.count.textContent = state.page + ' / ' + state.pageTotal;
  ui.prev.disabled = state.page <= 1 || state.busy;
  ui.next.disabled = state.page >= state.pageTotal || state.busy;
  ui.zoomIndicator.textContent = Math.round(state.zoom * 100) + '%';
  ui.removeSelected.hidden = state.selectedId == null;
  ui.fieldsCount.hidden = state.fields.length === 0;
  ui.fieldsCount.textContent = state.fields.length;
}
async function openPdf(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    toast('Selecciona un archivo PDF.');
    return;
  }
  setBusy(true);
  try {
    const input = new Uint8Array(await file.arrayBuffer());
    if (input.length < 5 || new TextDecoder().decode(input.slice(0, 5)) !== '%PDF-') {
      throw new Error('Este archivo no parece ser un PDF válido.');
    }
    if (state.renderTask) {
      try { state.renderTask.cancel(); } catch (_) { /* cancel old render */ }
      state.renderTask = null;
    }
    if (state.loadingTask) {
      try { await state.loadingTask.destroy(); } catch (_) { /* previous document */ }
    }
    const loadingTask = pdfjs.getDocument({
      data: Uint8Array.from(input),
      useSystemFonts: true,
      isEvalSupported: false,
    });
    const documentInstance = await loadingTask.promise;
    state.loadingTask = loadingTask;
    state.pdfjsDoc = documentInstance;
    state.original = input;
    state.fileName = file.name;
    state.exportVersion++;
    clearTimeout(exportTimer);
    state.cacheFile = new File([input], exportFileName(file.name), { type: 'application/pdf' });
    state.page = 1;
    state.pageTotal = documentInstance.numPages;
    state.zoom = 1;
    state.stamps = [];
    state.signatureData = '';
    state.selectedId = null;
    state.fieldValues = new Map();
    await detectFormFields(input);
    ui.name.textContent = file.name;
    ui.empty.classList.add('hidden');
    ui.workspace.classList.remove('hidden');
    ui.strip.classList.remove('hidden');
    ui.documentTop.classList.remove('hidden');
    setTool('move');
    await renderPage();
    toast('PDF abierto. Tus documentos no se suben a un servidor.');
  } catch (error) {
    toast('No se pudo abrir el PDF: ' + (error.message || error));
  } finally {
    setBusy(false);
    updateToolbar();
  }
}
async function detectFormFields(bytes) {
  state.fields = [];
  try {
    const document = await PDFDocument.load(bytes);
    for (const field of document.getForm().getFields()) {
      const name = field.getName();
      if (field instanceof PDFTextField) {
        state.fields.push({ name, type: 'text', initial: field.getText() || '' });
      } else if (field instanceof PDFCheckBox) {
        state.fields.push({ name, type: 'checkbox', initial: field.isChecked() });
      } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
        state.fields.push({ name, type: 'choice', initial: field.getSelected().join(', '), options: field.getOptions() });
      } else if (field instanceof PDFRadioGroup) {
        state.fields.push({ name, type: 'radio', initial: field.getSelected() || '', options: field.getOptions() });
      }
    }
  } catch (_) {
    // Some documents use nonstandard forms; stamped text and signatures still work.
  }
}
async function renderPage() {
  if (!state.pdfjsDoc) return;
  const myId = ++state.renderId;
  try {
    if (state.renderTask) {
      try { state.renderTask.cancel(); } catch (_) { /* ignore cancellation */ }
    }
    const page = await state.pdfjsDoc.getPage(state.page);
    if (myId !== state.renderId) return;
    const natural = page.getViewport({ scale: 1 });
    const width = Math.max(220, ui.pageScroll.clientWidth - 22);
    state.scale = Math.min(1.5, width / natural.width) * state.zoom;
    const viewport = page.getViewport({ scale: state.scale });
    const density = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = ui.canvas;
    canvas.width = Math.ceil(viewport.width * density);
    canvas.height = Math.ceil(viewport.height * density);
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';
    ui.frame.style.width = viewport.width + 'px';
    ui.frame.style.height = viewport.height + 'px';
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    state.renderTask = page.render({
      canvasContext: context, viewport,
      transform: density !== 1 ? [density, 0, 0, density, 0, 0] : undefined,
    });
    await state.renderTask.promise;
    if (myId !== state.renderId) return;
    renderStamps();
    updateToolbar();
  } catch (error) {
    if (error.name !== 'RenderingCancelledException') {
      toast('No se pudo mostrar esta página: ' + (error.message || error));
    }
  }
}
function renderStamps() {
  ui.stamps.replaceChildren();
  for (const stamp of state.stamps.filter(s => s.page === state.page)) {
    const box = document.createElement('div');
    box.className = 'stamp' + (state.selectedId === stamp.id ? ' selected' : '') +
      (stamp.type === 'check' ? ' is-check' : '');
    box.style.left = (stamp.x * 100) + '%';
    box.style.top = (stamp.y * 100) + '%';
    box.dataset.id = stamp.id;
    if (stamp.type === 'signature') {
      box.style.width = (stamp.width * 100) + '%';
      const img = document.createElement('img');
      img.src = stamp.data;
      img.alt = 'Firma manuscrita';
      box.append(img);
    } else {
      box.style.fontSize = (stamp.size * state.scale) + 'px';
      box.textContent = stamp.type === 'check' ? '✓' : stamp.text;
    }
    box.addEventListener('pointerdown', startDrag);
    ui.stamps.append(box);
  }
  updateToolbar();
}
function startDrag(event) {
  event.preventDefault();
  event.stopPropagation();
  const id = Number(event.currentTarget.dataset.id);
  const stamp = state.stamps.find(s => s.id === id);
  if (!stamp) return;
  state.selectedId = id;
  const el = event.currentTarget;
  el.classList.add('selected');
  const rect = ui.frame.getBoundingClientRect();
  const x0 = event.clientX, y0 = event.clientY;
  const sx = stamp.x, sy = stamp.y;
  el.setPointerCapture(event.pointerId);
  el.onpointermove = ev => {
    if (!el.hasPointerCapture(ev.pointerId)) return;
    stamp.x = safePosition(sx + (ev.clientX - x0) / rect.width);
    stamp.y = safePosition(sy + (ev.clientY - y0) / rect.height);
    el.style.left = (stamp.x * 100) + '%';
    el.style.top = (stamp.y * 100) + '%';
  };
  const finish = () => {
    el.onpointermove = null;
    el.onpointerup = null;
    el.onpointercancel = null;
    invalidateExport();
    renderStamps();
  };
  el.onpointerup = finish;
  el.onpointercancel = finish;
  updateToolbar();
}
ui.canvas.addEventListener('click', event => {
  if (!state.original || state.busy) return;
  if (!['text', 'date', 'check', 'signature'].includes(state.tool)) {
    state.selectedId = null;
    renderStamps();
    return;
  }
  const r = ui.canvas.getBoundingClientRect();
  const x = safePosition((event.clientX - r.left) / r.width);
  const y = safePosition((event.clientY - r.top) / r.height);
  const type = state.tool;
  if (type === 'signature' && !state.signatureData) {
    toast('Primero dibuja una firma.');
    return;
  }
  const stamp = { id: ++nextId, page: state.page, x, y, type };
  if (type === 'signature') {
    stamp.data = state.signatureData;
    stamp.aspect = state.signatureRatio;
    stamp.width = .27;
  } else {
    stamp.size = type === 'check' ? 22 : state.fontSize;
    stamp.text = type === 'text' ? state.stampText :
      type === 'date' ? new Date().toLocaleDateString('es-CO') : '';
  }
  state.stamps.push(stamp);
  invalidateExport();
  state.selectedId = stamp.id;
  setTool('move');
  renderStamps();
  toast('Elemento colocado. Puedes arrastrarlo para ajustar la posición.');
});
function handleTool(tool) {
  if (!state.original || state.busy) return;
  if (tool === 'text') {
    ui.textDialog.showModal();
    return;
  }
  if (tool === 'signature') {
    prepareSignature();
    ui.signDialog.showModal();
    return;
  }
  if (tool === 'fields') {
    showFields();
    return;
  }
  if (tool === 'undo') {
    if (state.stamps.length) {
      state.stamps.pop();
      invalidateExport();
      state.selectedId = null;
      renderStamps();
      toast('Último elemento eliminado.');
    } else {
      toast('No hay elementos que deshacer.');
    }
    return;
  }
  setTool(tool);
}
document.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => handleTool(b.dataset.tool)));
ui.textForm.addEventListener('submit', ev => {
  ev.preventDefault();
  const value = ui.text.value.trim();
  if (!value) return toast('Escribe un texto para colocar.');
  state.stampText = value;
  state.fontSize = Number(ui.fontSize.value);
  ui.textDialog.close();
  setTool('text');
  toast('Toca la página donde quieras escribir.');
});
ui.fontSize.addEventListener('input', () => { ui.fontDisplay.textContent = ui.fontSize.value + ' pt'; });
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => $('#' + btn.dataset.close).close()));
const pad = ui.signCanvas;
const padCtx = pad.getContext('2d');
let drawing = false, hasInk = false;
function prepareSignature() {
  padCtx.clearRect(0, 0, pad.width, pad.height);
  padCtx.strokeStyle = '#12223e';
  padCtx.lineWidth = 5;
  padCtx.lineCap = 'round';
  padCtx.lineJoin = 'round';
  drawing = false;
  hasInk = false;
}
function signPosition(event) {
  const rect = pad.getBoundingClientRect();
  return { x: (event.clientX - rect.left) / rect.width * pad.width,
    y: (event.clientY - rect.top) / rect.height * pad.height };
}
pad.addEventListener('pointerdown', ev => {
  ev.preventDefault();
  drawing = true; hasInk = true;
  pad.setPointerCapture(ev.pointerId);
  const p = signPosition(ev);
  padCtx.beginPath(); padCtx.moveTo(p.x, p.y);
  padCtx.lineTo(p.x + .01, p.y + .01); padCtx.stroke();
});
pad.addEventListener('pointermove', ev => {
  if (!drawing) return;
  ev.preventDefault();
  const p = signPosition(ev);
  padCtx.lineTo(p.x, p.y); padCtx.stroke();
});
pad.addEventListener('pointerup', () => { drawing = false; });
pad.addEventListener('pointercancel', () => { drawing = false; });
ui.clearSign.addEventListener('click', prepareSignature);
ui.useSign.addEventListener('click', () => {
  if (!hasInk) return toast('Dibuja tu firma primero.');
  const pixels = padCtx.getImageData(0, 0, pad.width, pad.height);
  let minX = pad.width, minY = pad.height, maxX = 0, maxY = 0;
  for (let y = 0; y < pad.height; y++) {
    for (let x = 0; x < pad.width; x++) {
      if (pixels.data[(y * pad.width + x) * 4 + 3] > 16) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
  }
  if (minX > maxX) return toast('Dibuja tu firma primero.');
  const padding = 10;
  const width = maxX - minX + 1 + padding * 2;
  const height = maxY - minY + 1 + padding * 2;
  const trimmed = document.createElement('canvas');
  trimmed.width = width; trimmed.height = height;
  trimmed.getContext('2d').drawImage(pad,
    minX, minY, width - 2 * padding, height - 2 * padding,
    padding, padding, width - 2 * padding, height - 2 * padding);
  state.signatureData = trimmed.toDataURL('image/png');
  state.signatureRatio = width / height;
  ui.signDialog.close();
  setTool('signature');
  toast('Toca el documento donde quieras firmar.');
});
function showFields() {
  if (!state.fields.length) return toast('Este PDF no tiene campos editables. Usa Texto para rellenarlo.');
  ui.fieldsBody.replaceChildren();
  for (const info of state.fields) {
    const label = document.createElement('label');
    const caption = document.createElement('span');
    caption.textContent = info.name;
    label.append(caption);
    let input;
    const current = state.fieldValues.has(info.name) ? state.fieldValues.get(info.name) : info.initial;
    if (info.type === 'checkbox') {
      input = document.createElement('input');
      input.type = 'checkbox'; input.checked = !!current;
      input.addEventListener('change', () => { state.fieldValues.set(info.name, input.checked); invalidateExport(); });
    } else if (info.type === 'choice' || info.type === 'radio') {
      input = document.createElement('select');
      const blank = document.createElement('option');
      blank.value = ''; blank.textContent = 'Seleccionar'; input.append(blank);
      for (const option of info.options) {
        const item = document.createElement('option');
        item.value = option; item.textContent = option; input.append(item);
      }
      input.value = String(current || '');
      input.addEventListener('change', () => { state.fieldValues.set(info.name, input.value); invalidateExport(); });
    } else {
      input = document.createElement('textarea');
      input.rows = 2; input.value = String(current || '');
      input.addEventListener('input', () => { state.fieldValues.set(info.name, input.value); invalidateExport(); });
    }
    label.append(input);
    ui.fieldsBody.append(label);
  }
  ui.fieldsDialog.showModal();
}
ui.finishFields.addEventListener('click', () => { ui.fieldsDialog.close(); toast('Formulario listo para guardar.'); });
ui.removeSelected.addEventListener('click', () => {
  state.stamps = state.stamps.filter(s => s.id !== state.selectedId);
  invalidateExport();
  state.selectedId = null;
  renderStamps();
});
async function buildEditedPdf() {
  const document = await PDFDocument.load(state.original);
  const pages = document.getPages();
  if (state.fieldValues.size > 0) {
    const form = document.getForm();
    for (const [name, value] of state.fieldValues) {
      try {
        const field = form.getField(name);
        if (field instanceof PDFTextField) field.setText(String(value));
        else if (field instanceof PDFCheckBox) {
          if (value) field.check(); else field.uncheck();
        } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
          if (String(value)) field.select(String(value));
        } else if (field instanceof PDFRadioGroup) {
          if (String(value)) field.select(String(value));
        }
      } catch (e) {
        throw new Error('No se pudo editar el campo "' + name + '": ' + e.message);
      }
    }
    form.updateFieldAppearances(await document.embedFont(StandardFonts.Helvetica));
  }
  const helvetica = await document.embedFont(StandardFonts.Helvetica);
  for (const stamp of state.stamps) {
    const page = pages[stamp.page - 1];
    if (!page) continue;
    const width = page.getWidth(), height = page.getHeight();
    const x = safePosition(stamp.x) * width, top = safePosition(stamp.y) * height;
    if (stamp.type === 'signature') {
      const image = await document.embedPng(stamp.data);
      const w = Math.min(width * stamp.width, width - x);
      const h = w / stamp.aspect;
      page.drawImage(image, { x, y: Math.max(0, height - top - h), width: w, height: h });
    } else if (stamp.type === 'check') {
      const size = stamp.size;
      const bottom = height - top - size;
      page.drawLine({ start: { x, y: bottom + size * .4 },
        end: { x: x + size * .32, y: bottom + size * .12 },
        color: rgb(.08, .27, .57), thickness: 2.1 });
      page.drawLine({ start: { x: x + size * .32, y: bottom + size * .12 },
        end: { x: x + size * .92, y: bottom + size * .95 },
        color: rgb(.08, .27, .57), thickness: 2.1 });
    } else {
      const size = stamp.size;
      page.drawText(stamp.text, {
        x, y: Math.max(0, height - top - size),
        size, font: helvetica, color: rgb(.075, .13, .25),
        lineHeight: size * 1.2, maxWidth: Math.max(20, width - x),
      });
    }
  }
  return await document.save();
}
// Keep the final PDF ready before the user presses Share.
// iPhone Safari requires navigator.share() to run during the direct tap,
// not after a long asynchronous PDF export.
function invalidateExport() {
  state.cacheFile = null;
  const token = ++state.exportVersion;
  clearTimeout(exportTimer);
  ui.save.disabled = true;
  ui.share.disabled = true;
  exportTimer = setTimeout(async () => {
    try {
      if (!state.original) return;
      const result = await buildEditedPdf();
      if (token !== state.exportVersion) return;
      state.cacheFile = new File([result], exportFileName(state.fileName), { type: 'application/pdf' });
      setBusy(false);
    } catch (error) {
      if (token !== state.exportVersion) return;
      toast('No se pudo preparar el PDF: ' + (error.message || error));
    }
  }, 250);
}
function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  toast('Archivo preparado. En iPhone también puedes usar Compartir → Guardar en Archivos.');
}
ui.save.addEventListener('click', () => {
  if (!state.cacheFile) return toast('Se está preparando el PDF editado.');
  downloadFile(state.cacheFile);
});
ui.share.addEventListener('click', () => {
  const file = state.cacheFile;
  if (!file) return toast('Se está preparando el PDF editado.');
  // Do not await anything before navigator.share(). It needs tap activation.
  if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
    navigator.share({ files: [file], title: file.name }).catch(e => {
      if (e.name !== 'AbortError') {
        downloadFile(file);
      }
    });
  } else {
    downloadFile(file);
    toast('El menú nativo no está disponible. Se descargó una copia del documento.');
  }
});
ui.open.addEventListener('click', () => ui.file.click());
ui.hero.addEventListener('click', () => ui.file.click());
ui.file.addEventListener('change', async () => {
  const file = ui.file.files?.[0];
  ui.file.value = '';
  await openPdf(file);
});
ui.prev.addEventListener('click', async () => {
  if (state.page > 1) { state.page--; await renderPage(); }
});
ui.next.addEventListener('click', async () => {
  if (state.page < state.pageTotal) { state.page++; await renderPage(); }
});
ui.zoomOut.addEventListener('click', async () => {
  state.zoom = Math.max(.6, state.zoom - .25); await renderPage();
});
ui.zoomIn.addEventListener('click', async () => {
  state.zoom = Math.min(3, state.zoom + .25); await renderPage();
});
setTool('move');
setBusy(false);
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('./sw.js').catch(() => {/* no offline support */}));
}
