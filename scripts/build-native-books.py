"""Write each book's reader data. One reader serves every book. Do not create a second UI."""
import json,re,time
from bible_source_enrichment import enrich
from book_copy import revise
from book_context import enrich_context
from book_words import glossary_words,name_words
from book_maps import add_map_context
from book_dates import add_date_bands
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
D=ROOT/'dist';OUT=D/'data/books'
def write_text(path,text):
    for attempt in range(4):
        try:
            path.write_text(text,encoding='utf-8')
            return
        except OSError as error:
            if error.errno not in (13,22) or attempt==3:raise
            time.sleep(0.15*(attempt+1))
def write(path,value):write_text(path,json.dumps(value,ensure_ascii=False,indent=2)+'\n')
glossary=json.loads((ROOT/'scripts/book-glossary.json').read_text(encoding='utf-8'))
for entry in json.loads((OUT/'directory.json').read_text(encoding='utf-8')):
    slug=entry['id']
    # A book with no record here has its own builder for the same reader files.
    if entry['status']!='ready' or not (OUT/f'{slug}.json').exists():continue
    b=enrich_context(revise(enrich(json.loads((OUT/f'{slug}.json').read_text(encoding='utf-8')))));write(OUT/f'{slug}.json',b)
    name=b['name'];count=b['chapterCount'];code=b.get('bibleCode','GEN')
    # The reader takes the book's name and settings from this record.
    settings=dict(id=slug,name=name,bibleCode=code,chapterCount=count,chapterDigits=3 if code=='PSA' else 2,verseLinks='entities',mapLimits=True)
    content=dict(book=settings,sources=[],passages=[],events=[],places=[],campaigns=[],ancientRoads=[],regions=[],words=[],guides=[],periods=[],chapterMaps=[],textRoutes=[],narrativeRegions=[],chapterStudies=[])
    for s in b['sources']:
        content['sources'].append(dict(s,type=s.get('type',s['category']),limitations=s['limits'],license=s.get('license','Public domain' if s['id']=='web' else 'Linked source. Original guide summaries.')))
    for p in b['places']:
        content['places'].append(dict(p,name=p['name'].split(' / ')[0].split(' · ')[0],detail=p['summary'],uncertainty=p['limits'],chapterLocation=True))
    content['chapterStudies']=b['chapterStudies']
    feature_people={}
    for c in b['chapters']:
        n=c['chapter'];eid=f'{slug}-{n}';refs=c['sourceIds'];total=len(b['scripture'][str(n)])
        introduction=c['summary'] if c.get('contextNote') else c['summary']+' '+c['meaning']
        content['passages'].append(dict(id=eid,chapter=n,start=1,end=total,title=c['title'],summary=introduction,year=None,dateLabel=c['dateLabel'],uncertainty=c['mapNote'],placeIds=c['places'],sourceIds=refs,lds=c['lds']))
        event=dict(id=eid,chapter=n,verse=1,eventOrder=n,title=c['title'],summary=c['summary'],detail=c['meaning'],dateLabel=c['dateLabel'],uncertainty=c['mapNote'],sourceIds=refs,placeIds=c['places'],lds=c['lds'])
        content['events'].append(event);feature_people[eid]=c['people']
        if c.get('contextNote'):
            content['passages'][-1]['contextNote']=c['contextNote']
            event['detail']=c['contextNote']['text']
        focus=dict(chapter=n,focusPlaceIds=c['places'],placeIds=c['places'],routes=[],contextRoutes=[],contextPlaceIds=[],impacts=[],maxZoom=7,note=c['mapNote'],narrative=c['summary'],limits=c['mapNote'],sourceIds=refs)
        if len(c['route'])>1:
            points=[[next(p for p in b['places'] if p['id']==pid)[axis] for axis in ['lat','lng']] for pid in c['route']]
            rid=f'{eid}-journey';route=dict(id=rid,title=c['title'],points=points,chapter=n,verse=1,summary=c['summary'],detail=c['meaning'],uncertainty=c.get('routeEvidence',c['mapNote']),evidence=c.get('routeEvidence',c['mapNote']),kind='flight' if 'flee' in c['summary'].lower() else 'journey',direction=True,textRoute=True,sourceIds=refs)
            content['textRoutes'].append(route);feature_people[rid]=c['people'];focus['routes'].append(dict(id=rid,from_=0,to=len(points)-1,reference=f'{name} {n}:1'))
            focus['routes'][-1]['from']=focus['routes'][-1].pop('from_')
        content['chapterMaps'].append(focus)
    # Keep the existing three-button timeline layout. These are chapter sections, not fabricated years.
    step=max(1,count//3)
    for i,(a,z) in enumerate([(1,step),(step+1,step*2),(step*2+1,count)]):content['periods'].append(dict(id=f'part-{i}',label=f'{name} {a}–{z}',start=a,end=z,description='Chapter order'))
    content['guides']=[b['contextGuide']]
    # Nations, ancient roads, and atlas areas come from scripts/book-map-context.json.
    add_map_context(slug,b,content)
    # Chapter date labels come from scripts/book-date-bands.json.
    add_date_bands(slug,content)
    # Glossary terms that occur in this book. Verse entries add a Hebrew or Greek dictionary form checked against that verse.
    content['words'],word_sources=glossary_words(b,glossary)
    # Names of people and places get the dictionary form found in a verse that names them.
    person_words,place_words,name_sources=name_words(b)
    for place in content['places']:
        if place['id'] in place_words:place['word']=place_words[place['id']]
    for s in word_sources+name_sources:
        if not any(x['id']==s['id'] for x in content['sources']):content['sources'].append(dict(s,type=s['category'],limitations=s['limits']))
    write(OUT/f'{slug}-native-scripture.json',dict(translation=b['translation'],copyright=b['copyright'],chapters=b['scripture']))
    profiles={p['id']:dict(name=p['name'],role=p['role'],life=p['life'],dateNote='Historical life dates remain uncertain.',locations=[next(q for q in b['places'] if q['id']==pid)['name'] for pid in p.get('placeIds',[])],passages=[p['passages']],importance=p['meaning'],connections=p['relations'],verseScope=p.get('verseScope',{})) for p in b['people']}
    for p in b['people']:
        labels=p['name'].split(' / ')
        profiles[p['id']]['name']=labels[0]
        profiles[p['id']]['linkNames']=p.get('linkNames',[label for label in labels[1:] if label not in ['Israel','Edom']])
        chapter_ids=set(c['chapter'] for c in b['chapters'] if p['id'] in c['people'])
        for m in re.finditer(r'(?:'+re.escape(name)+r'\s+|;\s*)(\d+)(?:[–-](\d+))?(?=:|;|$)',p['passages']):chapter_ids.update(range(int(m[1]),int(m[2] or m[1])+1))
        profiles[p['id']]['chapterIds']=sorted(chapter_ids)
        if p['id'] in person_words:profiles[p['id']]['word']=person_words[p['id']]
    for s in content['sources']:
        if s.get('group')=='sennacherib-prism' and 'sourceGroups' not in content:
            content['sourceGroups']=[dict(id='sennacherib-prism',title='Sennacherib’s Prism',description='Museum records, a free scholarly edition, and a public-domain photograph.')]
    write(OUT/f'{slug}-native-content.json',content)
    write(OUT/f'{slug}-people.json',dict(featurePeople=feature_people,people=profiles))
    print(f'Wrote reader data for {name}.')
