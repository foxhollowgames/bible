import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {existsSync} from 'node:fs';
const root=new URL('../dist/',import.meta.url);
const read=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const directory=await read('data/books/directory.json'),data=await read('data/books/genesis.json'),art=await read('data/books/genesis-art.json');
const counts=[31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,34,24,20,67,34,35,46,22,35,43,55,32,20,31,29,43,36,30,23,23,57,38,34,34,28,34,31,22,33,26];
assert.equal(directory.length,66);assert.equal(new Set(directory.map(b=>b.id)).size,66);
assert.equal(directory.filter(b=>b.testament==='Old Testament').length,39);
assert.equal(directory.filter(b=>b.testament==='New Testament').length,27);
assert(directory.every(b=>b.url===`${b.id}.html`),'Every book uses the same route');
assert.equal(data.chapters.length,50);assert.equal(Object.keys(data.scripture).length,50);
const sourceIds=new Set(data.sources.map(s=>s.id)),peopleIds=new Set(data.people.map(p=>p.id)),placeIds=new Set(data.places.map(p=>p.id));
assert.equal(sourceIds.size,data.sources.length);assert.equal(peopleIds.size,data.people.length);assert.equal(placeIds.size,data.places.length);
let total=0;
for(const c of data.chapters){
  assert.equal(c.chapter,total===0?1:data.chapters.indexOf(c)+1);
  const verses=data.scripture[c.chapter];assert.equal(verses.length,counts[c.chapter-1],`Verse count in chapter ${c.chapter}`);
  for(let i=0;i<verses.length;i++){assert.equal(verses[i].verse,i+1);assert(verses[i].text.length>0);assert(!/Genesis\s*<|\bundefined\b|\ufffd/.test(verses[i].text),`Publisher navigation or corrupt text: chapter ${c.chapter}`);}
  total+=verses.length;
  assert(c.summary&&c.meaning&&c.lds.text&&c.mapNote);
  for(const id of [...c.sourceIds,...c.lds.sourceIds])assert(sourceIds.has(id),`Missing source ${id}`);
  for(const id of c.people)assert(peopleIds.has(id));
  for(const id of [...c.places,...c.route])assert(placeIds.has(id));
  assert(c.sourceIds.every(id=>data.sources.find(s=>s.id===id).perspective==='historical'));
  assert(c.lds.sourceIds.every(id=>data.sources.find(s=>s.id===id).perspective==='lds'));
  assert(!('year' in c),'Do not assign unsupported event years');
}
assert.equal(total,1533);
for(const p of data.people){assert(p.role&&p.relations&&p.life&&p.meaning&&p.passages);assert(art[p.id],`Missing portrait for ${p.id}`);await access(new URL(art[p.id].src,root));if(!art[p.id].generated){assert(art[p.id].sourceUrl.startsWith('https://commons.wikimedia.org/'));assert(art[p.id].license&&art[p.id].credit);assert(!/\.pdf\b/i.test(art[p.id].title),`A document is not a portrait: ${p.id}`);}}
for(const p of data.places){assert(Number.isFinite(p.lat)&&Math.abs(p.lat)<=90);assert(Number.isFinite(p.lng)&&Math.abs(p.lng)<=180);assert(p.limits);}
for(const s of data.sources){assert.equal(new URL(s.url).protocol,'https:');assert(s.summary&&s.limits);}
const app=await readFile(new URL('app.js',root),'utf8'),index=await readFile(new URL('index.html',root),'utf8');
assert(index.includes('id="bookGroups"'),'The home page is the book directory');
assert(index.includes("location.replace('isaiah.html' + location.hash)"),'Keep earlier Isaiah links working');
assert(!app.includes('Isaiah'),'The reader takes each book name from its data');
// Link previews read each book's own page. Run python scripts/build-share.py to write the pages and cards.
const shellPage=(await readFile(new URL('book.html',root),'utf8')).replace(/<!-- share -->.*?<!-- \/share -->/s,'');
for(const b of directory.filter(b=>b.status==='ready')){
  const page=await readFile(new URL(`${b.id}.html`,root),'utf8');
  assert(page.includes(`data-book="${b.id}"`)&&page.includes(`<title>${b.name} · Bible Wayfinder</title>`),`${b.id}: book page`);
  assert(page.includes(`property="og:image" content="https://wayfinder.josephnewelldesign.com/bible/assets/share/${b.id}.jpg"`)&&page.includes('name="twitter:card" content="summary_large_image"'),`${b.id}: share tags`);
  assert.equal(page.replace(/<!-- share -->.*?<!-- \/share -->/s,'').replace(` data-book="${b.id}"`,'').replace(`<title>${b.name} · Bible Wayfinder</title>`,'<title>Bible Wayfinder</title>'),shellPage,`${b.id}: page differs from the shell. Run python scripts/build-share.py.`);
  await access(new URL(`assets/share/${b.id}.jpg`,root));
}
assert(index.includes('assets/share/site.jpg'),'The home page needs its share card');
assert(app.includes("$('#scriptureSidebar').hidden = mapMode"));
assert(app.includes("$('.timeline').hidden = !mapMode"));
const shell=await readFile(new URL('book.html',root),'utf8');
assert(shell.includes('styles.css?'));assert(!shell.includes('bible.css'));
for(const id of ['sidebarContent','chapterPickerMenu','map','contextCard','tourDrawer','timelineRange','settingsPanel','sourceDialog'])assert(shell.includes(id)||app.includes(id));
assert(!shell.includes('readingContent'),'Do not restore the separate book renderer');
console.log(`Bible checks passed: ${directory.length} books, ${data.chapters.length} chapters, ${total} verses, ${data.people.length} portraits, ${data.sources.length} sources.`);
const exodusCounts=[22,25,22,31,23,30,25,32,35,29,10,51,22,31,27,36,16,27,25,26,36,31,33,18,40,37,21,43,46,38,18,35,23,35,35,38,29,31,43,38];
const deuteronomyCounts=[46,37,29,49,33,25,26,20,29,22,32,32,18,29,23,22,20,22,21,20,23,30,25,22,19,19,26,68,29,20,30,52,29,12];
const joshuaCounts=[18,24,17,24,15,27,26,35,27,43,23,24,33,15,63,10,18,28,51,9,45,34,16,33];
const judgesCounts=[36,23,31,24,31,40,25,35,57,18,40,15,25,20,20,31,13,31,30,48,25];
const ruthCounts=[22,23,18,22];
const samuelCounts=[28,36,21,22,12,21,17,22,27,27,15,25,23,52,35,23,58,30,24,42,15,23,29,22,44,25,12,25,11,31,13];
const secondSamuelCounts=[27,32,39,12,25,23,29,18,13,19,27,31,39,33,37,23,29,33,43,26,22,51,39,25];
const firstKingsCounts=[53,46,28,34,18,38,51,66,28,29,43,33,34,31,34,34,24,46,21,43,29,53];
const secondKingsCounts=[18,25,27,44,27,33,20,29,37,36,21,21,25,29,38,20,41,37,37,21,26,20,37,20,30];
const secondChroniclesCounts=[17,18,17,22,14,42,22,18,31,19,23,16,22,15,19,14,19,34,11,37,20,12,21,27,28,23,9,27,36,27,21,33,25,33,27,23];
const ezraCounts=[11,70,13,24,17,22,28,36,15,44];
const lamentationsCounts=[22,22,66,22,22];
const nehemiahCounts=[11,20,32,23,19,19,73,18,38,39,36,47,31];
const estherCounts=[22,23,15,17,14,14,10,17,32,3];
const jobCounts=[22,13,26,21,27,30,21,22,35,22,20,25,28,22,35,22,16,21,29,29,34,30,17,25,6,14,23,28,25,31,40,22,33,37,16,33,24,41,30,24,34,17];
const firstChroniclesCounts=[54,55,24,43,26,81,40,40,44,14,47,40,14,17,29,43,27,17,19,8,30,19,32,31,31,32,34,21,30];
const numbersCounts=[54,34,51,49,31,27,89,26,23,36,35,16,33,45,41,50,13,32,22,29,35,41,30,25,18,65,23,31,40,16,54,42,56,29,34,13];
const leviticusCounts=[17,16,17,35,19,30,38,36,24,20,47,8,59,57,33,34,16,30,37,27,24,33,44,23,55,46,34];
// These checks read each book's base record. A book without one has its own checks.
const hasRecord=b=>b.status==='ready'&&existsSync(new URL(`data/books/${b.id}.json`,root));
for(const book of directory.filter(b=>hasRecord(b)&&b.id!=='genesis')){
  const content=await read(`data/books/${book.id}.json`),images=await read(`data/books/${book.id}-art.json`);
  assert.equal(content.chapters.length,content.chapterCount);assert.equal(Object.keys(content.scripture).length,content.chapterCount);
  const sources=new Map(content.sources.map(s=>[s.id,s])),people=new Set(content.people.map(p=>p.id)),places=new Set(content.places.map(p=>p.id));let verses=0;
  for(const c of content.chapters){
    assert.equal(c.chapter,content.chapters.indexOf(c)+1);const text=content.scripture[c.chapter];
    if(book.id==='exodus')assert.equal(text.length,exodusCounts[c.chapter-1]);
    if(book.id==='leviticus')assert.equal(text.length,leviticusCounts[c.chapter-1]);
    if(book.id==='numbers')assert.equal(text.length,numbersCounts[c.chapter-1]);
    if(book.id==='deuteronomy')assert.equal(text.length,deuteronomyCounts[c.chapter-1]);
    if(book.id==='joshua')assert.equal(text.length,joshuaCounts[c.chapter-1]);
    if(book.id==='judges')assert.equal(text.length,judgesCounts[c.chapter-1]);
    if(book.id==='ruth')assert.equal(text.length,ruthCounts[c.chapter-1]);
    if(book.id==='1-samuel')assert.equal(text.length,samuelCounts[c.chapter-1]);
    if(book.id==='2-samuel')assert.equal(text.length,secondSamuelCounts[c.chapter-1]);
    if(book.id==='1-kings')assert.equal(text.length,firstKingsCounts[c.chapter-1]);
    if(book.id==='2-kings')assert.equal(text.length,secondKingsCounts[c.chapter-1]);
    if(book.id==='1-chronicles')assert.equal(text.length,firstChroniclesCounts[c.chapter-1]);
    if(book.id==='2-chronicles')assert.equal(text.length,secondChroniclesCounts[c.chapter-1]);
    if(book.id==='ezra')assert.equal(text.length,ezraCounts[c.chapter-1]);
    if(book.id==='lamentations')assert.equal(text.length,lamentationsCounts[c.chapter-1]);
    if(book.id==='nehemiah')assert.equal(text.length,nehemiahCounts[c.chapter-1]);
    if(book.id==='esther')assert.equal(text.length,estherCounts[c.chapter-1]);
    if(book.id==='job')assert.equal(text.length,jobCounts[c.chapter-1]);
    const reviewedPublisherNotes={
      'luke:17:36':'Some Greek manuscripts add: “Two will be in the field: the one taken, and the other left.”',
      'acts:8:37':'TR adds Philip said, “If you believe with all your heart, you may.” He answered, “I believe that Jesus Christ is the Son of God.”',
      'acts:15:34':'Some manuscripts add: But it seemed good to Silas to stay there.',
      'acts:24:7':'TR adds “but the commanding officer, Lysias, came by and with great violence took him out of our hands,”',
      'romans:16:25':'TR places Romans 14:24-26 at the end of Romans instead of at the end of chapter 14, and numbers these verses 16:25-27.'
    };
    text.forEach((v,i)=>{assert.equal(v.verse,i+1);assert((v.text || v.publisherNote)&&!/\ufffd|\bundefined\b|\b(?:Exodus|Genesis)\s*</.test(v.text));if(!v.text)assert.equal(v.publisherNote,reviewedPublisherNotes[`${book.id}:${c.chapter}:${v.verse}`]);});verses+=text.length;
    assert(c.summary&&c.meaning&&c.lds?.text&&c.historicalNote);
    for(const id of c.sourceIds)assert.equal(sources.get(id)?.perspective,'historical');
    for(const id of c.lds.sourceIds)assert.equal(sources.get(id)?.perspective,'lds');
    c.people.forEach(id=>assert(people.has(id)));[...c.places,...c.route].forEach(id=>assert(places.has(id)));
  }
  for(const p of content.people){assert(p.role&&p.relations&&p.meaning&&p.passages);assert(images[p.id],`Missing ${book.id} portrait ${p.id}`);await access(new URL(images[p.id].src,root));if(!images[p.id].generated)assert(images[p.id].credit&&images[p.id].license&&images[p.id].sourceUrl.startsWith('https://commons.wikimedia.org/'));}
  for(const p of content.places){assert(p.limits);assert(Number.isFinite(p.lat)&&Number.isFinite(p.lng));p.sourceIds.forEach(id=>assert(sources.has(id)));}
  if(book.id==='exodus')assert.equal(verses,1213);
  if(book.id==='leviticus')assert.equal(verses,859);
  if(book.id==='numbers')assert.equal(verses,1288);
  if(book.id==='deuteronomy')assert.equal(verses,959);
  if(book.id==='joshua')assert.equal(verses,658);
  if(book.id==='judges')assert.equal(verses,618);
  if(book.id==='ruth')assert.equal(verses,85);
  if(book.id==='1-samuel')assert.equal(verses,810);
  if(book.id==='2-samuel')assert.equal(verses,695);
  if(book.id==='1-kings')assert.equal(verses,816);
  if(book.id==='2-kings')assert.equal(verses,719);
  if(book.id==='1-chronicles')assert.equal(verses,942);
  if(book.id==='2-chronicles')assert.equal(verses,822);
  if(book.id==='ezra')assert.equal(verses,280);
  if(book.id==='nehemiah')assert.equal(verses,406);
  if(book.id==='esther')assert.equal(verses,167);
  if(book.id==='job')assert.equal(verses,1070);
  if(book.id==='psalms')assert.equal(verses,2461);
  if(book.id==='proverbs')assert.equal(verses,915);
  if(book.id==='ecclesiastes')assert.equal(verses,222);
  if(book.id==='song-of-solomon')assert.equal(verses,117);
  console.log(`${content.name} checks passed: ${content.chapterCount} chapters, ${verses} verses, ${people.size} portraits.`);
}

// Reviewed chapter coverage must match the actual perspective associations.
for(const book of directory.filter(hasRecord)){
  const content=await read(`data/books/${book.id}.json`);
  for(const s of content.sources){
    assert(s.summary&&s.limits&&new URL(s.url).protocol==='https:');
    if(s.chapterCoverage){
      const actual=content.chapters.filter(c=>(s.perspective==='lds'?c.lds.sourceIds:c.sourceIds).includes(s.id)).map(c=>c.chapter);
      assert.deepEqual(actual,s.chapterCoverage,`${book.id}: source scope ${s.id}`);
      assert(s.author&&s.reviewed,`${book.id}: missing review record ${s.id}`);
    }
    if(s.id.startsWith('wiki-'))assert(s.revisionId&&s.licenseUrl&&s.revisionUrl);
    for(const id of s.citedSourceIds||[])assert(content.sources.some(other=>other.id===id));
  }
}
console.log('Reviewed source coverage and attribution checks passed.');

const profileData=async slug=>(await read(`data/books/${slug}-people.json`)).people;
const genesisProfiles=await profileData('genesis');
assert.equal(genesisProfiles.abraham.name,'Abraham');
assert(genesisProfiles.abraham.linkNames.includes('Abram'));
assert.equal(genesisProfiles.jacob.name,'Jacob');
assert(!genesisProfiles.jacob.linkNames.includes('Israel'),'Do not turn every corporate Israel reference into a person link');
const numbersProfiles=await profileData('numbers');
assert.equal(numbersProfiles['noah-daughter'].name,'Noah');
assert(!('noah' in numbersProfiles),'Do not confuse Zelophehad’s daughter with Genesis Noah');
console.log('Person aliases and same-name distinctions passed.');
