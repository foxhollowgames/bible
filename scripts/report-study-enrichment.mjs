import { readFile, writeFile } from 'node:fs/promises';

const content = JSON.parse(await readFile(new URL('../dist/data/books/isaiah-native-content.json', import.meta.url), 'utf8'));
const clean = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
const source = id => content.sources.find(s => s.id === id);
const chapters = content.chapterStudies.map(study => {
  const passages = content.passages.filter(p => p.chapter === study.chapter);
  const ids = [...new Set(passages.flatMap(p => [...p.sourceIds, ...p.lds.sourceIds]))];
  const images = ids.filter(id => source(id)?.image).map(id => source(id).title);
  const quotes = ids.filter(id => {
    const excerpt = source(id)?.excerpt;
    return excerpt && (!excerpt.chapters || excerpt.chapters.includes(study.chapter));
  }).map(id => source(id).title);
  return `| ${study.chapter} | Isaiah ${study.chapter}:${study.verse} | ${clean(images.join('; ') || 'No directly relevant local object image selected')} | ${clean(quotes.join('; ') || 'Exact scripture quotation and source paraphrases')} |`;
});
const sources = content.studySourceReview.map(item => {
  const record = source(item.sourceId);
  return `| ${clean(record.title)} | ${item.chapters.join(', ') || 'Map, word, or library resource'} | ${item.image ? 'Image; ' : ''}${item.quotation ? 'Verified short quotation' : 'Paraphrase or reference'} |`;
});
const directory = JSON.parse(await readFile(new URL('../dist/data/books/directory.json', import.meta.url), 'utf8'));
const addedBooks = await Promise.all(directory.filter(book => book.status === 'ready' && book.id !== 'isaiah').map(async book => {
  const raw = JSON.parse(await readFile(new URL(`../dist/data/books/${book.id}.json`, import.meta.url), 'utf8'));
  const native = JSON.parse(await readFile(new URL(`../dist/data/books/${book.id}-native-content.json`, import.meta.url), 'utf8'));
  return {name:book.name, total:raw.chapterCount, studies:native.chapterStudies.length,
    images:native.passages.filter(p => p.contextNote?.evidenceSourceIds?.length).length};
}));
const total = addedBooks.reduce((sum, book) => sum + book.total, 0);
const studies = addedBooks.reduce((sum, book) => sum + book.studies, 0);
const images = addedBooks.reduce((sum, book) => sum + book.images, 0);
const report = `# Study enrichment coverage

All 66 chapters have an exact World English Bible quotation and an original explanation. These appear in Historical and LDS mode. Relevant source insights appear in the main text. Sources keep their attribution and full-reading links.

The chapter enrichment pass added 18 verified short quotations from linked works. The earlier Luckenbill quotation remains. There are now ${content.sources.filter(s=>s.image).length} sources with licensed images. The Wikipedia review added article background, artifact and site images, and revised map connections. See WIKIPEDIA-MAP-REVIEW.md for its scope and limits. A chapter without an appropriate image uses its selected passage and explanation. General reading-method advice is labeled separately.

The source inventory covers all ${content.sources.length} source records, including cited works, map data, and language references. It records how each source is used. It is not a claim that every complete external work was read again. Full books, blocked pages, video transcripts, and existing source checks retain their stated limits. Only exact quotations checked against the source text are presented as new direct quotations.

## Chapter coverage

Every row includes an original close-reading note. The table lists chapter-specific quotations from other works; general reading-method quotations are excluded from that column. LDS quotations appear only in LDS mode.

| Chapter | Selected passage | Object image | Other selected quotations |
| --- | --- | --- | --- |
${chapters.join('\n')}

## Source inventory

Chapter associations include works cited within another source. Some associations are related reading rather than direct commentary. The interface labels lessons that omit the current chapter and filters conference material to its actual chapter references.

| Source | Chapter associations | Treatment |
| --- | --- | --- |
${sources.join('\n')}

## Maintenance and checks

Maintain chapter selections in \`scripts/chapter-enrichment.mjs\`. Maintain checked source quotations in \`scripts/study-source-excerpts.json\`. Shared object metadata and the Luckenbill quotation remain in \`scripts/source-previews.mjs\`.

Rebuild with \`node scripts/create-content.mjs\` and \`python scripts/prepare-words.py\`. Refresh this report with \`node scripts/report-study-enrichment.mjs\`. Run \`npm run check\` and \`node --check dist/app.js\`.

Automated checks cover all 66 chapters in both modes, exact passage text, source completeness, attribution, chapter scope, image scope, and whole-word place matches. Browser checks cover an object image in chapter 45, LDS quotations in chapter 41, and a source-details dialog.

## Added-book context

${studies} of ${total} chapters across ${addedBooks.length} ready added books have original contextual explanations and selected local World English Bible verses.
The existing 66 Isaiah studies remain intact.
The complete added-book rows live in \`scripts/book-context-complete/\`.
They supply chapter meaning, introductions, event details, and selected guide steps.

Artifact photographs appear in ${images} relevant added-book chapters.
Nine Metropolitan Museum public-domain photographs supplement the existing licensed Isaiah artifacts.
Images retain object identity, date, collection, credits, rights links, and comparison limits.
The later Babylonian hymn tablet offers a comparison with another sacred-song tradition.
It does not establish the earlier captors' own songs in Psalm 137.

Original close readings use the local Scripture passages and their surroundings.
Complete textual coverage does not claim a fresh full reading of every external linked work.
Existing source-specific access records remain in place.
The builder rejects incomplete authored chapter coverage.
Presentation checks exercise every added chapter in both perspectives and preserve exact Scripture and image scope.
Curated guides remain short selected routes.

Rebuild added books with \`python scripts/build-native-books.py\`.
Run \`npm run check\` and \`npm run check:bible\` before publication.
`;
await writeFile(new URL('../STUDY-ENRICHMENT.md', import.meta.url), report);
console.log(`Wrote coverage for ${content.chapterStudies.length} chapters and ${content.sources.length} sources.`);
