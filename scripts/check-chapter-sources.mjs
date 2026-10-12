import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const app = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
const data = JSON.parse(await readFile(new URL('../dist/data/books/isaiah-native-content.json', import.meta.url), 'utf8'));
const context = vm.createContext({
  data, book: data.book, chapters: Array.from({length:data.book.chapterCount}, (_, i) => i + 1), scripture: JSON.parse(await readFile(new URL('../dist/data/books/isaiah-native-scripture.json', import.meta.url), 'utf8')), state: {chapter:36, perspective:'historical'},
  source: id => data.sources.find(s => s.id === id),
  esc: value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;'),
  linkedEntityHtml: value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;'),
  mapStoryHtml: () => '<details><summary>Movements &amp; evidence</summary></details>',
  sourceImageHtml: image => image ? `<img src="${image.src}">` : ''
});
for (const [start, end] of [
  ['function bookNamePattern(', 'function readSaved('],
  ['function passageFootnotes(', '// Render outside'],
  ['function mapDisplayText(', 'function sourceMediaHtml('],
  ['function sourceMediaHtml(', 'function openFeature('],
  ['function chapterSourceIds(', 'function openSource('],
  ['function passageContextHtml(', 'function passageInterpretationHtml(']
]) vm.runInContext(app.slice(app.indexOf(start), app.indexOf(end, app.indexOf(start))), context);

const ids = context.chapterSourceIds();
assert(ids.includes('lachish') && ids.includes('prism-taylor'));
assert(!ids.includes('opening-isaiah-hopkin'));
assert(!app.includes('function chapterSourcesHtml('));
assert(!ids.some(id => /^web(?:\d+)?$/.test(id)));
assert.equal(context.passageFootnotes({sourceIds:['web','lachish']})(['web']), '');
assert(context.passageFootnotes({sourceIds:['web','lachish']})(['lachish']).includes('Source 1:'));
assert.equal(context.passageFootnotes({chapter:2})(['web2']), '');
const passages = data.passages.filter(p => p.chapter === 36);
const first = context.passageFootnotes(passages[0])(['prism-taylor']);
const second = context.passageFootnotes(passages[1])(['prism-taylor']);
assert.equal(first, second, 'A source must retain its number throughout the chapter');
assert(first.includes('data-source-id="prism-taylor"') && first.includes('aria-haspopup="dialog"'));
assert(!first.includes('target="_blank"'), 'Footnotes must open source details in place');
context.state.perspective = 'lds';
for (let chapter = 1; chapter <= 66; chapter++) {
  context.state.chapter = chapter;
  const sources = context.chapterSourceIds();
  assert.equal(sources.includes('opening-isaiah-hopkin'), chapter === 2);
  assert.equal(sources.includes('opening-isaiah-madsen'), chapter === 6);
  assert.equal(sources.includes('madsen-poetry'), chapter === 1);
  assert.equal(sources.includes('madsen-understanding'), chapter === 30);
  assert(!sources.includes('opening-isaiah') && !sources.includes('opening-isaiah-sample'));
  assert.equal(context.passageContextHtml().includes('Try this reading.'), [1,2,6,30].includes(chapter));
  assert(!context.passageContextHtml().includes('Reading help.'));
}
assert(data.sources.some(s => s.id === 'opening-isaiah-sample'), 'Keep the sample in the source library');
assert(!app.includes('function chapterStudyNotesHtml('));
console.log('Chapter sources passed: stable numbering, local footnotes, translation citation exclusion, mode filters, and no generic harmony section.');

for (const perspective of ['historical', 'lds']) {
  context.state.perspective = perspective;
  for (let chapter = 1; chapter <= 66; chapter++) {
    context.state.chapter = chapter;
    const intro = context.passageContextHtml();
    assert.equal((intro.match(/<section/g) || []).length, 1);
    assert.equal((intro.match(/<h2/g) || []).length, 1);
    assert(!intro.includes('The wider story') && !intro.includes('See the Assyrian evidence'));
    assert(!intro.includes('The exact route is unknown'));
    assert.equal(intro.includes('<h3>LDS lens</h3>'), perspective === 'lds');
  }
}
context.state.chapter = 36;
context.state.perspective = 'historical';
const intro = context.passageContextHtml();
assert(intro.includes('701 BCE') && intro.includes('spoils of Lachish') && intro.includes('prism'));
assert(intro.includes('data-source-id="lachish"') && intro.includes('data-source-id="prism-taylor"'));
console.log('Chapter introductions passed: one section per chapter, evidence links, and mode-specific reading help.');

const campaign = data.events.find(item => item.id === 'western701');
const body = context.featureBodyHtml(campaign);
assert(body.includes('assets/taylor-prism.jpg') && body.includes('assets/lachish-relief.jpg'));
assert(body.includes('Himself, like a caged bird') && body.includes('printed page 33'));
assert(body.includes('separate Taylor Prism'));
const repeated = context.sourceMediaHtml(['prism-taylor', 'prism-taylor', 'missing']);
assert.equal((repeated.match(/<img /g) || []).length, 1);
assert.equal(context.sourceMediaHtml(['missing']), '');
assert(!context.sourceMediaHtml(['web2']).includes('caged bird'));
console.log('Study media passed: relevant images, quotation attribution, object distinction, duplicate and missing-source handling.');
for (const source of data.sources.filter(s=>s.id.startsWith('wiki-'))) {
  assert(source.revisionUrl.endsWith(`oldid=${source.revisionId}`),'Wikipedia review needs a fixed revision');
  assert(source.licenseUrl && source.reviewed && source.limitations);
}
assert(context.source('wiki-siloam').image.caption.includes('replica'));
const shared = context.sourceInsightsHtml(['wiki-levant','wiki-ekron']);
assert.equal((shared.match(/data-source-id="prism-luckenbill"/g)||[]).length,1,'Do not repeat the same supporting work');
const libnah = context.sourceInsightsHtml(['wiki-libnah']);
assert(!libnah.includes('representative location') && !libnah.includes('verified road'),'The footer owns general map caveats');
assert.equal(context.mapDisplayText('Useful fact. The line is not an exact road.'), 'Useful fact.');

assert.deepEqual(data.chapterStudies.map(s => s.chapter), Array.from({length:66}, (_, i) => i + 1));
assert.equal(data.studySourceReview.length, data.sources.length);
assert.equal(new Set(data.studySourceReview.map(s => s.sourceId)).size, data.sources.length);
for (const study of data.chapterStudies) {
  const verse = context.scripture.chapters[study.chapter].find(v => v.verse === study.verse);
  assert.equal(study.text, verse.text, `Exact text for chapter ${study.chapter}`);
  assert(study.context.length > 60 && context.source(study.sourceId));
  for (const mode of ['historical','lds']) {
    context.state.chapter = study.chapter;
    context.state.perspective = mode;
    const html = context.passageContextHtml();
    assert(html.includes(context.esc(study.text)), `Visible quotation: ${study.chapter}, ${mode}`);
    assert(html.includes(context.esc(study.context)), `Visible context: ${study.chapter}, ${mode}`);
    assert.equal(html.includes('Ann N. Madsen, interviewed by Kelsey Wilding'), mode === 'lds' && study.chapter === 6);
    assert.equal(html.includes('class="interview-insight"'), mode === 'lds' && [1,2,6,30].includes(study.chapter));
    assert.equal(html.includes('assets/cyrus-cylinder.jpg'), [44,45].includes(study.chapter));
  }
}
for (const item of data.sources.filter(s => s.excerpt)) {
  assert(item.excerpt.text.split(/\s+/).length <= 25);
  assert(item.excerpt.attribution && item.excerpt.url && item.excerpt.checked);
}
context.state.chapter = 15;
assert(context.sourceInsightsHtml(['cfm2026-39']).includes('not Isaiah 15'));
assert(!context.sourceInsightsHtml(['gc-2026-04-14yee']).includes('Ministering'));
context.state.chapter = 41;
assert(context.sourceInsightsHtml(['gc-2026-04-14yee']).includes('Ministering is truly loving'));
assert(context.sourceMediaHtml(['cfm2026-39']).includes('Babylon symbolizes') === false);
assert(context.sourceInsightsHtml(['gc-2025-10-55renlund'],61).includes('Luke'));
const place = {id:'test-ur',name:'Ur'};
context.data.places.push(place);
context.scripture.chapters[99] = [{verse:1,text:'Our people return.'}];
context.state.chapter = 99;
assert.equal(context.featureScriptureHtml(place), '', 'Short place names must match whole words');
context.data.places.pop();
delete context.scripture.chapters[99];
console.log('All-chapter enrichment passed: 66 exact quotations and notes, 132 mode renders, source audit, scope, attribution, and place matching.');
