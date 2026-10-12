import assert from 'node:assert/strict';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join, extname} from 'node:path';

// Every master image needs the WebP copies that the pages request.
// Run `python scripts/optimize-images.py` to write missing copies.
const assets = 'dist/assets';
const copies = path => {
  const stem = path.slice(0, -extname(path).length);
  return path.startsWith(join(assets, 'portraits'))
    ? ['-192', '-480', ''].map(size => `${stem}${size}.webp`)
    : [`${stem}.webp`];
};
let masters = 0;
const missing = [];
const walk = folder => {
  for (const entry of readdirSync(folder, {withFileTypes:true})) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) { if (path !== join(assets, 'share')) walk(path); continue; }
    if (!/\.(png|jpe?g)$/i.test(entry.name)) continue;
    masters++;
    missing.push(...copies(path).filter(copy => !existsSync(copy)));
  }
};
walk(assets);
assert.equal(missing.length, 0, `${missing.length} WebP copies are missing, for example ${missing[0]}. Run python scripts/optimize-images.py.`);

const artwork = [...readFileSync('dist/books.js', 'utf8').match(/const bookArtwork=\{(.*?)\};/s)[1].matchAll(/:\s*"([^"]+)"/g)].map(match => match[1]);
const previews = readFileSync('dist/book-cover-placeholders.js', 'utf8');
for (const cover of artwork) assert(previews.includes(`"${cover}"`), `Directory cover ${cover} needs a preview. Run python scripts/optimize-images.py.`);
console.log(`Image check passed: ${masters} masters have WebP copies and ${artwork.length} directory covers have previews.`);
