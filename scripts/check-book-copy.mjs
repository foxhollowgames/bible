import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const directory=JSON.parse(readFileSync('dist/data/books/directory.json','utf8'));
let fields=0;
const app=readFileSync('dist/app.js','utf8');
assert(app.includes('function librarySourceHtml('),'source details remain available');
assert(!readFileSync('dist/portraits.js','utf8').includes('profile-portrait-note'),'the footer has the shared artwork note');
// Isaiah's copy has its own checks in npm run check.
for(const book of directory.filter(b=>b.status==='ready'&&existsSync(`dist/data/books/${b.id}.json`))){
  const data=JSON.parse(readFileSync(`dist/data/books/${book.id}.json`,'utf8'));
  const copy=data.chapters.flatMap(c=>[c.summary,c.meaning,c.lds.text]);
  copy.push(...data.people.flatMap(p=>[p.role,p.relations,p.meaning]),...data.places.map(p=>p.summary));
  for(const text of copy){
    assert(!/Original study reflection|not independently verified|The guide does not|portrait does not|not a modern/i.test(text),`${book.id}: repeated process note`);
    assert(!/\b(?:chronolog\w*|theolog\w*|narrat\w*|genealog\w*|dynast\w*|administrati\w*|imperial|communal|contested|kinship|allocation|allegiance|proclamation|recrui\w*|precedes|commission)\b/i.test(text),`${book.id}: technical reader copy: ${text}`);
    for(const sentence of text.split(/(?<=[.!?])(?:[”"’']\s+|\s+)/)){
      assert((sentence.match(/[\w’'-]+/g)||[]).length<=15,`${book.id}: long sentence: ${sentence}`);
    }
  }
  fields+=copy.length;
  // These settings keep date labels, source summaries, and profile facts out of a book that has no reviewed values for them.
  const content=JSON.parse(readFileSync(`dist/data/books/${book.id}-native-content.json`,'utf8'));
  assert(!content.chapterDateBands,'no chapter date label without reviewed dates');
  assert.notEqual(content.book.sourceNotes,'inline','source summaries stay in source details');
  const profiles=JSON.parse(readFileSync(`dist/data/books/${book.id}-people.json`,'utf8'));
  assert(!profiles.profileFacts,'the portrait already shows the role');
}
console.log(`Book copy passed: ${fields} reader fields, short sentences, source details, and profile notes.`);
