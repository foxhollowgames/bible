# Project instructions

The product name is Bible Wayfinder.

Read `WRITING-GUIDE.md` before changing reader text.
Read `BIBLE-SOURCE-POLICY.md` before adding research claims or evidence.
Read `DATA-CONTRACT.md` before changing generated data or its renderer.
The shared reader files come from the Wayfinder repository: `app.js`, `styles.css`, `native-book.js`, `portraits.js`, `chapter-map.js`, `breadcrumbs.js`, `breadcrumbs.css`, `chapter-picker.js`, `modal-drag.js`, and `settings-menu.js`. Each copy starts with a stamp line. Edit `Wayfinder/viewer/<file>`, then run `npm run sync-viewer` in the Wayfinder folder. Do not edit the copies in `dist/`.

## One reader for every book

Isaiah is one of 66 books. It has no separate reader, address, or rules.
The home page is the book directory. Every book opens at `<id>.html`.
Run `python scripts/build-share.py` after changing `dist/book.html`, a book name, or a directory cover.
It writes each book page, its share card, and its share tags.
One reader serves every book: `dist/book.html`, `dist/native-book.js`, `dist/app.js`, and `dist/portraits.js`.
Do not test for a book's name or id in reader code.
Put a difference between books in that book's data. `DATA-CONTRACT.md` lists the settings.
Do not create a reader copy for one book.

## Content standard

Use the shared reading and evidence presentation as the reference.
Every ready chapter needs an original contextual explanation and a meaningful exact Scripture selection.
Explain why the passage works as it does.
Use surrounding passages to explain speakers, customs, power, consequences, and literary choices.
Do not substitute a plot recap, short moral, or repeated paragraph for context.
Short sentences must preserve facts, connected reasoning, and uncertainty.
Keep biblical statements, original close readings, scholarship, material evidence, and Church teaching distinct.
Show relevant evidence beside the explanation.
Use artifact photographs only when their actual identity and limits support the selected passage.
Keep licensed image credits and source links.
Keep the shared artwork note in the footer.
Do not place AI illustration disclaimers beneath portraits.

## Maintain and release

Edit persistent source files before rebuilding generated files.
Chapter context lives in `scripts/book-context-complete/*.json`.
Run `python scripts/build-native-books.py` after changing those records.
Isaiah's chapter notes live in `scripts/full-isaiah.mjs` and `scripts/chapter-enrichment.mjs`.
Isaiah's settings and people live in `scripts/isaiah-book.json` and `scripts/isaiah-people.json`.
Run `python scripts/build-isaiah.py` after changing those two files.
Run `python scripts/optimize-images.py` after adding or changing images in `dist/assets`.
Pages load the WebP copies that this script writes. The PNG and JPEG masters stay as fallbacks.
Run `npm run check` and `npm run check:bible` before publication.
Check representative chapters, guides, source dialogs, and photographs in both reading perspectives.
Do not claim source review, full coverage, or publication without supporting checks.
The current production site uses GitHub Pages from `dist` on `main`.
Publish through that existing workflow when the user authorizes publication.
Do not change hosting providers or the public address without a user request.

## Communication

Use active voice and plain English based on ASD-STE100 principles.
Keep descriptive sentences within 25 words and instructional sentences within 20 words.
Read the installed `i-have-adhd` skill when available.
Start updates with the result, status, or next action.
Do not claim verified STE100 compliance without a full applicable rules and dictionary review.
