import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../dist/',import.meta.url);
const app=await readFile(new URL('app.js',root),'utf8');
const people=JSON.parse(await readFile(new URL('data/books/nehemiah-people.json',root),'utf8')).people;
const book=JSON.parse(await readFile(new URL('data/books/nehemiah.json',root),'utf8'));
const functions=app.slice(app.indexOf('function entityLinkTerms('),app.indexOf('function linkedPersonProfileHtml('));
const places=JSON.parse(await readFile(new URL('data/books/nehemiah-native-content.json',root),'utf8')).places;
const context=vm.createContext({people,state:{chapter:1},entityLinkCache:{chapter:null,terms:[]},data:{places,regions:[],campaigns:[],events:[],ancientRoads:[],words:[]},mapDisplayName:s=>s,esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')});
vm.runInContext(functions,context);
const html=(chapter,n)=>{context.state.chapter=chapter;return context.linkedEntityHtml(book.scripture[chapter].find(v=>v.verse===n).text,{verse:n});};
const linked=(chapter,n,id)=>html(chapter,n).includes(`data-person-id="${id}"`);
for(const [c,v,id] of [[1,1,'nehemiah'],[3,16,'nehemiah-azbuk'],[1,2,'hanani-nehemiah'],[7,2,'hananiah-fortress'],[2,8,'asaph-forest'],[7,44,'asaph-singer'],[6,10,'shemaiah-delaiah'],[6,14,'noadiah-prophetess'],[10,9,'jeshua-azaniah'],[12,10,'jeshua-priest'],[3,12,'shallum-daughters'],[13,23,'foreign-families-nehemiah']])assert(linked(c,v,id),`${c}:${v} must link ${id}`);
for(const [c,v,id] of [[3,16,'nehemiah'],[7,7,'nehemiah'],[12,36,'hanani-nehemiah'],[3,8,'hananiah-fortress'],[10,9,'jeshua-priest'],[13,4,'eliashib-nehemiah'],[7,57,'solomon'],[12,1,'ezra']])assert(!linked(c,v,id),`${c}:${v} must not link ${id}`);
const reachable=new Set();
for(const chapter of book.chapters){
 context.state.chapter=chapter.chapter;
 const text=context.linkedEntityHtml(chapter.summary)+book.scripture[chapter.chapter].map(v=>html(chapter.chapter,v.verse)).join('');
 for(const m of text.matchAll(/data-person-id="([^"]+)"/g))reachable.add(m[1]);
}
for(const p of book.people)assert(reachable.has(p.id),`No reader link for ${p.id}`);
assert.equal(book.people.length,41);
assert.equal(Object.values(book.scripture).flat().length,406);
assert(book.chapters.every(c=>c.route.length===0&&!('year' in c)));
assert.deepEqual(book.chapters.filter(c=>c.lds.sourceIds.includes('cfm-nehemiah-2026')).map(c=>c.chapter),[2,4,5,6,8]);
console.log('Nehemiah checks passed: 41 reachable profiles, namesakes, 406 verses, source coverage, and map limits.');
