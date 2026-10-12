import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { chapterFocus, chapterRoutes, chapterPoints, movementStyles } from '../dist/chapter-map.js';
import { addChapterGeography } from './chapter-geography.mjs';
const data = JSON.parse(await readFile(new URL('../dist/data/books/isaiah-native-content.json',import.meta.url)));
const scripture = JSON.parse(await readFile(new URL('../dist/data/books/isaiah-native-scripture.json',import.meta.url)));
assert.deepEqual(data.chapterMaps.map(c => c.chapter),Array.from({length:66},(_,i)=>i+1));
const sourceIds = new Set(data.sources.map(s=>s.id));
for (const focus of data.chapterMaps) {
  assert(focus.note && focus.focusPlaceIds.length);
  assert(focus.narrative && focus.limits,`${focus.chapter}: missing narrative review`);
  for (const id of [...focus.focusPlaceIds,...focus.placeIds,...focus.contextPlaceIds,...focus.impacts.map(p=>p.placeId)]) assert(data.places.some(p=>p.id===id),`${focus.chapter}: ${id}`);
  for (const id of focus.sourceIds) assert(sourceIds.has(id));
  const points = chapterPoints(data,focus.chapter);
  assert(points.length);
  for (const [lat,lng] of points) assert(lat>=8 && lat<=45 && lng>=20 && lng<=57,`Out of map bounds: ${focus.chapter}: ${lat},${lng}`);
  for (const ref of [...focus.routes,...focus.contextRoutes]) {
    const route = [...data.campaigns,...data.textRoutes].find(r=>r.id===ref.id);
    assert(route && Number.isInteger(ref.from) && ref.from>=0 && ref.to>ref.from && ref.to<route.points.length);
    assert(ref.reference);
  }
}
for (const route of data.textRoutes) {
  assert(route.uncertainty && route.summary && scripture.chapters[route.chapter][route.verse-1]);
  assert(movementStyles[route.kind] && route.evidence);
  if (route.endVerse) assert(scripture.chapters[route.chapter][route.endVerse-1]);
  for (const id of route.sourceIds) assert(sourceIds.has(id));
}
assert(chapterFocus(data,9).focusPlaceIds.includes('galilee'));
assert(chapterFocus(data,15).contextPlaceIds.includes('dibon'));
assert(chapterFocus(data,34).focusPlaceIds.includes('bozrah'));
assert(chapterFocus(data,63).focusPlaceIds.includes('edom'));
assert(chapterPoints(data,10,'detail').every(([lat,lng])=>lat>31.7 && lat<32 && lng>35 && lng<35.4));
const western = chapterRoutes(data,36).find(r=>r.originalId==='west-campaign');
assert.deepEqual(western.points,data.campaigns.find(r=>r.id==='west-campaign').points);
assert.equal(western.direction,false,'Regional connections must not imply a known march sequence');
assert(chapterRoutes(data,36,'detail').some(r=>r.originalId==='judah-campaign'));
for (const campaign of data.campaigns) {
  assert.equal(campaign.points.length,campaign.placeIds.length,'Every campaign vertex must identify a named site');
  assert.deepEqual(campaign.points,campaign.placeIds.map(id=>{
    const p=data.places.find(p=>p.id===id); assert(p,`Missing campaign site: ${id}`); return [p.lat,p.lng];
  }));
  assert(campaign.geometryBasis,'Campaign geometry must state its basis');
}
assert(!data.places.some(p=>p.id==='eltekeh'),'Do not turn a disputed battlefield into a precise pin');
assert.equal(data.campaigns.find(c=>c.id==='lachish-mission').points.length,2,'Do not add unreported stops to the mission');
assert(chapterPoints(data,36,'detail').every(([lat])=>lat<32),'Local detail must exclude distant campaign legs');
assert(chapterPoints(data,36).some(([lat])=>lat>33),'Overview must restore the full campaign context');
assert.equal(chapterRoutes(data,15).length,4,'Moab flight passages must be mapped');
assert(chapterRoutes(data,15).every(r=>r.kind==='flight'),'Do not invent a named attacking army for Moab');
assert.equal(chapterFocus(data,15).impacts.length,8);
assert(chapterFocus(data,15).limits.includes('attacker and army route are not named'));
assert(chapterRoutes(data,16).some(r=>r.kind==='diplomacy'));
assert(chapterRoutes(data,39).some(r=>r.kind==='exile'));
assert(chapterRoutes(data,27).every(r=>r.kind==='restoration'));
assert.equal(chapterRoutes(data,19)[0].direction,false,'A reciprocal visionary highway must not imply one-way travel');
assert.equal(chapterRoutes(data,37)[0].originalId,'lachish-libnah');
assert.equal(chapterRoutes(data,38).length,0,'Chapter 38 must clear earlier highlights');
assert.equal(chapterRoutes(data,48)[0].points[0][1],data.places.find(p=>p.id==='babylon').lng);
for (const n of [35,40,49,55]) assert.equal(chapterRoutes(data,n).length,0,'Do not invent a precise road for poetic highways');
const rebuilt = structuredClone(data);
await addChapterGeography(rebuilt,scripture);
assert.deepEqual(rebuilt.chapterMaps,data.chapterMaps,'Rebuild must preserve geography');
assert.deepEqual(rebuilt.textRoutes,data.textRoutes);
assert.deepEqual(rebuilt.narrativeRegions,data.narrativeRegions);
for (const region of data.narrativeRegions) {
  assert(region.points.length >= 3 && region.summary && region.sourceIds.includes('geo'));
  assert(data.places.some(p=>p.id===region.placeId));
  for (const [lat,lng] of region.points) assert(Number.isFinite(lat) && Number.isFinite(lng) && lat>=-90 && lat<=90 && lng>=-180 && lng<=180);
}
assert.equal(rebuilt.places.length,data.places.length,'Rebuild must not duplicate markers');

// Verify camera interruption, reduced motion, and chapter framing without browser timing.
const app = await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
const start=app.indexOf('let lastMapChapter;'),end=app.indexOf('function focusedRoutes()',start);
const calls=[];
const context=vm.createContext({data,state:{chapter:36},chapterFocus,chapterPoints,
  reducedMapMotion:{matches:false},closeCard(){},
  $:()=>({getBoundingClientRect:()=>({width:175,height:250})}),
  L:{latLngBounds:points=>({pad:()=>points})},
  map:{stop:()=>calls.push('stop'),invalidateSize(){},getSize:()=>({x:900,y:600}),fitBounds:(points,options)=>calls.push({points,options})}});
vm.runInContext(app.slice(start,end),context);
context.focusChapterMap();
assert.equal(calls[0],'stop');
assert.equal(calls[1].options.animate,true);
assert.deepEqual(calls[1].points,chapterPoints(data,36));
context.state.chapter=15;
context.reducedMapMotion.matches=true;
context.focusChapterMap();
assert.equal(calls[3].options.animate,false);
assert.deepEqual(calls[3].points,chapterPoints(data,15));
context.state.chapter=36;
context.focusChapterMap();
assert.deepEqual(calls[5].points,chapterPoints(data,36));
const campaignStart = app.indexOf('function displayedCampaigns()'), campaignEnd = app.indexOf('function chapterPlaceVisible(',campaignStart);
const campaignContext = vm.createContext({data,book:data.book,state:{layers:{history:false}},visibleAt:()=>true,focusedRoutes:()=>chapterRoutes(data,15)});
vm.runInContext(app.slice(app.indexOf('function datedMap()'),campaignStart),campaignContext);
vm.runInContext(app.slice(campaignStart,campaignEnd),campaignContext);
assert(campaignContext.displayedCampaigns().every(c=>c.chapterRoute),'An inherited timeline date must not add unrelated campaign paths');
campaignContext.state.layers.history=true;
assert(campaignContext.displayedCampaigns().every(c=>c.chapterRoute),'Dated context must not add paths from other chapters');
campaignContext.focusedRoutes=()=>chapterRoutes(data,1);
assert.equal(campaignContext.displayedCampaigns().length,0,'Isaiah 1 must not show the Lachish mission');
const featureContextStart = app.indexOf('function placeVerseInChapter(');
const featureContextEnd = app.indexOf('function featureScriptureHtml(', featureContextStart);
const featureContext = vm.createContext({
  data, scripture, book:data.book, chapters:Array.from({length:data.book.chapterCount}, (_, i) => i + 1), state:{chapter:44},
  source:id=>data.sources.find(item=>item.id===id),
  mapDisplayName:name=>name.replace(/ · (?:approximate(?: regional influence)?|regional focus|uncertain site)$/i, ''),
  mapDisplayText:text=>text
});
vm.runInContext(app.slice(app.indexOf('function bookNamePattern('),app.indexOf('function readSaved(')),featureContext);
vm.runInContext(app.slice(featureContextStart,featureContextEnd),featureContext);
const libnah = data.places.find(place=>place.id==='libnah');
let mapCard = featureContext.featureChapterContext(libnah);
assert.equal(mapCard.paragraphs[0], 'Libnah was a fortified town in Judah’s western lowlands. Its exact site remains uncertain.');
assert(!mapCard.paragraphs[0].includes('not named'), 'A generic place card must not call out a missing scripture reference');
assert(mapCard.paragraphs[1].includes('Assyrian campaign'), 'A generic place card must explain why the place matters');
assert.deepEqual([...mapCard.sourceIds], ['geo'], 'A map card must omit sources for a different chapter');
featureContext.state.chapter=37;
mapCard=featureContext.featureChapterContext(libnah);
assert(mapCard.paragraphs[0].startsWith('Libnah was a fortified town'));
assert(mapCard.paragraphs[1].includes('Assyrian campaign'));
assert(mapCard.sourceIds.includes('web37') && mapCard.sourceIds.includes('wiki-libnah'));
featureContext.state.chapter=44;
const jerusalemCard=featureContext.featureChapterContext(data.places.find(place=>place.id==='jerusalem'));
assert.equal(jerusalemCard.paragraphs[0], 'Isaiah 44:26 names Jerusalem.');
assert(jerusalemCard.sourceIds.includes('web44'));
const samariaCard=featureContext.featureChapterContext(data.places.find(place=>place.id==='samaria'));
assert(samariaCard.paragraphs[0].startsWith('Samaria was the capital'));
assert(samariaCard.paragraphs[1].includes('Assyrian conquest'));
assert(data.places.every(place=>place.summary && place.detail), 'Every place needs identity and Isaiah relevance');
assert(data.places.every(place=>!place.summary.includes('Geographic reference')), 'Place cards must not use placeholder descriptions');
assert(data.regions.every(region=>region.summary && region.detail && !region.summary.includes('shaded area')), 'Political areas need historical context instead of map instructions');
const featureBody = app.slice(app.indexOf('function featureBodyHtml('), app.indexOf('function featureDetailBodyHtml(', app.indexOf('function featureBodyHtml(')));
assert(!featureBody.includes('sourceInsightsHtml'), 'Map cards must not repeat source summaries');
for (let chapter=1;chapter<=66;chapter++) {
  for (const route of chapterRoutes(data,chapter)) {
    const reference=route.reference.match(/^Isaiah (\d+):(\d+)/);
    if (reference) {
      assert.equal(route.chapter,Number(reference[1]));
      assert.equal(route.verse,Number(reference[2]));
    }
  }
}
console.log('Chapter maps passed: 66 narrative reviews, impact sites, typed movements, overview/detail, route sections, rebuild stability, camera interruption, reduced motion.');
