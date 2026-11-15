import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import sharp from 'sharp';
const output = new URL('../dist/', import.meta.url).pathname;
const logo = readFileSync(join(output, 'icon.svg'));
for (const size of [192, 512, 180]) {
  const name = size === 180 ? 'apple-touch-icon.png' : 'icon-' + size + '.png';
  await sharp(logo).resize(size, size).png().toFile(join(output, name));
}
function recurse(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap(item => {
    const path = join(folder, item.name);
    return item.isDirectory() ? recurse(path) : [path];
  });
}
const files = recurse(output)
  .filter(file => !file.endsWith('/sw.js'))
  .map(file => './' + relative(output, file).replaceAll('\\', '/'));
const serviceWorker = join(output, 'sw.js');
const old = readFileSync(serviceWorker, 'utf8');
if (!old.includes('__PRECACHE__')) throw new Error('Service worker template is missing');
writeFileSync(serviceWorker, old.replace('__PRECACHE__', JSON.stringify(files)));
console.log('Rollback Ally PDF PWA: ' + files.length + ' static files precached');
