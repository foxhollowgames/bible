// Check added-book word entries against the Hebrew and Greek sources, independent of the generator.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const json = path => read(path).then(JSON.parse);
const osis = {genesis:'Gen',exodus:'Exod',leviticus:'Lev',numbers:'Num',deuteronomy:'Deut',joshua:'Josh',judges:'Judg',ruth:'Ruth','1-samuel':'1Sam','2-samuel':'2Sam','1-kings':'1Kgs','2-kings':'2Kgs','1-chronicles':'1Chr','2-chronicles':'2Chr',ezra:'Ezra',nehemiah:'Neh',esther:'Esth',job:'Job',psalms:'Ps',proverbs:'Prov',ecclesiastes:'Eccl','song-of-solomon':'Song',jeremiah:'Jer',lamentations:'Lam',ezekiel:'Ezek',daniel:'Dan',hosea:'Hos',joel:'Joel',amos:'Amos',obadiah:'Obad',jonah:'Jonah',micah:'Mic',nahum:'Nah',habakkuk:'Hab',zephaniah:'Zeph',haggai:'Hag',zechariah:'Zech',malachi:'Mal'};
const byz = {matthew:'MAT',mark:'MAR',luke:'LUK',john:'JOH',acts:'ACT',romans:'ROM','1-corinthians':'1CO','2-corinthians':'2CO',galatians:'GAL',ephesians:'EPH',philippians:'PHP',colossians:'COL','1-thessalonians':'1TH','2-thessalonians':'2TH','1-timothy':'1TI','2-timothy':'2TI',titus:'TIT',philemon:'PHM',hebrews:'HEB',james:'JAM','1-peter':'1PE','2-peter':'2PE','1-john':'1JO','2-john':'2JO','3-john':'3JO',jude:'JUD',revelation:'REV'};

const [verseMap, hebrewLexicon, greekLexicon, directory] = await Promise.all([
  read('lexicon-sources/oshb/VerseMap.xml'), read('hebrew-strong.xml'), read('lexicon-sources/strongsgreek.xml'), json('../dist/data/books/directory.json'),
]);
// English reference -> Hebrew references. Unlisted verses keep their number.
const englishToHebrew = new Map();
for (const [, wlc, kjv] of verseMap.matchAll(/<verse wlc="([^"!]+)[^"]*" kjv="([^"!]+)[^"]*"/g)) {
  englishToHebrew.set(kjv, [...(englishToHebrew.get(kjv) || []), wlc]);
}
const hebrewHead = new Map([...hebrewLexicon.matchAll(/<div type="entry" n="(\d+)">\s*<w [^>]*?lemma="([^"]+)"/g)].map(([, n, lemma]) => [Number(n), lemma]));
const greekHead = new Map([...greekLexicon.matchAll(/<entry strongs="(\d+)">[\s\S]*?<greek [^>]*?unicode="([^"]+)"/g)].map(([, n, lemma]) => [Number(n), lemma]));
assert(hebrewHead.size > 8000 && greekHead.size > 5000, 'Dictionaries did not load');

let books = 0, entries = 0, links = 0, names = 0;
for (const { id, status } of directory) {
  if (status !== 'ready') continue;
  const [content, scripture] = await Promise.all([json(`../dist/data/books/${id}-native-content.json`), json(`../dist/data/books/${id}-native-scripture.json`)]);
  // A book with curated word studies has its own check: check-word-coverage.mjs.
  if (content.book.verseLinks !== 'entities') continue;
  const sources = new Set(content.sources.map(s => s.id));
  const ids = new Set(content.words.map(w => w.id));
  assert.equal(ids.size, content.words.length, `${id}: duplicate word IDs`);
  let lemmas = () => null;
  if (osis[id]) {
    const xml = await read(`lexicon-sources/oshb/${osis[id]}.xml`);
    const verses = new Map([...xml.matchAll(/<verse osisID="([^"]+)"[^>]*>([\s\S]*?)<\/verse>/g)]
      .map(([, ref, body]) => [ref, new Set([...body.matchAll(/ lemma="([^"]+)"/g)].flatMap(([, lemma]) => lemma.match(/\d+/g) || []).map(Number))]));
    lemmas = (chapter, verse) => {
      const english = `${osis[id]}.${chapter}.${verse}`;
      return new Set((englishToHebrew.get(english) || [english]).flatMap(ref => [...(verses.get(ref) || [])]));
    };
  } else if (byz[id]) {
    const rows = new Map((await read(`lexicon-sources/byz/${byz[id]}.csv`)).split(/\r?\n/).slice(1).filter(Boolean).map(line => {
      const [chapter, verse, ...text] = line.split(',');
      return [`${chapter}.${verse}`, new Set((text.join(',').replace(/\{[^}]*\}/g, '').match(/\b\d+\b/g) || []).map(Number))];
    }));
    lemmas = (chapter, verse) => rows.get(`${chapter}.${verse}`) || new Set();
  }
  for (const word of content.words) {
    assert.equal(word.scope, 'glossary');
    word.sourceIds.forEach(sid => assert(sources.has(sid), `${word.id}: missing source ${sid}`));
    if (word.chapter == null) { assert(!word.hebrew && !word.greek, `${word.id}: a plain entry cannot have a language form`); continue; }
    entries++;
    const number = Number(word.strongId.slice(1));
    if (osis[id]) {
      assert.equal(word.strongId[0], 'H'); assert.equal(word.hebrew, hebrewHead.get(number), word.id);
      assert(word.transliteration && !word.greek, word.id);
    } else {
      assert.equal(word.strongId[0], 'G'); assert.equal(word.greek, greekHead.get(number), word.id);
      assert(word.greekTransliteration && !word.hebrew, word.id);
    }
    assert.equal(word.matches.length, 1);
    const form = new RegExp(`(?<![\\p{L}\\p{N}])${word.matches[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu');
    for (const verse of word.verses) {
      const text = scripture.chapters[word.chapter].find(v => v.verse === verse)?.text || '';
      assert(form.test(text), `${word.id}: “${word.matches[0]}” is not in ${id} ${word.chapter}:${verse}`);
      assert(lemmas(word.chapter, verse).has(number), `${word.id}: ${word.strongId} is not in ${id} ${word.chapter}:${verse}`);
      const rivals = content.words.filter(other => other !== word && other.chapter === word.chapter && other.matches[0].toLowerCase() === word.matches[0].toLowerCase() && other.verses.includes(verse));
      assert.equal(rivals.length, 0, `${word.id}: two entries claim ${word.chapter}:${verse}`);
      links++;
    }
  }
  // Names of people and places: the name and the dictionary form must share the recorded verse.
  const { people } = await json(`../dist/data/books/${id}-people.json`);
  for (const item of [...Object.values(people), ...content.places]) {
    const word = item.word;
    if (!word) continue;
    const number = Number(word.strongId.slice(1)), [chapter, verse] = word.example;
    word.sourceIds.forEach(sid => assert(sources.has(sid), `${item.name}: missing source ${sid}`));
    if (osis[id]) { assert.equal(word.hebrew, hebrewHead.get(number), item.name); assert(word.transliteration && !word.greek, item.name); }
    else { assert.equal(word.greek, greekHead.get(number), item.name); assert(word.greekTransliteration && !word.hebrew, item.name); }
    assert(item.name.toLowerCase().includes(word.key.toLowerCase()), `${item.name}: “${word.key}” is not in the name`);
    const text = scripture.chapters[chapter].find(v => v.verse === verse)?.text || '';
    assert(new RegExp(`(?<![\\p{L}\\p{N}-])${word.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[ -]/g, '[ -]')}(?![\\p{L}\\p{N}-])`, 'iu').test(text), `${item.name}: “${word.key}” is not in ${id} ${chapter}:${verse}`);
    assert(lemmas(chapter, verse).has(number), `${item.name}: ${word.strongId} is not in ${id} ${chapter}:${verse}`);
    names++;
  }
  books++;
}
assert(links > 3000, 'Too few checked word links');
assert(names > 1500, 'Too few checked names');
console.log(`Book word checks passed: ${books} books, ${entries} entries, ${links} verse links, and ${names} names checked against the Hebrew and Greek sources.`);
