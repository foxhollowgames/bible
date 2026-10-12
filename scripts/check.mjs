import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = resolve(root, 'dist');
const errors = [];
const fail = (message) => errors.push(message);
const assert = (condition, message) => { if (!condition) fail(message); };
const readJson = async (relative) => JSON.parse(await readFile(resolve(dist, relative), 'utf8'));
const chapterSet = new Set(Array.from({ length: 66 }, (_, i) => i + 1));

function ids(items, name) {
  const index = new Map();
  for (const item of items) {
    assert(typeof item.id === 'string' && item.id.trim(), `${name} has an item without an id`);
    if (index.has(item.id)) fail(`Duplicate ${name} id: ${item.id}`);
    index.set(item.id, item);
  }
  return index;
}

function reference(list, index, description) {
  for (const id of list || []) assert(index.has(id), `${description} references missing id: ${id}`);
}

function coordinate([lat, lng], description) {
  assert(Number.isFinite(lat) && lat >= -90 && lat <= 90, `${description} has invalid latitude`);
  assert(Number.isFinite(lng) && lng >= -180 && lng <= 180, `${description} has invalid longitude`);
}

function checkChapterVerse(chapter, verse, description, scripture) {
  assert(chapterSet.has(Number(chapter)), `${description} has a chapter outside Isaiah 1–66: ${chapter}`);
  const verses = scripture.chapters?.[chapter] || [];
  assert(Number.isInteger(Number(verse)) && Number(verse) >= 1 && Number(verse) <= verses.length, `${description} has an invalid verse: ${chapter}:${verse}`);
}

function normalized(value) {
  return String(value).normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
}

async function main() {
  const [content, scripture, relief] = await Promise.all([
    readJson('data/books/isaiah-native-content.json'), readJson('data/books/isaiah-native-scripture.json'), readJson('data/relief.json'),
  ]);
  const [appSource, styleSource, indexSource] = await Promise.all([
    readFile(resolve(dist, 'app.js'), 'utf8'),
    readFile(resolve(dist, 'styles.css'), 'utf8'),
    readFile(resolve(dist, 'book.html'), 'utf8'),
  ]);
  assert(!/feature-uncertainty|<strong>Map limit\./.test(appSource), 'Map features must use the shared footer disclaimer instead of dedicated disclaimer panels');
  assert(appSource.includes("visibleAt(region) && (datedMap() || !region.chapterCoverage || region.chapterCoverage.includes(state.chapter))"), 'The Nations toggle must show added regional powers only in relevant chapters');
  assert(appSource.includes("color:'#e1d6b8',weight:active ? 4 : 2.25"), 'Road selection must thicken the parchment road color without changing its hue');
  assert(styleSource.includes('path.ancient-road-hit:focus-visible{stroke:#e1d6b8;stroke-width:18;stroke-opacity:.08}'), 'Keyboard focus must not restore the blue road style');
  assert(appSource.includes("weight:f.properties.rank <= 5 ? 3.2 : 2.2, opacity:1"), 'Rivers must remain visible beneath political overlays');
  assert(appSource.includes('function ensureLayerOptions()') && appSource.includes("fetch(`${p}?v=${releaseVersion}`)"), 'Startup must recover the layer controls and version its data requests');
  assert(indexSource.includes('styles.css?v=20261012.2') && indexSource.includes("native-book.js?v=20261012.2") && appSource.includes("const releaseVersion = '20261012.2';"), 'The page must request one version of its release assets');
  assert(indexSource.includes('<title>Bible Wayfinder</title>') && indexSource.includes('<b id="bookBrand">BIBLE<small>WAYFINDER</small></b>') && !indexSource.includes('Isaiah') && !appSource.includes('Isaiah'), 'The shared reader must take the book name from its data');
  assert(content.book?.id === 'isaiah' && content.book.name === 'Isaiah' && content.book.chapterCount === 66 && content.book.bibleCode === 'ISA', 'The content must name its book for the shared reader');
  assert(!indexSource.includes('Meridian') && !appSource.includes('Meridian application'), 'The retired brand must not appear in the user interface');
  assert(appSource.includes('aria-label="${esc(book.name)} chapter ${c}"') && appSource.includes('<span>${c}</span><span class="chapter-picker-check"'), 'Chapter-picker options must show numbers only while retaining descriptive labels');
  assert(!appSource.includes('<span>${esc(book.name)} ${c}</span>'), 'Chapter-picker options must not repeat the book name');
  const dateBand = (from, to) => content.chapterDateBands?.find(band => band.from === from && band.to === to)?.label;
  assert(appSource.includes('function chapterDateLabel(') && dateBand(40, 55) === '~550 - 539 BCE' && dateBand(56, 66) === '~539 - 450 BCE', 'Chapter headings must distinguish First, Second, and Third Isaiah date ranges');
  assert(dateBand(20, 20) === '~711 BCE' && dateBand(36, 36) === '~701 BCE', 'Historically anchored chapters must use narrower date labels');
  assert(!appSource.includes('chapterDateTooltip') && !appSource.includes('We do not know when this chapter was written.'), 'Chapter dates must not use the retired uncertainty tooltip');
  for (const key of ['sources', 'passages', 'events', 'places', 'campaigns', 'ancientRoads', 'regions', 'words', 'guides', 'periods']) {
    assert(Array.isArray(content[key]), `content.json.${key} must be an array`);
  }

  const sourceById = ids(content.sources, 'source');
  assert(sourceById.get('strong')?.url === 'https://github.com/openscriptures/strongs', 'The Strong dictionary must link to its readable project overview');
  assert(sourceById.get('oshb')?.url === 'https://hb.openscriptures.org/', 'The Hebrew Bible must link to its readable project overview');
  const placeById = ids(content.places, 'place');
  ids(content.passages, 'passage'); ids(content.events, 'event'); ids(content.campaigns, 'campaign'); const roadById = ids(content.ancientRoads, 'ancient road'); ids(content.regions, 'region'); ids(content.words, 'word'); ids(content.guides, 'guide'); ids(content.periods, 'period');

  for (const source of content.sources) {
    if (source.image) {
      const image = source.image;
      assert(image.alt && image.caption && image.credit && image.license, `Source ${source.id} image needs alternative text and attribution`);
      assert(image.width > 0 && image.height > 0, `Source ${source.id} image needs dimensions`);
      assert(/^assets\/[a-z0-9-]+\.jpg$/.test(image.src), `Source ${source.id} image must use a local asset`);
      for (const key of ['fullUrl', 'creditUrl', 'sourceUrl', 'licenseUrl']) {
        try { assert(new URL(image[key]).protocol === 'https:', `Source ${source.id} image needs a valid ${key}`); }
        catch { fail(`Source ${source.id} image has an invalid ${key}`); }
      }
      try { assert((await stat(resolve(dist, image.src))).size > 0, `Source ${source.id} image is empty`); }
      catch { fail(`Source ${source.id} image is missing`); }
    }
    for (const ref of source.scriptureReferences || []) {
      assert(ref.label && ref.location && ref.kind, `Source ${source.id} has an incomplete scripture reference`);
      for (const link of [ref.url, ref.contextUrl]) {
        try { assert(new URL(link).protocol === 'https:', `Source ${source.id} has an invalid reference URL`); }
        catch { fail(`Source ${source.id} has an invalid reference URL`); }
      }
    }
    reference(source.citedSourceIds, sourceById, `Source ${source.id}`);
    for (const moment of source.timestamps || []) {
      assert(Number.isInteger(moment.seconds) && moment.seconds >= 0 && moment.label, `Source ${source.id} has an invalid timestamp`);
    }
    assert(source.title && source.type && source.url && source.summary && source.limitations && source.license, `Source ${source.id} is missing required citation information`);
    try { assert(/^https?:$/.test(new URL(source.url).protocol), `Source ${source.id} must use an http(s) URL`); } catch { fail(`Source ${source.id} has an invalid URL`); }
  }

  assert(scripture.translation && scripture.copyright && scripture.source, 'scripture.json must identify its translation, copyright, and source');
  const chapterKeys = Object.keys(scripture.chapters || {}).map(Number).sort((a, b) => a - b);
  assert(JSON.stringify(chapterKeys) === JSON.stringify([...chapterSet]), 'scripture.json must contain exactly Isaiah 1–66');
  let verseCount = 0;
  for (const chapter of chapterSet) {
    const verses = scripture.chapters?.[chapter];
    assert(Array.isArray(verses) && verses.length > 0, `Isaiah ${chapter} has no reading text`);
    verses?.forEach((verse, i) => {
      assert(verse.verse === i + 1, `Isaiah ${chapter} verse numbering is not sequential at item ${i + 1}`);
      assert(typeof verse.text === 'string' && verse.text.trim(), `Isaiah ${chapter}:${i + 1} has empty text`);
    });
    verseCount += verses?.length || 0;
  }
  assert(verseCount === 1292, `Isaiah must contain 1292 verses; found ${verseCount}`);
  for (const chapter of chapterSet) {
    const entries = content.passages.filter(p => p.chapter === chapter);
    for (const verse of scripture.chapters[chapter] || []) {
      assert(entries.filter(p => p.start <= verse.verse && p.end >= verse.verse).length === 1, `Isaiah ${chapter}:${verse.verse} must have exactly one passage note`);
    }
  }

  for (const passage of content.passages) {
    assert(chapterSet.has(Number(passage.chapter)), `Passage ${passage.id} has an invalid chapter`);
    assert(Number.isInteger(passage.start) && Number.isInteger(passage.end) && passage.start <= passage.end, `Passage ${passage.id} has an invalid verse interval`);
    checkChapterVerse(passage.chapter, passage.start, `Passage ${passage.id}`, scripture);
    checkChapterVerse(passage.chapter, passage.end, `Passage ${passage.id}`, scripture);
    assert(passage.year === null || Number.isInteger(passage.year) && passage.year >= -780 && passage.year <= -539, `Passage ${passage.id} has an invalid date`);
    assert(passage.title && passage.summary && passage.dateLabel && typeof passage.uncertainty === 'string' && (passage.year === null || passage.uncertainty.trim()), `Passage ${passage.id} is missing contextual display text`);
    reference(passage.sourceIds, sourceById, `Passage ${passage.id}`);
    reference(passage.placeIds, placeById, `Passage ${passage.id}`);
    for (const note of passage.studyNotes || []) {
      assert(note.title && note.text, `Passage ${passage.id} has an incomplete study note`);
      assert(['historical', 'lds'].includes(note.perspective), `Passage ${passage.id} has an invalid study-note perspective`);
      reference(note.sourceIds, sourceById, `Passage ${passage.id} study note`);
    }
    if (passage.lds) { assert(passage.lds.text, `Passage ${passage.id} LDS entry has no text`); reference(passage.lds.sourceIds, sourceById, `Passage ${passage.id} LDS entry`); }
  }

  for (const event of content.events) {
    assert(Number.isInteger(event.year) && event.year >= -780 && event.year <= -539, `Event ${event.id} has a year outside the study timeline`);
    assert(event.title && event.summary && event.dateLabel && event.uncertainty, `Event ${event.id} is missing display text`);
    reference(event.sourceIds, sourceById, `Event ${event.id}`); reference(event.placeIds, placeById, `Event ${event.id}`);
    checkChapterVerse(event.chapter, event.verse, `Event ${event.id}`, scripture);
  }

  for (const place of content.places) {
    assert(place.name && place.summary, `Place ${place.id} is missing a name or summary`);
    coordinate([place.lat, place.lng], `Place ${place.id}`);
    reference(place.sourceIds, sourceById, `Place ${place.id}`);
    checkChapterVerse(place.chapter, place.verse, `Place ${place.id}`, scripture);
  }

  for (const campaign of content.campaigns) {
    assert(['judah', 'assyria', 'babylonia', 'persian'].includes(campaign.faction), `Campaign ${campaign.id} needs a known faction for its route color`);
    assert(campaign.title && campaign.summary && campaign.detail && campaign.dateLabel, `Campaign ${campaign.id} is missing display text`);
    assert(Number.isInteger(campaign.start) && Number.isInteger(campaign.end) && campaign.start <= campaign.end, `Campaign ${campaign.id} has an invalid date range`);
    assert(campaign.start >= -780 && campaign.end <= -539, `Campaign ${campaign.id} lies outside the study timeline`);
    assert(Array.isArray(campaign.points) && campaign.points.length >= 2, `Campaign ${campaign.id} must have at least two route points`);
    campaign.points?.forEach((point, i) => coordinate(point, `Campaign ${campaign.id} point ${i + 1}`));
    reference(campaign.sourceIds, sourceById, `Campaign ${campaign.id}`); checkChapterVerse(campaign.chapter, campaign.verse, `Campaign ${campaign.id}`, scripture);
  }

  for (const road of content.ancientRoads) {
    assert(['strong', 'probable'].includes(road.confidence), `Ancient road ${road.id} needs a supported confidence level`);
    assert(road.title && road.summary && road.detail && road.uncertainty, `Ancient road ${road.id} is missing display text`);
    assert(Array.isArray(road.points) && road.points.length >= 2, `Ancient road ${road.id} must have at least two corridor points`);
    road.points?.forEach((point, i) => coordinate(point, `Ancient road ${road.id} point ${i + 1}`));
    reference(road.sourceIds, sourceById, `Ancient road ${road.id}`);
  }
  for (const id of ['road-syrian-inland', 'road-aleppo-euphrates', 'road-assyrian-kings-road', 'road-assyrian-tigris', 'road-arbela-babylonia']) {
    assert(roadById.has(id), `Regional road coverage is missing ${id}`);
  }
  const roadPoints = content.ancientRoads.flatMap(road => road.points);
  assert(Math.max(...roadPoints.map(([, lng]) => lng)) >= 44, 'Road coverage must extend east through Assyria toward Babylonia');
  assert(Math.max(...roadPoints.map(([lat]) => lat)) >= 37, 'Road coverage must extend north through the upper Mesopotamian corridor');

  for (const region of content.regions) {
    assert(region.name && region.summary && region.color, `Region ${region.id} is missing display text or color`);
    assert(Number.isInteger(region.start) && Number.isInteger(region.end) && region.start <= region.end, `Region ${region.id} has an invalid date range`);
    assert(Array.isArray(region.points) && region.points.length >= 3, `Region ${region.id} must have at least three boundary points`);
    region.points?.forEach((point, i) => coordinate(point, `Region ${region.id} point ${i + 1}`)); reference(region.sourceIds, sourceById, `Region ${region.id}`);
    for (const chapter of region.chapterCoverage || []) assert(chapterSet.has(chapter), `Region ${region.id} has invalid chapter coverage: ${chapter}`);
  }
  for (const id of ['philistia', 'egypt-region', 'cush-region']) {
    const region = content.regions.find(item => item.id === id);
    assert(region?.chapterCoverage?.length, `Regional power ${id} must exist and identify relevant chapters`);
    assert(region?.detail, `Regional power ${id} needs Isaiah-specific context`);
  }

  for (const word of content.words) {
    assert(word.label && Array.isArray(word.matches) && word.matches.length, `Word ${word.id} needs a label and one or more English selection matches`);
    if (word.chapter != null) assert(chapterSet.has(Number(word.chapter)), `Word ${word.id} has a chapter outside Isaiah 1–66`);
    for (const verse of word.verses || []) checkChapterVerse(word.chapter, verse, `Word ${word.id}`, scripture);
    reference(word.sourceIds, sourceById, `Word ${word.id}`);
    const chapters = word.chapter == null ? [...chapterSet] : [Number(word.chapter)];
    const eligible = chapters.flatMap(chapter => (scripture.chapters[chapter] || []).filter(v => !word.verses?.length || word.verses.includes(v.verse)).map(v => normalized(v.text)));
    for (const match of word.matches) assert(eligible.some(text => text.includes(normalized(match))), `Word ${word.id} match “${match}” does not occur in an eligible scripture verse`);
  }

  for (const guide of content.guides) {
    assert(guide.title && guide.description && Array.isArray(guide.steps) && guide.steps.length, `Guide ${guide.id} must have a title, description, and steps`);
    for (const [i, step] of guide.steps.entries()) {
      assert(step.title && step.text, `Guide ${guide.id} step ${i + 1} is missing text`);
      checkChapterVerse(step.chapter, step.verse, `Guide ${guide.id} step ${i + 1}`, scripture);
      if (step.year != null) assert(Number.isInteger(step.year) && step.year >= -780 && step.year <= -539, `Guide ${guide.id} step ${i + 1} has an invalid year`);
      if (step.placeId) reference([step.placeId], placeById, `Guide ${guide.id} step ${i + 1}`);
      reference(step.sourceIds, sourceById, `Guide ${guide.id} step ${i + 1}`);
    }
  }

  assert(Array.isArray(relief.bounds) && relief.bounds.length === 2, 'relief.json must have two bounds corners');
  relief.bounds?.forEach((point, i) => coordinate(point, `relief bounds corner ${i + 1}`));
  assert(relief.source && relief.attribution && relief.note, 'relief.json must identify its source, attribution, and interpretive limit');
  assert(relief.detail?.maxNativeZoom === 10, 'High-resolution terrain metadata must identify native zoom 10');
  for (let x = 604; x <= 619; x++) for (let y = 403; y <= 424; y++) {
    try { assert((await stat(resolve(dist, `assets/terrain/10/${x}/${y}.png`))).size > 0, `Empty detail tile ${x}/${y}`); }
    catch { fail(`Missing detail tile ${x}/${y}`); }
  }
  const detailedLakes = await readJson('data/lakes-detail.geojson');
  assert(detailedLakes.features?.length > 0, 'Detailed lake outlines must be present');
  for (const asset of ['assets/reading-landscape.png', 'assets/relief.png', 'data/land.geojson', 'data/lakes.geojson', 'vendor/leaflet.js', 'vendor/leaflet.css', 'vendor/leaflet-LICENSE.txt']) {
    try { assert((await stat(resolve(dist, asset))).size > 0, `Required local asset is empty: ${asset}`); } catch { fail(`Missing required local asset: ${asset}`); }
  }

  if (errors.length) { console.error(`Isaiah data check failed with ${errors.length} issue(s):`); errors.forEach(error => console.error(`- ${error}`)); process.exitCode = 1; return; }
  console.log(`Isaiah data check passed: ${verseCount} verses, ${content.sources.length} sources, ${content.passages.length} passages, ${content.words.length} curated word studies.`);
}

main().catch(error => { console.error(`Isaiah data check could not run: ${error.stack || error}`); process.exitCode = 1; });
