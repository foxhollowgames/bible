import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [app, content, scripture, hebrew] = await Promise.all([
  read('../dist/app.js'), read('../dist/data/books/isaiah-native-content.json').then(JSON.parse),
  read('../dist/data/books/isaiah-native-scripture.json').then(JSON.parse), read('Isa.xml'),
]);
const context = vm.createContext({data:content, state:{chapter:7}, esc:s=>s});
vm.runInContext(app.slice(app.indexOf('function eligibleWords('), app.indexOf('async function load(')), context);
function selected(chapter, verse, token) {
  context.state.chapter = chapter;
  return context.matchWord(token, context.eligibleWords({verse}));
}
for (const [verse, token] of [[1,'king,'],[6,'king'],[16,'kings'],[17,'king'],[20,'king']]) {
  assert.equal(selected(7,verse,token)?.strongId, 'H4428', `King must open in 7:${verse}`);
}
for (const token of ['sign.', 'virgin', 'Immanuel.']) assert(selected(7,14,token)?.greek, token);
assert.equal(selected(7,9,'believe,')?.strongId, 'H539');
assert.equal(selected(7,9,'established.')?.strongId, 'H539');
assert.equal(selected(36,1,'king').id, 'king', 'Keep the original passage note and guide ID');
assert.equal(selected(6,5,'King,').greek, '', 'Do not copy Greek from a different passage');
assert.equal(selected(9,2,'light;')?.strongId, 'H216', 'Use Hebrew 9:1 for English 9:2');
assert.equal(selected(64,1,'heavens,')?.strongId, 'H8064', 'English 64:1 is Hebrew 63:19b');
assert.equal(selected(64,2,'fire')?.strongId, 'H784', 'Use Hebrew 64:1 for English 64:2');
assert.equal(selected(7,1,'kingdom'), null, 'Do not match part of a word');
assert.equal(selected(7,14,'king'), null, 'Do not leak a match from another verse');

// Check the saved artifact against the Hebrew source, independent of the generator.
const verseLemmas = new Map([...hebrew.matchAll(/<verse osisID="([^"]+)"[^>]*>([\s\S]*?)<\/verse>/g)]
  .map(([,id,xml]) => [id,new Set([...xml.matchAll(/ lemma="([^"]+)"/g)]
    .flatMap(([,lemma]) => lemma.match(/\d+/g) || []))]));
let links = 0;
for (const word of content.words.filter(w => w.scope === 'dictionary')) {
  assert.equal(word.greek, '');
  assert(!word.sourceIds.some(id=>id.startsWith('lxx')));
  for (const verse of word.verses) {
    const ref = word.chapter === 9 ? (verse === 1 ? 'Isa.8.23' : `Isa.9.${verse-1}`)
      : word.chapter === 64 ? (verse === 1 ? 'Isa.63.19' : `Isa.64.${verse-1}`)
      : `Isa.${word.chapter}.${verse}`;
    assert(verseLemmas.get(ref)?.has(word.strongId.slice(1)), `${word.id} ${ref}`);
    const text = scripture.chapters[word.chapter].find(v=>v.verse===verse).text;
    assert(text.split(/\s+/).some(token=>selected(word.chapter,verse,token)?.id===word.id),
      `Entry must be reachable from the reading pane: ${word.id}:${verse}`);
    links++;
  }
}
for (let chapter=1; chapter<=66; chapter++) {
  assert(scripture.chapters[chapter].some(v=>v.text.split(/\s+/).some(token=>selected(chapter,v.verse,token))),
    `Chapter ${chapter} has no selectable words`);
}
console.log(`Word coverage passed: 66 chapters, ${links} dictionary associations, Isaiah 7 Greek, verse numbering, and original note priority.`);
