import test from 'node:test';
import assert from 'node:assert/strict';
import { exportFileName, safePosition } from '../src/utils.js';
test('Spanish names and uppercase PDF extensions', () => {
  assert.equal(exportFileName('Certificación Laboral.pdf'), 'Certificación Laboral_editado.pdf');
  assert.equal(exportFileName('CONTRATO.PDF'), 'CONTRATO_editado.pdf');
  assert.equal(exportFileName('reporte.v3.PdF'), 'reporte.v3_editado.pdf');
  assert.equal(exportFileName(' '), 'Documento_editado.pdf');
  assert.equal(exportFileName('carpeta/contrato.pdf'), 'carpeta_contrato_editado.pdf');
});
test('Positioning stays inside PDF page', () => {
  assert.equal(safePosition(-5), 0);
  assert.equal(safePosition(5), 0.98);
  assert.equal(safePosition(NaN), 0);
  assert.equal(safePosition(.42), .42);
});
