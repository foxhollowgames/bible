import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(path, 'utf8');
const directory = JSON.parse(read('dist/data/books/directory.json'));
// These checks read each book's base record. A book without one has its own checks.
const books = directory.filter(book => book.status === 'ready' && existsSync(`dist/data/books/${book.id}.json`));
const app = read('dist/app.js');
const profileCode = read('dist/portraits.js');
const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
let portraits = 0, chapters = 0, contextNotes = 0, evidenceImages = 0;
const distinctParagraphs = new Set();
for (const book of books) {
  const raw = JSON.parse(read(`dist/data/books/${book.id}.json`));
  const data = JSON.parse(read(`dist/data/books/${book.id}-native-content.json`));
  const scripture = JSON.parse(read(`dist/data/books/${book.id}-native-scripture.json`));
  const authored = JSON.parse(read(`scripts/book-context-complete/${book.id}.json`));
  assert.equal(authored.length, raw.chapterCount, 'Persistent sources must cover every ready chapter');
  assert.equal(new Set(authored.map(row => row[0])).size, raw.chapterCount, 'Persistent sources must not repeat chapters');
  const profile = vm.createContext({document:{addEventListener:() => {}, querySelectorAll:() => []}});
  vm.runInContext(profileCode.replaceAll('export ', ''), profile);
  const art = JSON.parse(read(`dist/data/books/${book.id}-art.json`));
  profile.setPeople(JSON.parse(read(`dist/data/books/${book.id}-people.json`)), art);
  for (const person of raw.people) {
    const html = profile.portraitsHtml([person.id]);
    const detail = profile.personProfileHtml(person.id);
    assert(!html.includes('AI-generated illustration</small>'), `${book.id}/${person.id}: repeated AI credit`);
    assert(!detail.includes('profile-portrait-note'), `${book.id}/${person.id}: repeated appearance warning`);
    if (art[person.id]?.generated && art[person.id]?.src) {
      assert(html.includes('Generated illustration of '), 'Keep accessible artwork descriptions');
      assert(!html.includes('portrait-credit'), 'Generated images have no per-portrait credit');
    }
    if (art[person.id]?.sourceUrl) {
      assert(html.includes(esc(art[person.id].sourceUrl)), 'Keep licensed image source');
      assert(html.includes(esc(art[person.id].licenseUrl)), 'Keep licensed image rights');
    }
    portraits++;
  }
  // Exercise licensed credits even in books that currently contain only generated art.
  vm.runInContext(`bookArt.__licensed = {src:'sample.jpg', sourceUrl:'https://example.org/art', licenseUrl:'https://example.org/license', credit:'Artist', license:'CC BY'};
    people.__licensed = {name:'Sample', role:'Sample person'};`, profile);
  assert(profile.portraitsHtml(['__licensed']).includes('https://example.org/license'));
  profile.setPortraitMode('non-generated');
  for (const person of raw.people.filter(item => art[item.id]?.generated)) {
    const html = profile.portraitsHtml([person.id]);
    assert(html.includes('no portrait available'), 'Intentional artwork omissions are not load failures');
    assert(!html.includes('portrait failed to load'), 'Use an accurate unavailable-image description');
  }

  const context = vm.createContext({data, scripture, book:{chapterDigits:2, ...data.book}, chapters:Array.from({length:raw.chapterCount}, (_, i) => i + 1),
    state:{chapter:1, perspective:'historical'}, esc, URL,
    source:id => data.sources.find(item => item.id === id), mapDisplayName:text => text,
    mapDisplayText:text => text, linkedEntityHtml:esc, mapStoryHtml:() => '',
    chapterEvidenceHtml:() => '', chapterInterviewNotesHtml:() => '',
    sourceImageHtml:() => '', webpSourceHtml:() => ''});
  for (const name of ['bookNamePattern', 'publisherChapter', 'sourcesHtml', 'passageFootnotes', 'chapterSourceIds', 'sourceMediaHtml', 'sourceInsightsHtml',
    'scriptureCredit', 'scriptureExcerptHtml', 'placeVerseInChapter', 'sourceChapters', 'genericPlaceDescription',
    'featureChapterContext', 'passageContextHtml', 'librarySourceHtml', 'chapterContextHtml',
    'chapterEvidenceHtml', 'sourceImageHtml']) {
    const start = app.indexOf(`function ${name}(`);
    assert(start >= 0, `${book.id}: missing ${name}`);
    const next = app.indexOf('\nfunction ', start + 1);
    const comment = app.indexOf('\n// Render outside', start + 1);
    const end = comment > start && comment < next ? comment : next;
    vm.runInContext(app.slice(start, end), context);
  }
  for (const item of data.sources) {
    const html = context.librarySourceHtml(item);
    assert(!html.includes('[object Object]'), `${book.id}/${item.id}: unreadable source metadata`);
    if (typeof item.reviewed === 'object' && item.reviewed?.scope) {
      assert(html.includes(esc(item.reviewed.scope)), 'Show the exact review scope');
      assert(html.includes(esc(item.reviewed.date)), 'Show the review date');
    }
  }
  const code = raw.bibleCode || 'GEN';
  for (const chapter of raw.chapters) {
    context.state.chapter = chapter.chapter;
    assert(context.sourceChapters('web').includes(chapter.chapter), 'Whole-book text covers every chapter');
    const firstVerse = scripture.chapters[chapter.chapter][0];
    const quote = context.scriptureExcerptHtml(chapter.chapter, firstVerse.verse);
    const filename = `${code}${String(chapter.chapter).padStart(code === 'PSA' ? 3 : 2, '0')}.htm`;
    assert(quote.includes(filename), `${book.id} ${chapter.chapter}: wrong publisher filename`);
    assert(quote.includes(esc(firstVerse.text)), 'Quote must preserve the exact Scripture text');
    for (const perspective of ['historical', 'lds']) {
      context.state.perspective = perspective;
      const intro = context.passageContextHtml();
      assert.equal((intro.match(/chapter-introduction/g) || []).length, 1);
      assert(!intro.includes('What we checked'), 'Review process belongs in source details');
      assert(!intro.includes('AI-generated illustration'), 'No portrait disclaimer in chapter introductions');
      assert.equal(intro.includes('<h3>LDS lens</h3>'), perspective === 'lds');
      if (chapter.contextNote) {
        assert(intro.includes(esc(chapter.contextNote.text)), 'Show the actual contextual explanation in both perspectives');
        const study = data.chapterStudies.find(item => item.chapter === chapter.chapter);
        const verse = scripture.chapters[chapter.chapter].find(item => item.verse === study.verse);
        assert(intro.includes(esc(verse.text)), 'Context must preserve its selected exact Scripture anchor');
        for (const id of chapter.contextNote.evidenceSourceIds) {
          const object = data.sources.find(item => item.id === id);
          assert(intro.includes(`src="${esc(object.image.src)}"`), 'Render the relevant artifact photograph');
          assert(intro.includes(esc(object.previewText)), 'Show the evidence explanation and limits beside its photograph');
        }
      }
      assert(!context.sourcesHtml(chapter.sourceIds).includes('data-source-id'), 'Source lists stay compact');
    }
    for (const place of data.places) {
      if (!context.placeVerseInChapter(place, chapter.chapter)) continue;
      assert(context.featureChapterContext(place).sourceIds.includes('web'), 'Named places retain Scripture attribution');
    }
    chapters++;
    if (chapter.contextNote) {
      contextNotes++;
      const row = authored.find(item => item[0] === chapter.chapter);
      assert(row, 'Generated chapter must have a persistent authored source');
      assert.equal(chapter.contextNote.text, row[3], 'Build must preserve the reviewed contextual paragraph');
      assert.equal(chapter.contextNote.title, row[2], 'Build must preserve its contextual heading');
      assert.equal(chapter.meaning, row[3], 'Do not restore the former generic moral');
      assert(!distinctParagraphs.has(row[3]), 'Do not reuse one contextual paragraph across chapters');
      distinctParagraphs.add(row[3]);
      assert.equal(data.chapterStudies.find(item => item.chapter === chapter.chapter).verse, row[1], 'Build must preserve the meaningful verse selection');
      assert.deepEqual(chapter.contextNote.evidenceSourceIds, row.slice(4), 'Preserve the exact artifact scope');
      const sentences = chapter.contextNote.text.split(/(?<=[.!?][”’"')]?)\s+/);
      assert(sentences.length >= 3 && sentences.length <= 7, 'Context uses connected paragraphs with sufficient explanation');
      assert.notEqual(chapter.contextNote.text, chapter.summary + ' ' + chapter.meaning, 'Add context rather than duplicate the recap');
      for (const sentence of sentences) {
        assert(sentence.split(/\s+/).length <= 15, `${book.id}: context sentences stay readable`);
      }
    }
  }
  assert.equal(data.chapterStudies.length, raw.chapterCount, 'Every chapter needs its own exact Scripture anchor');
  assert(raw.chapters.every(chapter => chapter.contextNote), 'Every chapter needs contextual interpretation');
  assert(new Set(data.chapterStudies.map(item => item.chapter)).size === raw.chapterCount, 'One distinct close reading per chapter');
  assert(data.guides[0].steps.length >= Math.min(2, raw.chapterCount) && data.guides[0].steps.length <= 5, 'Keep curated guides short enough to use');
  for (const step of data.guides[0].steps) {
    const note = raw.chapters[step.chapter - 1].contextNote;
    assert.deepEqual(step.sourceIds, [...note.sourceIds, ...note.evidenceSourceIds], 'Guide steps retain their relevant image sources');
    assert.equal(step.text, note.text, 'Guides present contextual explanations');
  }
  for (const object of data.sources.filter(item => item.image)) {
    assert(readFileSync(`dist/${object.image.src}`).length > 1000, 'Ship real local image assets');
    assert(object.image.width > 0 && object.image.height > 0, 'Use actual photograph dimensions');
    assert(object.image.licenseUrl && object.image.sourceUrl, 'Preserve rights and object identity');
    const coverage = object.imageChapters || object.chapterCoverage;
    for (const chapter of coverage) {
      assert(context.sourceMediaHtml([object.id], {chapter}).includes('<img'), 'Relevant chapters show their object');
    }
    const unrelated = raw.chapters.find(c => !coverage.includes(c.chapter));
    if (unrelated) assert(!context.sourceMediaHtml([object.id], {chapter:unrelated.chapter}).includes('<img'), 'Do not show unrelated artifact photographs');
    assert(context.sourceMediaHtml([object.id], {chapter:1, allExcerpts:true}).includes('<img'), 'Source details still show the actual object outside its chapter scope');
    evidenceImages++;
  }
  assert(data.book.mapLimits, 'Keep location limits beside map context');
}
assert(app.includes('.filter(([key]) =>'), 'Do not offer empty layer controls');
assert(app.includes('This ${unit()} has no mapped places.'), 'Describe empty map information');
assert(app.includes('[focus.narrative, focus.limits]'), 'Keep location limits beside map context');
assert(app.includes('function librarySourceHtml('), 'Keep full source details available');
assert(app.includes('We do not know how these people looked.'), 'Keep the shared footer artwork note');
console.log(`Book presentation passed: ${books.length} books, ${chapters} chapters, ${portraits} portraits, ${contextNotes} contextual readings, ${evidenceImages} scoped image records, exact quotations, and licensed credits.`);
