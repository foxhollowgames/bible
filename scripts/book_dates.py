"""Chapter date labels for the added books. The bands live in scripts/book-date-bands.json.
Isaiah keeps its own bands in scripts/isaiah-book.json.
Run this file alone to add the bands to the existing reader data without a full rebuild."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'dist/data/books'
BANDS=json.loads((ROOT/'scripts/book-date-bands.json').read_text(encoding='utf-8'))
# Each band needs a source review record in scripts/book-date-review/*.json with the same chapters and label.
REVIEW={book:entries for f in sorted((ROOT/'scripts/book-date-review').glob('*.json')) for book,entries in json.loads(f.read_text(encoding='utf-8'))['books'].items()}
def date_bands(slug,count):
    bands=BANDS.get(slug)
    if not bands:raise ValueError(f'{slug}: no chapter date bands in scripts/book-date-bands.json')
    # Every chapter gets exactly one label: the bands start at 1, touch, and end at the last chapter.
    expected=1
    for band in bands:
        if band['from']!=expected or band['to']<band['from'] or not band['label'].strip():raise ValueError(f'{slug}: bad date band {band}')
        expected=band['to']+1
    if expected!=count+1:raise ValueError(f'{slug}: date bands end at {expected-1}, not {count}')
    reviewed=[(r['from'],r['to'],r['label']) for r in REVIEW.get(slug,[]) if r.get('sourceIds')]
    if reviewed!=[(b['from'],b['to'],b['label']) for b in bands]:raise ValueError(f'{slug}: date bands do not match their source review in scripts/book-date-review')
    return [dict(band) for band in bands]
def add_date_bands(slug,content):
    content['chapterDateBands']=date_bands(slug,content['book']['chapterCount'])
if __name__=='__main__':
    for slug in BANDS:
        path=OUT/f'{slug}-native-content.json'
        content=json.loads(path.read_text(encoding='utf-8'))
        add_date_bands(slug,content)
        path.write_text(json.dumps(content,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Wrote chapter date bands for {len(BANDS)} books.')
