import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../dist/',import.meta.url);
const app=await readFile(new URL('app.js',root),'utf8');
const people=JSON.parse(await readFile(new URL('data/books/ecclesiastes-people.json',root),'utf8')).people;
const book=JSON.parse(await readFile(new URL('data/books/ecclesiastes.json',root),'utf8'));
const content=JSON.parse(await readFile(new URL('data/books/ecclesiastes-native-content.json',root),'utf8'));
const context=vm.createContext({people,state:{chapter:1},entityLinkCache:{chapter:null,terms:[]},data:{places:content.places,regions:[],campaigns:[],events:[],ancientRoads:[],words:[]},mapDisplayName:s=>s,esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')});
vm.runInContext(app.slice(app.indexOf('function entityLinkTerms('),app.indexOf('function linkedPersonProfileHtml(')),context);
const reachable=new Set();
const verseHtml=(c,v)=>{context.state.chapter=c;return context.linkedEntityHtml(book.scripture[c].find(x=>x.verse===v).text,{verse:v});};
for(const c of book.chapters){
 context.state.chapter=c.chapter;
 const text=context.linkedEntityHtml(c.summary+' '+c.meaning)+book.scripture[c.chapter].map(v=>verseHtml(c.chapter,v.verse)).join('');
 for(const m of text.matchAll(/data-person-id="([^"]+)"/g))reachable.add(m[1]);
}
assert.deepEqual(book.people.filter(p=>!reachable.has(p.id)).map(p=>p.id),[],'Each profile needs a reader link');
assert.equal(Object.values(book.scripture).flat().length,222);
assert(book.chapters.every(c=>!('year' in c)&&c.route.length===0));
assert.deepEqual(book.chapters.filter(c=>c.places.length).map(c=>c.chapter),[1,2]);
const original=JSON.parse(await readFile(new URL('../scripts/ecclesiastes-scripture-review.json',root),'utf8'));
assert.deepEqual(book.scripture,original);
assert(!people.solomon,'Do not identify the unnamed Preacher as Solomon');
console.log('Ecclesiastes passed: 9 reachable profiles, 222 preserved verses, and no invented routes or dates.');
