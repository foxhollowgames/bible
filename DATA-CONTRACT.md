# Bible Wayfinder data contract

## Reader files for every book

One reader serves all 66 books. `dist/<id>.html` opens a book. `dist/native-book.js` reads the id and loads `dist/app.js`.
`scripts/build-share.py` writes each `dist/<id>.html` from the shell `dist/book.html`. The pages differ only in their title and share tags.
`book.html?book=<id>` still opens a book and then shows the `<id>.html` address.
Each book has four files in `dist/data/books`:

- `<id>-native-content.json`: sources, passages, places, map data, words, guides, and the `book` settings.
- `<id>-native-scripture.json`: the translation, its copyright, and `chapters`.
- `<id>-people.json`: `people`, `featurePeople`, and optional `aliases`, `wordPeople`, and `profileFacts`.
- `<id>-art.json`: one portrait record for each person. `generated` marks generated art. `licensed` holds licensed art for the same person.

`book` has `id`, `name`, `bibleCode`, `chapterCount`, and `chapterDigits`. These optional settings change what the reader shows:

- `timeline: {start, end, default}`: the book has dated events. The map has a date slider. Without it, the slider uses chapter order.
- `verseLinks`: `words` links verse text to curated word studies. `entities` links people, places, and glossary terms.
- `sourceNotes: "inline"`: source summaries show below the chapter introduction. Without it, they stay in Source details.
- `mapLimits`: Map context also shows the chapter's location limits and states when a chapter has no mapped places.
- `placeCredits: [{label, url}]`: credits for the place data in the map attribution.
- `mapLabels: [{label, className}]`: fixed region names on the map.

`chapterDateBands: [{from, to, label}]` gives the period label below a chapter heading. Isaiah's bands live in `scripts/isaiah-book.json`. The added books' bands live in `scripts/book-date-bands.json`, keyed by book id. `scripts/book_dates.py` adds them during `scripts/build-native-books.py`. The bands must cover every chapter once, in order. A label is a scholarly estimate of the period that the chapter reflects: the setting for narrative, or the proposed composition period for poetry, prophecy, and letters. A chapter without a defensible date has a label such as "Date unknown". Each band has a source review record in `scripts/book-date-review/*.json`: the sources read, their URLs and access limits, the previous label, and a note. The build stops when a band does not match its review record.
`sourceGroups: [{id, title, description}]` gives the heading and note for a group in the source library.
The `conference-year` group has a `description` list, where `{count}` is the number of talks, and `parts` for its sections.
A scripture reference that names the book through another book has `chapters`.
`profileFacts` shows each person's lifespan, role, and date note. Use it only when the people have reviewed values.
The non-generated portrait setting shows licensed art. A person with no licensed art shows an initial.

The reader must not test for a book's name or id. A new difference between books needs a setting here.
`scripts/build-native-books.py` writes these files for each book that has a base record, `dist/data/books/<id>.json`.
Isaiah has no base record. Its content scripts write the same files, and `scripts/build-isaiah.py` adds its settings, people, and art.
The sections below still say "added books" for the 65 books with base records.

## Full-book extension

`chapterMaps` contains exactly one entry for each chapter. Entries have `chapter`, `focusPlaceIds`, `placeIds`, `routes`, `maxZoom`, `note`, and `sourceIds`. Focus places control the camera. Other referenced places remain visible without widening the focus. Route references contain `id`, inclusive zero-based `from` and `to` indices, and a scripture `reference`.

Place cards use the chapter that the reader has open. If the chapter names the place, the card shows that verse and its chapter source. Otherwise, the card shows a generic place description and keeps only general map sources. It does not call attention to a missing scripture reference. A card must not show a note or Bible source from a different chapter. Source summaries do not repeat the card explanation.

Every place and political area has two short content parts. `summary` identifies the place or area in one or two sentences. `detail` uses one or two sentences to explain its geopolitical or literary importance in Isaiah. Descriptions must add information; they must not explain visible map shapes, colors, labels, or rivers.

`textRoutes` contains schematic chapter connections without assigned historical dates. They have `id`, `title`, `points`, `chapter`, `verse`, `summary`, `uncertainty`, and `sourceIds`. An optional `direction:false` suppresses directional arrows when the text does not establish the travel order. Historical `campaigns` keep their date ranges. The map displays chapter routes independently of the timeline date, with their uncertainty visible in context cards.

The current guide contains Isaiah 1–66, with 1,292 verses. Every verse belongs to one passage note. A chapter can use more than one passage note when its setting or date changes within the chapter. No chapter range has default priority. There are six guides and 1,310 word-study records.

Passage `year` can be `null` when no event year is assigned. The map then keeps its independent reference date and labels that distinction. Historical map events retain the range 780–539 BCE. This range does not cover every proposed composition period. Source chapter URLs use two digits, such as `ISA01.htm`.

The chapter selector supports all 66 chapters on desktop and mobile. Previous and Next stop at the book boundaries. Word associations remain selected rather than comprehensive. New Hebrew-only notes use an empty `greek` field.

The original pilot specification below documents the starting design. The full-book extension above supersedes its chapter, passage-date, guide-count, and word-count limits.

The owner supplies `dist/data/books/isaiah-native-content.json`, `dist/data/books/isaiah-native-scripture.json`, `dist/data/land.geojson`, `dist/data/lakes.geojson`, `dist/vendor/leaflet.js`, `dist/vendor/leaflet.css`, and `dist/assets/reading-landscape.png`. Use native ES modules and Leaflet's global L. No package dependencies required to run; owner supplies local server. App files owned by interface agent: `dist/index.html`, `dist/styles.css`, `dist/app.js`, optional `dist/map.js` and `dist/state.js`.

`scripture.json` is `{ "translation":"World English Bible", "copyright":"Public domain", "source":"https://ebible.org/engwebp/ISA36.htm", "chapters": { "36":[{"verse":1,"text":"..."}], "37":[], "38":[], "39":[] } }`.

`content.json` is `{sources,passages,events,places,campaigns,ancientRoads,regions,words,guides,periods}`. All arrays. Below are item schemas; all prose is plain text, never HTML. Render missing info honestly. Use source IDs to build links/cards. A source is `{id,title,author,year,type,url,summary,limitations,license}`. A passage is `{id,chapter,start,end,title,summary,year,dateLabel,uncertainty,placeIds,sourceIds,lds:{text,sourceIds}}`. BCE years are NEGATIVE integers, from -780 to -539; dateLabel is display text. A period is `{id,label,start,end,description}`. An event is `{id,year,dateLabel,title,summary,uncertainty,sourceIds,placeIds,chapter,verse}`. A place is `{id,name,lat,lng,summary,sourceIds,chapter,verse}`. A campaign is `{id,title,start,end,dateLabel,points:[[lat,lng]],summary,detail,uncertainty,sourceIds,chapter,verse}`. An ancient road is `{id,title,confidence,points:[[lat,lng]],summary,detail,uncertainty,sourceIds}`; it is a general Iron Age corridor, not a dated campaign or surveyed roadbed. A region is `{id,name,start,end,points:[[lat,lng]],color,summary,uncertainty,sourceIds}`. A word is `{id,label,matches:["Lachish"],chapter,verses:[2],hebrew,transliteration,greek,greekNote,meaning,grammar,discussion,sourceIds,related:[{label,url,note}]}`; `chapter` may be null for all 66 chapters, and an empty `verses` array means any verse in an eligible chapter. Entries are curated English selection associations, not a complete aligned Hebrew edition. Empty Hebrew/Greek means not verified; never synthesize. A guide is `{id,title,description,steps:[{title,text,chapter,verse,year,placeId,sourceIds}]}`.

UX: user specifically approved dark Isaiah Study Guide map-first desktop interface with real geographic map occupying ~70% and scripture right. Campaign hover context card stays within map; click/tap pins, hover can be entered; full context/source actions. Sidebar word selection REPLACES scripture; Back restores scroll and keyboard focus. No 'Select a word to explore' footer. Read view has illustrated landscape and generous scripture. Historical/LDS separate from Read/Map. Global timeline supports scrub, event chips and exact labels Pre-Isaiah / Isaiah / Post-Isaiah. Store selected chapter, verse, view, perspective, date, layers and map viewport locally. Guided tours 3 items. Source library. All four chapters available. Only words with curated study notes are clickable; words without notes remain plain text. No inventing missing facts. Real latitude/longitude Leaflet map uses local land/lakes GeoJSON as base; no modern borders or external tile dependence. Mark routes schematic and territory influence approximate. Overlay date intervals control visible campaigns/regions. The Ancient roads toggle is off by default and shows sourced, non-directional Iron Age corridors below chapter paths. Road selection uses the same color with increased weight, not the blue selection color. The Nations toggle independently controls historical political regions. Keep map uncertainty in the shared page footer; do not add dedicated disclaimer blocks to feature cards. Places persist; context dates cannot silently shift when hovering. On narrow displays responsive Read/Map + collapsible sidebar.

Optional source fields: `group` groups related library entries; `reviewed` describes what was checked; `citedSourceIds` links a video's cited works; `timestamps` is an array of `{seconds,label}` for video sections. All cited IDs must exist. Timestamp seconds must be nonnegative integers. The `mcclellan` group contains the selected scholar videos and their cited publications. Scholarly interpretation remains available in both perspectives and is not classified as Church teaching.

The `conference-year` source group appears in LDS mode. Its sources include `conference` and `scriptureReferences: [{label,url,contextUrl,location,kind}]`. A scripture link opens the cited passage; the context link opens its location in the talk. `kind` distinguishes explicit Isaiah citations from named references through another scripture. The audit records the review dates and search limits.

## Narrative geography extension

Each chapter map also has `narrative`, `limits`, `contextPlaceIds`, `contextRoutes`, and `impacts`. Overview framing includes the context places, affected places, and both route sets. Detail framing retains the original local route sections. Where there is no original route, detail retains the narrative paths.

Narrative routes have `kind` (`military`, `flight`, `exile`, `restoration`, or `diplomacy`), `evidence`, and optional `placeIds` and `endVerse`. Kind controls the legend, color, and dash pattern. Evidence distinguishes narrated events, warnings, visions, and regional connections. Non-directional relationships set `direction:false`.

An impact has `placeId`, `reference`, and `description`. Impacts show distress or destruction without inventing military routes. `narrativeRegions` stores approximate geographic areas from the cached atlas. These areas are not dated political borders. They have IDs separate from historical influence layers.

The chapter narrative generator is `scripts/narrative-geography.mjs`. It runs during normal geography generation. Paths stay within the current chapter. The Nations control enables historical influence areas for the selected timeline year in undated passages. Areas must also be enabled. Undated passages hide these historical influence areas by default.

## Chapter source notes

Passages can include `studyNotes: [{title, text, perspective, sourceIds}]`. `perspective` is `historical` (shared evidence in both modes) or `lds` (LDS mode only). Notes describe how linked sources help the reader. General study-method notes must not imply chapter-specific commentary. Chapter footnote numbering includes visible passage, LDS, and study-note sources. Footnotes open the local source dialog. It shows shared image metadata and source summaries without changing the reading position.


## Chapter study material

Added-book verse records can include `publisherNote` when the publisher leaves a numbered verse empty.
The reader labels this field “Publisher note.” It does not present that note as Scripture.
Luke 17:36 preserves the WEB omission and its manuscript note. Exact Scripture selections still use `text` only.

### Added Bible books

`scripts/book-summaries-final.json` supplies authored summaries for Second Peter through Revelation.
Its book IDs contain chapter-number keys and summary strings. These summaries remain separate from contextual explanations.
`scripts/build-reviewed-letter.py` applies these values before the native build.
`scripts/book-summaries-letters.json` uses the same structure for First Timothy through First Peter.

The added-book records retain complete Scripture in `dist/data/books/<id>.json`. Each chapter has `contextNote: {title, text, sourceIds, evidenceSourceIds}`. The same original explanation supplies `meaning`. `sourceIds` supports the close reading. `evidenceSourceIds` identifies the objects displayed beside it. Museum evidence does not become the author of the interpretation.

Persistent rows live in `scripts/book-context-complete/<id>.json`: `[chapter, verse, title, text, ...evidenceSourceIds]`. Every ready chapter requires exactly one row. `scripts/book_context.py` validates coverage before `scripts/build-native-books.py` emits the native reader data. `chapterStudies` contains one meaningful selected verse per chapter. The reader obtains its exact text from the local complete Scripture dataset.

An added-book image source has `imageChapters`, separate from `chapterCoverage`. The former controls photograph display. The latter records broader source relevance. Images retain `src`, `fullUrl`, `sourceUrl`, `credit`, `creditUrl`, `license`, `licenseUrl`, `caption`, `alt`, `width`, and `height`. `contextReview` records the date, chapter count, and the actual review scope. Curated guides remain selected routes through the book.

### Isaiah

`chapterStudies` contains exactly one selected verse and original explanation for each chapter, 1–66. Fields are `chapter`, `verse`, `text`, `context`, `sourceId`, `attribution`, and `url`. Quoted text must equal the cached World English Bible verse. This selection does not replace the complete chapter or claim that one verse represents every theme.

Sources may have `studyText` for prose in the main summary, `chapterCoverage` for lesson scope, and `excerpt` for a verified quotation. An excerpt has `text`, `attribution`, `location`, `url`, `checked`, optional `chapters`, and optional `context`. A quotation outside its assigned chapters is shown only in that source's own details or library entry. Source images retain their shared license and credit metadata.

`studySourceReview` records every source's chapter associations, media availability, selected treatment, and existing access limits. Associations include works cited by another source. An inventory entry is not a claim that an entire external work was re-read. New direct quotations require a check against the original public text.

## Word coverage extension

Word records include `strongId` (the Hebrew dictionary number). Generated general entries also have `scope: "dictionary"`; the UI labels their meaning as a dictionary meaning. Added books receive plain-meaning terms from `scripts/book-glossary.json` with `scope: "glossary"`. Each term lists Hebrew and Greek dictionary numbers in `hebrew` and `greek`, keyed by English form or `*`. `scripts/book_words.py` makes one verse entry for each chapter, form, and dictionary number. It requires the English form and exactly one listed number in the same verse. Old Testament entries show the Hebrew dictionary form and no Greek. New Testament entries have `language: "greek"`, `greek`, and `greekTransliteration`, and no Hebrew. A verse with no listed number, or with two, uses the plain entry, which has empty language fields. `chapterDefault` lets chapter prose use a verse entry when the chapter has one dictionary form for that English form. The Hebrew check uses `scripts/lexicon-sources/oshb` with `VerseMap.xml` for verse numbers. The Greek check uses the Byzantine text in `scripts/lexicon-sources/byz`. The generator skips a chapter when its verse count differs from the source. `scripts/check-book-words.mjs` repeats the verse check on the built data. People and places can have `word`, with `language`, `strongId`, `key`, `checkedVerses`, `example`, the dictionary form, and optional `languageNote`. `key` is the English name that was checked. The dictionary must list that spelling for the entry, and exactly one such entry must occur in a verse that has the name. `example` records one such chapter and verse. A name with no listed spelling in its verses has no `word`, and its card shows no language section. The catalog requires a complete English token and the Hebrew lemma in the same verse. Chapter and verse restrictions stay explicit. Existing passage notes take priority. Greek forms and passage-specific comments must not be copied to other chapters. English Isaiah 9:1 maps to Hebrew 8:23; the rest of chapter 9 is offset by one. English 64:1 maps to Hebrew 63:19b; the rest of chapter 64 is offset by one. Coverage is broad but remains a verse-level association, not a full interlinear alignment.

## Added-book map layers

`scripts/book-map-context.json` holds the nations, ancient roads, and atlas areas for the added books. `scripts/book_maps.py` applies it inside `scripts/build-native-books.py`. `scripts/check-book-maps.mjs` runs in `npm run check:bible`.

`books.<id>.nations` lists chapter spans. Each span names an era and can use `only`, `without`, or `details`. `eras.<id>` gives one note for each region in that era. The builder writes a region with `baseId`, `faction`, `color`, `pattern`, `summary`, `detail`, `uncertainty`, `sourceIds`, and `chapterCoverage`. Added books have no date slider, so a region shows only in its listed chapters. `pattern` is the test for a name in the open chapter. A region can have `typeLabel` when the text names a land without a dated ruler. `factions` supplies legend names and colors that the reader does not have.

Do not give a book nations when its text sets no political period. Job, Psalms, Proverbs, Ecclesiastes, Song of Solomon, and Joel have none. Genesis 1–11 and 1 Chronicles 1–9 have none.

`books.<id>.roads` names one road set. Road lines that Isaiah has come from `dist/data/books/isaiah-native-content.json`. `roadText` replaces Isaiah-only wording. New roads live in `roads`. A set can add `uncertainty` and `detailNote` when its sources describe a different period. The card shows `summary` and `detail` only, so a limit the reader needs goes in `detail`. The Levant roads in the Gospels and Acts follow Iron Age sources. No first-century road study was reviewed for them.

`areas` maps a place id to an outline in `scripts/isaiah-geography.kml`. The builder adds an area when the book has that place and its marker lies inside the outline's extent.

`wikipedia` rows hold the source id, article, reviewed revision, and summary. Introductions were read on 2026-10-09. Road articles were read for their route descriptions. Herodotus 5.52–54 was read on Wikisource for the Persian royal road. A new nation or road needs a reviewed source row before its note.

## Added-book chapter journeys

`scripts/book-journeys.json` holds chapter paths for the added books. `scripts/book_maps.py` builds them. `scripts/check-book-maps.mjs` checks them.

`books.<id>.routes.<chapter>` lists rows: `[id, title, kind, "place>place", "verse-endVerse", summary, evidence]`. `kind` is `journey`, `flight`, `military`, `exile`, `restoration`, or `diplomacy`. A path uses the book's own places first. `evidence` is a short label, such as "Narrated journey" or "Stated plan". It also names the main doubt, such as a region that stands for an unnamed town.

`gazetteer.<id>` adds a stop that the book does not have: `[name, lat, lng, article, revision, optional limit]`. The point comes from the encyclopedia article at that revision. Only the coordinates were read. `books.<id>.places.<id>` gives the note for each added stop. The text of that chapter, or the chapter beside it, must name the stop.

A path joins places in the order the text gives. It is not a road or a sea lane. A chapter that had no path gets the shared `note` as its map note. A chapter that already had a path keeps its own note.

Do not draw a path when the text gives no second place. Jonah has none: Tarshish is not plotted, and Jonah 3 names no starting point. Visions, laments, parables, and stated plans can have a path only when `evidence` says so.
