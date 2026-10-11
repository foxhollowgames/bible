"""Give added books Isaiah's map layers: nations, ancient roads, and atlas areas.

Persistent records live in scripts/book-map-context.json. Road lines that Isaiah already
has come from dist/data/content.json, so both readers draw the same corridor.
"""
import json,re
from pathlib import Path
from urllib.parse import quote
ROOT=Path(__file__).resolve().parent.parent
CONFIG=json.loads((ROOT/'scripts/book-map-context.json').read_text(encoding='utf-8'))
ISAIAH=json.loads((ROOT/'dist/data/content.json').read_text(encoding='utf-8'))
KML=(ROOT/'scripts/isaiah-geography.kml').read_text(encoding='utf-8')
JOURNEYS=json.loads((ROOT/'scripts/book-journeys.json').read_text(encoding='utf-8'))
# The reader already knows these powers and their colors.
BUILT_IN={'judah':'#8a5908','philistia':'#a4634f','egypt':'#4f8278','cush':'#7b5f8e','assyria':'#ae3924','babylonia':'#783951','persian':'#694529'}
ROAD_ARTICLES={'wiki-via-egnatia','wiki-appian-way','wiki-via-sebaste','wiki-cilician-gates','wiki-royal-road','wiki-via-maris','wiki-kings-highway'}

def _wiki(id,article,revision,summary):
    scope='route description read' if id in ROAD_ARTICLES else 'introduction read for place, dates, and rule'
    limits='Anyone can edit this source. Use it as a place to start. Disputed dates and borders need other sources.'
    return dict(id=id,title=f'{article} · Wikipedia',author='Wikipedia contributors',category='Encyclopedia background',type='Encyclopedia background',
        perspective='historical',url='https://en.wikipedia.org/wiki/'+quote(article.replace(' ','_')),summary=summary,revisionId=revision,
        revisionUrl=f'https://en.wikipedia.org/w/index.php?oldid={revision}',license='CC BY-SA 4.0',licenseUrl='https://creativecommons.org/licenses/by-sa/4.0/',
        reviewed=f"{CONFIG['reviewed']}: {scope}. Notes are short paraphrases.",limits=limits,limitations=limits)

def _sources():
    found={row[0]:_wiki(*row) for row in CONFIG['wikipedia']}
    for s in CONFIG['sources']:found[s['id']]=dict(s,type=s['category'],perspective='historical',limitations=s['limits'])
    # Road and atlas sources keep the review limits recorded for Isaiah.
    for s in ISAIAH['sources']:
        if s['id'] not in found:found[s['id']]=dict(s,category=s['type'],perspective='historical',limits=s['limitations'])
    return found
SOURCES=_sources()

def atlas_ring(name):
    """Return the atlas outline as [lat, lng] points. Isaiah uses the same first outline."""
    for label in (f'{name} (90% confidence)',name):
        m=re.search(r'<Placemark>\s*<name>'+re.escape(label)+r'</name>[\s\S]*?<outerBoundaryIs>[\s\S]*?<coordinates>([\s\S]*?)</coordinates>',KML)
        if m:return [[float(lat),float(lng)] for lng,lat in (pair.split(',')[:2] for pair in m[1].split())]
    raise ValueError(f'Atlas has no outline for {name}')

def _points(region):
    if 'points' in region:return region['points']
    if 'atlas' in region:return atlas_ring(region['atlas'])
    return next(r for r in ISAIAH['regions'] if r['id']==region['isaiahRegion'])['points']

def _color(faction):return BUILT_IN.get(faction) or CONFIG['factions'][faction]['color']

def _regions(cfg):
    out={}
    for span in cfg.get('nations',[]):
        era=CONFIG['eras'][span['era']];chapters=list(range(span['from'],span['to']+1))
        for rid,detail in era.items():
            if 'only' in span and rid not in span['only']:continue
            if rid in span.get('without',[]):continue
            detail=span.get('details',{}).get(rid,detail);base=CONFIG['regions'][rid]
            # One record per region and note. A book that crosses eras gets one record for each note.
            key=(rid,detail)
            if key not in out:
                out[key]=dict(id=f"{rid}:{span['era']}:{span['from']}",baseId=rid,faction=base['faction'],name=base['name'],points=_points(base),color=_color(base['faction']),
                    pattern=base['pattern'],summary=base['summary'],detail=detail,uncertainty=base['uncertainty'],sourceIds=base['sourceIds'],chapterCoverage=[])
                if base.get('typeLabel'):out[key]['typeLabel']=base['typeLabel']
            out[key]['chapterCoverage']+=chapters
    return list(out.values())

def _roads(cfg):
    if 'roads' not in cfg:return []
    group=CONFIG['roadSets'][cfg['roads']];new={r['id']:r for r in CONFIG['roads']};old={r['id']:r for r in ISAIAH['ancientRoads']};out=[]
    for rid in group['roads']:
        road=dict(new.get(rid) or old[rid]);road.update(CONFIG['roadText'].get(rid,{}));road['sourceIds']=list(road['sourceIds'])
        # The card shows summary and detail, so an era limit goes in both fields.
        if 'uncertainty' in group and rid in group.get('uncertaintyOnly',group['roads']) and rid not in new:
            road['uncertainty']=group['uncertainty'];road['detail']+=' '+group['detailNote']
        for notes,ids in ((group.get('notes',{}),group.get('noteSourceIds',{})),(cfg.get('roadNotes',{}),{})):
            if rid in notes:
                road['detail']+=' '+notes[rid]
                road['sourceIds']+=[i for i in ids.get(rid,['web']) if i not in road['sourceIds']]
        out.append(road)
    return out

def _areas(book):
    out=[]
    for place in book['places']:
        area=CONFIG['areas'].get(place['id'])
        if not area:continue
        ring=atlas_ring(area['atlas']);lats=[p[0] for p in ring];lngs=[p[1] for p in ring]
        # A shared id is not enough. The book's marker must sit inside the atlas outline's extent.
        if not (min(lats)-.5<=place['lat']<=max(lats)+.5 and min(lngs)-.5<=place['lng']<=max(lngs)+.5):continue
        out.append(dict(id=f"geographic:{place['id']}",placeId=place['id'],name=area['name'],points=ring,narrativeRegion=True,summary=area['summary'],sourceIds=['geo']))
    return out

def _site_source(pid,name,article,revision):
    limits='Anyone can edit this source. Use it as a place to start. The article marks the modern or excavated site.'
    return dict(id=f'wiki-site-{pid}',title=f"{article} · Wikipedia",author='Wikipedia contributors',category='Encyclopedia background',type='Encyclopedia background',
        perspective='historical',url='https://en.wikipedia.org/wiki/'+quote(article.replace(' ','_')),summary=f"The article gives the location used for {name}.",
        revisionId=revision,revisionUrl=f"https://en.wikipedia.org/w/index.php?oldid={revision}",license='CC BY-SA 4.0',
        licenseUrl='https://creativecommons.org/licenses/by-sa/4.0/',reviewed=f"{JOURNEYS['reviewed']}: site coordinates read. The article text was not reviewed.",limits=limits,limitations=limits)

def _journeys(slug,book,content):
    """Add chapter paths that join the places a book names, in the order it names them.

    A route row is [id, title, kind, "place>place", "verse-endVerse", summary, evidence].
    A gazetteer row is [name, lat, lng, article, revision, optional limit].
    """
    plan=JOURNEYS['books'].get(slug)
    if not plan:return
    note=JOURNEYS['note'].format(book=book['name']);doubt=JOURNEYS['uncertainty'].format(book=book['name'])
    have={p['id']:p for p in content['places']};focus={f['chapter']:f for f in content['chapterMaps']}
    for chapter,routes in plan['routes'].items():
        n=int(chapter);item=focus[n];bare=not item['routes']
        for rid,title,kind,stops,span,summary,evidence in routes:
            stops=stops.split('>');first,_,last=span.partition('-');first=int(first);last=int(last or first)
            for pid in stops:
                if pid in have:continue
                name,lat,lng,article,revision,*limit=JOURNEYS['gazetteer'][pid];info=plan['places'][pid]
                if isinstance(info,str):info=dict(summary=info)
                limits=limit[0] if limit else JOURNEYS['limits'];source=_site_source(pid,name,article,revision);content['sources'].append(source)
                have[pid]=dict(id=pid,name=name,lat=lat,lng=lng,summary=info['summary'],detail=info['summary'],limits=limits,uncertainty=limits,
                    sourceIds=['web',source['id']],verseScope=info.get('verseScope',{}),chapterLocation=True)
                content['places'].append(have[pid])
            full=f"{slug}-{n}-{rid}";points=[[have[pid]['lat'],have[pid]['lng']] for pid in stops]
            content['textRoutes'].append(dict(id=full,title=title,points=points,placeIds=stops,chapter=n,verse=first,endVerse=last,
                summary=summary,detail=doubt,uncertainty=doubt,evidence=evidence,kind=kind,direction=True,textRoute=True,sourceIds=['web']))
            item['routes'].append({'id':full,'from':0,'to':len(points)-1,'reference':f"{book['name']} {n}:{first}"+('' if last==first else f'–{last}')})
            for key in ('focusPlaceIds','placeIds'):item[key]=list(dict.fromkeys(item[key]+stops))
        # A chapter that had no line said so in its note. Say what the new lines show.
        if bare:
            item['note']=item['limits']=note
            for row in content['passages']+content['events']:
                if row['chapter']==n:row['uncertainty']=note

def add_map_context(slug,book,content):
    """Add the layers for one book. A book with no entry keeps its place markers only."""
    cfg=CONFIG['books'].get(slug,{})
    content['regions']=_regions(cfg);content['ancientRoads']=_roads(cfg);content['narrativeRegions']=_areas(book)
    _journeys(slug,book,content)
    used={r['faction'] for r in content['regions']}-set(BUILT_IN)
    if used:content['factions']={k:v for k,v in CONFIG['factions'].items() if k in used}
    have={s['id'] for s in content['sources']}
    for feature in content['regions']+content['ancientRoads']+content['narrativeRegions']:
        for sid in feature['sourceIds']:
            if sid not in have:content['sources'].append(SOURCES[sid]);have.add(sid)
