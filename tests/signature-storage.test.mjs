import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SIGNATURE_STORAGE_KEY, loadSavedSignature, saveSignature, deleteSavedSignature,
} from '../src/signature-storage.js';

function makeStorage() {
  const map = new Map();
  return {
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: key => map.delete(key),
  };
}
const first = { data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE=', ratio: 2.5 };
const second = { data: 'data:image/png;base64,iVBORw0KGgo=', ratio: 1.4 };

test('Firma: guardar, recuperar y reutilizar tras abrir otro documento', () => {
  const browserStorage = makeStorage();
  assert.equal(loadSavedSignature(browserStorage), null);
  saveSignature(browserStorage, first);
  assert.deepEqual(loadSavedSignature(browserStorage), first);
  assert.ok(browserStorage.getItem(SIGNATURE_STORAGE_KEY).includes('image/png'));
  assert.deepEqual(loadSavedSignature(browserStorage), first);
});
test('Firma: guardar una nueva reemplaza solamente la firma anterior', () => {
  const storage = makeStorage();
  saveSignature(storage, first);
  saveSignature(storage, second);
  assert.deepEqual(loadSavedSignature(storage), second);
});
test('Firma: eliminar borra los datos guardados', () => {
  const storage = makeStorage();
  saveSignature(storage, first);
  deleteSavedSignature(storage);
  assert.equal(loadSavedSignature(storage), null);
});
test('Firma: datos dañados y almacenamiento restringido no rompen la aplicación', () => {
  const broken = makeStorage();
  broken.setItem(SIGNATURE_STORAGE_KEY, '{bad JSON');
  assert.equal(loadSavedSignature(broken), null);
  broken.setItem(SIGNATURE_STORAGE_KEY, JSON.stringify({ data: 'https://evil.example', ratio: 1 }));
  assert.equal(loadSavedSignature(broken), null);
  assert.equal(loadSavedSignature({getItem:()=>{throw new Error('blocked');}}), null);
  assert.throws(() => saveSignature({setItem:()=>{throw new Error('quota');}},first), /quota/);
});
test('Firma: rechaza imágenes extrañas y tamaños inválidos', () => {
  const storage = makeStorage();
  assert.throws(()=>saveSignature(storage,{data:'data:image/svg+xml;base64,AAAA',ratio:1}), /inválida/);
  assert.throws(()=>saveSignature(storage,{data:first.data,ratio:Infinity}), /inválida/);
});
