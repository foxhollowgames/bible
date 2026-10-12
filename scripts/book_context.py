"""Passage-specific context, exact Scripture anchors, and scoped material evidence.

These are original close readings, not quotations or attributed scholarly claims.
Museum facts appear separately, with object identity and comparison limits.
"""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
COMPLETE=ROOT/'scripts/book-context-complete'
# Short guide routes. Full authored paragraphs live only in the complete JSON files.
GUIDE_CHAPTERS={
  "1-peter": [1,2,3,5],
  "2-peter": [1,2,3],
  "1-john": [1,2,3,4],
  "2-john": [1],
  "3-john": [1],
  "jude": [1],
  "revelation": [2,5,13,21],
  "james": [1,2,3,5],
  "hebrews": [4,7,10,11],
  "philemon": [1],
  "titus": [1,2,3],
  "2-timothy": [1,2,3,4],
  "1-timothy": [1,3,4,6],
  "2-thessalonians": [1,2,3],
  "1-thessalonians": [2,3,4,5],
  "colossians": [1,2,3,4],
  "philippians": [1,2,3,4],
  "ephesians": [2,4,5,6],
  "galatians": [2,3,4,5],
  "2-corinthians": [2,4,8,12],
  "1-corinthians": [3,8,11,15],
  "romans": [4,8,11,14],
  "acts": [6,10,15,27],
  "john": [4,9,13,20],
  "luke": [4,10,15,24],
  "mark": [4,8,12,16],
  "matthew": [5,18,27,28],
  "malachi": [1,3,4],
  "zechariah": [3,7,9,14],
  "haggai": [1,2],
  "zephaniah": [1,2,3],
  "habakkuk": [1,2,3],
  "nahum": [1,2,3],
  "micah": [2,4,6],
  "jonah": [1,3,4],
  "obadiah": [1],
  "amos": [2,5,8],
  "joel": [1,2,3],
  "hosea": [2,6,11],
  "daniel": [3,7,12],
  "ezekiel": [18,34,47],
  "lamentations": [1,3,5],
  "genesis": [
    1,
    23,
    41
  ],
  "exodus": [
    1,
    16,
    32
  ],
  "leviticus": [
    5,
    19,
    25
  ],
  "numbers": [
    11,
    22,
    27
  ],
  "deuteronomy": [
    6,
    17,
    25
  ],
  "joshua": [
    2,
    9,
    24
  ],
  "judges": [
    4,
    11,
    19
  ],
  "ruth": [
    2,
    4
  ],
  "1-samuel": [
    8,
    16,
    25
  ],
  "2-samuel": [
    7,
    12,
    24
  ],
  "1-kings": [
    7,
    12,
    21
  ],
  "2-kings": [
    18,
    19,
    25
  ],
  "1-chronicles": [
    1,
    15,
    29
  ],
  "2-chronicles": [
    4,
    32,
    36
  ],
  "ezra": [
    1,
    6,
    10
  ],
  "nehemiah": [
    2,
    5,
    8
  ],
  "esther": [
    3,
    6,
    9
  ],
  "job": [
    1,
    31,
    42
  ],
  "psalms": [
    22,
    88,
    137,
    150
  ],
  "proverbs": [
    1,
    11,
    26
  ],
  "ecclesiastes": [
    1,
    4,
    12
  ],
  "song-of-solomon": [
    1,
    4,
    8
  ],
  "jeremiah": [
    7,
    32,
    36
  ]
}

OBJECT_NOTES={
'met-545281':('The model shows grain storage beside measuring and record keeping.','This Egyptian tomb model is not Joseph’s storehouse. It illustrates related work, not the event in Genesis.'),
'met-560805':('This Egyptian palette held ink and reeds used for writing.','The palette offers a comparison for writing tools. It is not an Israelite object or Baruch’s equipment.'),
'met-555866':('This Egyptian harp preserves the wooden body of an ancient string instrument.','It is an Egyptian comparison, not David’s harp. Its surviving parts cannot establish the sound of biblical songs.'),
'met-326387':('This Persian clay object bears a seal impression. The museum links it with Persian record keeping.','It comes from Pasargadae, not the biblical court scene. Its exact original use remains uncertain.'),
'met-327369':('This Babylonian stone weight names ten minas in its inscription. A mina was a local unit of weight.','It shows a regional practice of marked weights. It does not establish the standard weight used in Israel.'),
'met-544042':('This Egyptian perfume vessel has the form of two tied ducks.','The vessel offers a comparison for the use of scent. It is not an object named in this passage.'),
'met-244562':('This Cypriot bronze stand supported a vessel. It shows skilled metalwork in the eastern Mediterranean.','Its form differs from the temple stands described in Kings. It is a comparison, not a temple reconstruction.'),
'met-321937':('This clay tablet preserves a hymn to Marduk in two ancient languages.','The museum’s dating and cultural labels include uncertainty. The tablet does not establish biblical borrowing.'),
'met-321953':('This Babylonian clay tablet records a field sale.','It shows that land sales could have written records. It is earlier regional evidence, not the biblical deed.')
}

def enrich_context(book):
    slug=book['id']
    path=COMPLETE/f'{slug}.json'
    if not path.exists():raise ValueError(f'{slug}: missing complete contextual review at {path}')
    notes=json.loads(path.read_text(encoding='utf8'))
    expected=set(range(1,book['chapterCount']+1))
    actual=[row[0] for row in notes]
    if len(actual)!=len(expected) or set(actual)!=expected:
        raise ValueError(f'{slug}: context must cover every chapter exactly once')
    records={s['id']:s for s in json.loads((ROOT/'scripts/study-objects.json').read_text(encoding='utf8'))}
    isaiah={s['id']:s for s in json.loads((ROOT/'dist/data/books/isaiah-native-content.json').read_text(encoding='utf8'))['sources']}
    image_chapters={}
    for row in notes:
        for object_id in row[4:]:image_chapters.setdefault(object_id,[]).append(row[0])
    # Rebuild photo scope independently of existing scholarly source associations.
    for c in book['chapters']:
        c['sourceIds']=[id for id in c['sourceIds'] if id not in records]
    for s in book['sources']:
        if s.get('image'):s['imageChapters']=sorted(image_chapters.get(s['id'],[]))
    studies=[]
    for row in sorted(notes):
        chapter,verse,title,text,*objects=row
        c=book['chapters'][chapter-1]
        assert any(v['verse']==verse for v in book['scripture'][str(chapter)]),(slug,chapter,verse)
        refs=['web']
        for object_id in objects:
            if object_id.startswith('met-'):
                record=records[object_id];summary,limits=OBJECT_NOTES[object_id]
                source=dict(id=object_id,title=record['title'],url=record['url'],author='The Metropolitan Museum of Art',
                    category='museum',perspective='historical',summary=summary,limits=limits,
                    previewText=summary+' '+limits,image=copy.deepcopy(record['image']),
                    date=record['date'],objectNumber=record['objectNumber'],creditLine=record['creditLine'],
                    reviewed=dict(date='2026-10-05',scope='Museum object description, identity, date, and public-domain image metadata.'),
                    access='Public museum collection record and Open Access API',license='CC0 / Public domain')
            else:
                source=copy.deepcopy(isaiah[object_id])
                source['category']=source.get('category',source.get('type','museum'))
                source['limits']=source.get('limits',source.get('limitations','Royal claims reflect the ruler’s viewpoint.'))
                source['perspective']='historical'
                source.setdefault('author','The British Museum')
                source.setdefault('reviewed',dict(date='2026-09-29',scope='Existing Isaiah object and licensed photograph review. No new direct museum-page review claimed.'))
                if object_id=='cyrus':
                    source['url']='https://www.britishmuseum.org/collection/object/W_1880-0617-1941'
                    source['previewText']='The cylinder presents Cyrus restoring worship after taking Babylon. It does not name Judah’s returning families.'
                elif object_id=='prism-taylor':
                    source['previewText']='This clay prism presents Sennacherib’s account of his campaigns. Royal claims reflect the ruler’s viewpoint.'
                elif object_id=='lachish':
                    source['previewText']='The relief shows Sennacherib receiving the spoils of Lachish. It presents the conquest from the Assyrian king’s viewpoint.'
                    source['summary']=source['previewText']
                    source['limits']='The relief celebrates royal conquest. It does not document every event described in Kings.'
            old=next((s for s in book['sources'] if s['id']==object_id),None)
            coverage=sorted(set((old or {}).get('chapterCoverage',[])+[chapter]))
            source['chapterCoverage']=coverage
            source['imageChapters']=sorted(image_chapters[object_id])
            book['sources']=[s for s in book['sources'] if s['id']!=object_id]+[source]
            refs.append(object_id)
            if object_id not in c['sourceIds']:c['sourceIds'].append(object_id)
        c['contextNote']=dict(title=title,text=text,sourceIds=['web'],evidenceSourceIds=refs[1:])
        c['meaning']=text
        studies.append(dict(chapter=chapter,verse=verse,context=''))
    book['chapterStudies']=studies
    book['contextGuide']=dict(id=f'{slug}-context',title=f'{book["name"]}: context and evidence',
        description='Explore the book’s larger concerns through selected passages and relevant evidence.',
        steps=[dict(title=c['contextNote']['title'],text=c['contextNote']['text'],chapter=c['chapter'],
            verse=next(s['verse'] for s in studies if s['chapter']==c['chapter']),
            sourceIds=c['contextNote']['sourceIds']+c['contextNote']['evidenceSourceIds'])
            for c in book['chapters'] if c['chapter'] in set(GUIDE_CHAPTERS[slug])])
    book['review']['contextReview']=dict(date=book['review'].get('contextReviewDate','2026-10-05'),chapters=len(notes),
        scope='Original close readings grounded in local World English Bible passages. Existing external source reviews remain separate.')
    return book
