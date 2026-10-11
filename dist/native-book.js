const slug=new URLSearchParams(location.search).get('book')||'genesis';
const directory=await fetch('data/books/directory.json',{cache:'no-store'}).then(r=>r.json());
const book=directory.find(b=>b.id===slug);
if(slug==='isaiah')location.replace('./'+location.hash);
else if(book?.status==='ready'){
  document.title=`${book.name} Study Guide`;
  document.querySelector('.brand').setAttribute('aria-label',`${book.name} Study Guide home`);
  document.querySelector('.brand').href='books.html';
  document.querySelector('#bookBrand').firstChild.textContent=book.name.toUpperCase();
  // Earlier book links used view=map. Preserve these links after the renderer change.
  const hash=new URLSearchParams(location.hash.slice(1));
  if(!hash.has('study')&&hash.get('view')==='map'){hash.set('study','map');location.hash=hash.toString();}
  await import(`./book-${slug}-app.js?v=20261011.1`);
}else{
  document.querySelector('#main').innerHTML=`<section class="word-view"><h1>${book?.name||'Book not found'}</h1><p>This study guide has not been built yet.</p><a href="books.html">Open the Bible directory</a></section>`;
  document.querySelectorAll('.topbar button').forEach(b=>b.disabled=true);
}
