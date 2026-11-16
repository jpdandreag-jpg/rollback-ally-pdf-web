import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

test('Official wordmark appears on both welcome screen and header', () => {
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.equal((html.match(/src="\.\/rollback-ally-logo\.png\?v=025"/g)||[]).length,2);
 assert.match(html,/welcome-logo-panel/);
 assert.match(html,/brand-logo-panel/);
 assert.doesNotMatch(html,/welcome-brand-name/,'Do not repeat the brand name under the wordmark');
});
test('Uploaded corporate logo retains the wordmark transparency, not flat color blocks', async () => {
 const bytes=readFileSync(new URL('../public/rollback-ally-logo.png',import.meta.url));
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 const img=sharp(bytes).ensureAlpha();
 const {data,info}=await img.raw().toBuffer({resolveWithObject:true});
 assert.equal(info.width,704); assert.equal(info.height,121);
 assert.equal(info.channels,4);
 let transparent=0,visibleNavy=0,visibleRed=0;
 for(let i=0;i<data.length;i+=4) {
  const [r,g,b,a]=data.subarray(i,i+4);
  if(a===0) transparent++;
  if(a>150&&r<65&&b<110) visibleNavy++;
  if(a>150&&r>150&&g<130&&b<130) visibleRed++;
 }
 const area=info.width*info.height;
 assert.ok(transparent>area*.35,'More than one third must be transparent around the letters');
 assert.ok(visibleNavy>3000,'The word rollback should be visible');
 assert.ok(visibleRed>1000,'The word ally should be visible');
});
test('Application installation icons remain untouched and independently configured',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const manifest=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
 assert.match(html,/href="\.\/icon\.svg"/);
 assert.match(html,/href="\.\/apple-touch-icon\.png"/);
 assert.equal(manifest.icons[0].src,'./icon-192.png');
 assert.equal(manifest.icons[1].src,'./icon-512.png');
});
