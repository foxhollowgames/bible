// Check the map layers that scripts/book_maps.py adds to every added book.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const config = await read('./book-map-context.json');
const directory = await read('../dist/data/books/directory.json');
const builtIn = new Set(['judah','philistia','egypt','cush','assyria','babylonia','persian']);
const words = text => (text.match(/[\w’'-]+/g) || []).length;
const short = (text, label) => {
  for (const sentence of text.split(/(?<=[.!?])(?:[”"’']\s+|\s+)/)) assert(words(sentence) <= 15, `${label}: long sentence: ${sentence}`);
};
const coordinate = ([lat, lng], label) => assert(Number.isFinite(lat) && Number.isFinite(lng) && lat >= 8 && lat <= 48 && lng >= 1 && lng <= 57, `${label}: point outside the map`);

// Authored notes: two short sentences at most for a nation, and a real limit for each shape.
for (const [id, region] of Object.entries(config.regions)) {
  for (const key of ['name','faction','pattern','summary','uncertainty']) assert(region[key], `Region ${id} needs ${key}`);
  assert(builtIn.has(region.faction) || config.factions[region.faction], `Region ${id} has no color for ${region.faction}`);
  assert(region.points || region.isaiahRegion || region.atlas, `Region ${id} needs a shape`);
  new RegExp(region.pattern, 'i');
  short(region.summary, `Region ${id}`); short(region.uncertainty, `Region ${id}`);
  assert(!/shaded area|the map shows/i.test(region.summary), `Region ${id} must describe the land, not the drawing`);
}
for (const [era, notes] of Object.entries(config.eras)) for (const [id, text] of Object.entries(notes)) {
  assert(config.regions[id], `Era ${era} names unknown region ${id}`); short(text, `Era ${era} ${id}`);
}
for (const road of config.roads) for (const key of ['summary','detail','uncertainty']) short(road[key], `Road ${road.id}`);
const reviewed = new Set(config.wikipedia.map(row => row[0]));
assert.equal(reviewed.size, config.wikipedia.length, 'Each encyclopedia article is listed once');
for (const [id, article, revision, summary] of config.wikipedia) { assert(/^\d+$/.test(revision), `${id} needs a reviewed revision`); assert(article && summary); short(summary, id); }

let books = 0, regions = 0, roads = 0, areas = 0;
for (const entry of directory) {
  if (entry.status !== 'ready' || entry.id === 'isaiah') continue;
  const data = await read(`../dist/data/books/${entry.id}-native-content.json`);
  const scripture = await read(`../dist/data/books/${entry.id}-native-scripture.json`);
  const app = await readFile(new URL(`../dist/book-${entry.id}-app.js`, import.meta.url), 'utf8');
  const sources = new Map(data.sources.map(source => [source.id, source]));
  assert.equal(sources.size, data.sources.length, `${entry.id}: duplicate source id`);
  const chapters = new Set(data.chapterMaps.map(item => item.chapter));
  const cfg = config.books[entry.id] || {};
  const label = `${entry.id}`;
  assert(app.includes('region.chapterCoverage.includes(state.chapter)'), `${label}: nations must follow the open chapter`);
  assert.equal(new Set(data.regions.map(r => r.id)).size, data.regions.length, `${label}: duplicate region id`);
  assert.equal(!!data.regions.length, !!cfg.nations, `${label}: nations must match the map file`);
  assert.equal(!!data.ancientRoads.length, !!cfg.roads, `${label}: roads must match the map file`);
  for (const region of data.regions) {
    assert(region.name && region.summary && region.detail && region.uncertainty && region.color && region.pattern, `${label}: region ${region.id} is missing text`);
    assert(region.summary !== region.detail, `${label}: region ${region.id} repeats its summary`);
    assert(region.points.length >= 3, `${label}: region ${region.id} needs a shape`); region.points.forEach(p => coordinate(p, `${label} ${region.id}`));
    assert(region.chapterCoverage.length && region.chapterCoverage.every(n => chapters.has(n)), `${label}: region ${region.id} has a chapter outside the book`);
    assert(builtIn.has(region.faction) || data.factions?.[region.faction], `${label}: region ${region.id} has no legend entry`);
    for (const id of region.sourceIds) assert(sources.has(id), `${label}: region ${region.id} cites missing source ${id}`);
    short(region.detail, `${label} ${region.id}`);
    // A note that names this book and a chapter must point inside the book.
    for (const [, n] of region.detail.matchAll(new RegExp(`${entry.name.replace(/^(\d) /, '(?:$1|First|Second) ')} (\\d+)`, 'g'))) assert(scripture.chapters[n], `${label}: region ${region.id} cites missing chapter ${n}`);
    regions++;
  }
  // Two notes for one land must not show in the same chapter.
  for (const chapter of chapters) {
    const shown = data.regions.filter(r => r.chapterCoverage.includes(chapter)).map(r => r.baseId);
    assert.equal(new Set(shown).size, shown.length, `${label} ${chapter}: one land has two notes`);
  }
  assert.equal(new Set(data.ancientRoads.map(r => r.id)).size, data.ancientRoads.length, `${label}: duplicate road id`);
  for (const road of data.ancientRoads) {
    assert(['strong','probable'].includes(road.confidence), `${label}: road ${road.id} needs a confidence level`);
    assert(road.title && road.summary && road.detail && road.uncertainty, `${label}: road ${road.id} is missing text`);
    assert(!/Isaiah|eighth-century|701 BCE/.test(road.summary + road.detail + road.uncertainty), `${label}: road ${road.id} keeps Isaiah-only wording`);
    assert(road.points.length >= 2); road.points.forEach(p => coordinate(p, `${label} ${road.id}`));
    for (const id of road.sourceIds) assert(sources.has(id), `${label}: road ${road.id} cites missing source ${id}`);
    roads++;
  }
  const places = new Map(data.places.map(place => [place.id, place]));
  for (const area of data.narrativeRegions) {
    assert(area.narrativeRegion && places.has(area.placeId) && area.summary && area.points.length >= 4, `${label}: area ${area.id} is incomplete`);
    assert(data.chapterMaps.some(item => item.placeIds.includes(area.placeId)), `${label}: area ${area.id} never shows`);
    assert(sources.has('geo'), `${label}: atlas source is missing`);
    areas++;
  }
  for (const id of reviewed) if (sources.has(id)) assert(sources.get(id).revisionUrl.endsWith(sources.get(id).revisionId), `${label}: ${id} must link to the reviewed revision`);
  if (data.regions.length || data.ancientRoads.length || data.narrativeRegions.length) books++;
}
// Chapter journeys: each line joins places the book names, and each new place has a checked point.
const journeys = await read('./book-journeys.json');
let paths = 0, stops = 0;
const kinds = ['journey','flight','diplomacy','military','exile','restoration'];
for (const [id, [name, lat, lng, article, revision, limit]] of Object.entries(journeys.gazetteer)) {
  assert(name && article && /^\d+$/.test(revision), `Gazetteer ${id} needs a reviewed article`); coordinate([lat, lng], `Gazetteer ${id}`);
  if (limit) short(limit, `Gazetteer ${id}`);
}
for (const [book, plan] of Object.entries(journeys.books)) {
  const entry = directory.find(item => item.id === book); assert(entry?.status === 'ready', `Journeys name unknown book ${book}`);
  const data = await read(`../dist/data/books/${book}-native-content.json`);
  const scripture = await read(`../dist/data/books/${book}-native-scripture.json`);
  const base = await read(`../dist/data/books/${book}.json`);
  const places = new Map(data.places.map(place => [place.id, place])), sources = new Set(data.sources.map(source => source.id));
  const own = new Set(base.places.map(place => place.id));
  const note = journeys.note.replace('{book}', entry.name); short(note, `${book} journey note`); short(journeys.uncertainty.replace('{book}', entry.name), `${book} journey limit`);
  const allText = Object.values(scripture.chapters).flat().map(verse => verse.text).join(' ');
  const used = new Set();
  for (const [chapter, routes] of Object.entries(plan.routes)) {
    const focus = data.chapterMaps.find(item => item.chapter === Number(chapter)), verses = scripture.chapters[chapter];
    assert(focus && verses, `${book}: no chapter ${chapter}`);
    if (!base.chapters.find(c => c.chapter === Number(chapter)).route.length) assert.equal(focus.note, note, `${book} ${chapter}: the map note must describe the lines`);
    assert.equal(new Set(routes.map(route => route[0])).size, routes.length, `${book} ${chapter}: duplicate route id`);
    for (const [rid, title, kind, stopList, span, summary, evidence] of routes) {
      const ids = stopList.split('>'), [first, last = first] = span.split('-').map(Number);
      const built = data.textRoutes.find(item => item.id === `${book}-${chapter}-${rid}`);
      assert(built && focus.routes.some(ref => ref.id === built.id), `${book} ${chapter}: route ${rid} was not built`);
      assert(title && evidence && kinds.includes(kind), `${book} ${chapter}: route ${rid} needs a title, evidence, and path style`);
      assert(verses.some(v => v.verse === first) && verses.some(v => v.verse === last) && first <= last, `${book} ${chapter}: route ${rid} cites a missing verse`);
      assert(ids.length >= 2 && built.points.length === ids.length, `${book} ${chapter}: route ${rid} needs two or more stops`);
      ids.forEach((id, i) => assert(id !== ids[i + 1], `${book} ${chapter}: route ${rid} repeats ${id}`));
      for (const id of ids) {
        assert(places.has(id) && focus.placeIds.includes(id), `${book} ${chapter}: route ${rid} uses unmapped place ${id}`);
        for (const sid of places.get(id).sourceIds) assert(sources.has(sid), `${book}: place ${id} cites missing source ${sid}`);
        if (own.has(id)) continue;
        used.add(id);
        // A new stop must be named in the chapter that draws it, or in the chapter beside it when the trip crosses a chapter break.
        const near = [-1, 0, 1].flatMap(step => scripture.chapters[Number(chapter) + step] || []);
        assert(near.some(v => v.text.includes(journeys.gazetteer[id][0])), `${book} ${chapter}: the chapter does not name ${journeys.gazetteer[id][0]}`);
      }
      short(summary, `${book} ${chapter} ${rid}`); paths++;
    }
  }
  for (const id of used) {
    const info = plan.places[id]; assert(info, `${book}: new place ${id} needs a note`);
    short(typeof info === 'string' ? info : info.summary, `${book} place ${id}`);
    assert(allText.includes(journeys.gazetteer[id][0]), `${book}: the text never names ${journeys.gazetteer[id][0]}`); stops++;
  }
  for (const id of Object.keys(plan.places)) assert(used.has(id), `${book}: place note ${id} is unused`);
}
console.log(`Book journeys passed: ${Object.keys(journeys.books).length} books, ${paths} chapter paths, ${stops} added stops.`);
for (const id of Object.keys(config.books)) assert(directory.some(entry => entry.id === id && entry.status === 'ready'), `Map file names unknown book ${id}`);
console.log(`Book maps passed: ${books} books, ${regions} nation notes, ${roads} road records, ${areas} atlas areas.`);
