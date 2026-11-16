import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('The welcome and header display the supplied corporate logo', () => {
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.equal((html.match(/src="\.\/rollback-ally-logo\.png"/g)||[]).length,2);
 assert.match(html,/welcome-logo-panel/);
 assert.match(html,/brand-logo-panel/);
});
test('Logo is a valid and complete 704x121 PNG; installed app icons stay independent', () => {
 const bytes=readFileSync(new URL('../public/rollback-ally-logo.png',import.meta.url));
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(bytes.readUInt32BE(16),704);
 assert.equal(bytes.readUInt32BE(20),121);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const manifest=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
 assert.match(html,/href="\.\/icon\.svg"/);
 assert.match(html,/href="\.\/apple-touch-icon\.png"/);
 assert.equal(manifest.icons[0].src,'./icon-192.png');
 assert.equal(manifest.icons[1].src,'./icon-512.png');
});
