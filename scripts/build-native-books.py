"""Adapt book data to the existing Isaiah reader. Do not create a second UI."""
import json,re,time
from bible_source_enrichment import enrich
from book_copy import revise
from book_context import enrich_context
from book_words import glossary_words,name_words
from book_maps import add_map_context
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
native=(D/'app.js').read_text(encoding='utf-8')
portraits=(D/'portraits.js').read_text(encoding='utf-8')
glossary=json.loads((ROOT/'scripts/book-glossary.json').read_text(encoding='utf-8'))
for entry in json.loads((OUT/'directory.json').read_text(encoding='utf-8')):
    slug=entry['id']
    if entry['status']!='ready' or slug=='isaiah':continue
    b=enrich_context(revise(enrich(json.loads((OUT/f'{slug}.json').read_text(encoding='utf-8')))));write(OUT/f'{slug}.json',b)
    name=b['name'];count=b['chapterCount'];code=b.get('bibleCode','GEN')
    art=json.loads((OUT/f'{slug}-art.json').read_text(encoding='utf-8'))
    content=dict(sources=[],passages=[],events=[],places=[],campaigns=[],ancientRoads=[],regions=[],words=[],guides=[],periods=[],chapterMaps=[],textRoutes=[],narrativeRegions=[],chapterStudies=[])
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
    # Glossary terms that occur in this book. Verse entries add a Hebrew or Greek dictionary form checked against that verse.
    content['words'],word_sources=glossary_words(b,glossary)
    # Names of people and places get the dictionary form found in a verse that names them.
    person_words,place_words,name_sources=name_words(b)
    for place in content['places']:
        if place['id'] in place_words:place['word']=place_words[place['id']]
    for s in word_sources+name_sources:
        if not any(x['id']==s['id'] for x in content['sources']):content['sources'].append(dict(s,type=s['category'],limitations=s['limits']))
    write(OUT/f'{slug}-native-content.json',content)
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
    pm=portraits
    pm=re.sub(r'export const people = \{.*?\n\};',lambda _: 'export const people = '+json.dumps(profiles,ensure_ascii=False)+';',pm,count=1,flags=re.S)
    pm=re.sub(r'const featurePeople = \{.*?\n\};',lambda _: 'const featurePeople = '+json.dumps(feature_people,ensure_ascii=False)+';',pm,count=1,flags=re.S)
    pm="const bookArt = "+json.dumps(art,ensure_ascii=False)+";\n"+pm
    pm=pm.replace("const licensedImage = portraitMode === 'non-generated' ? licensedImages[id] : null;","const licensedImage = bookArt[id] && (portraitMode !== 'non-generated' || !bookArt[id].generated) ? bookArt[id] : null;")
    pm=pm.replace("{ src: `assets/portraits/${id}-v2.png` }","{ src: '', generated:true }")
    pm=pm.replace("const imageKind = licensedImage ? 'Historical depiction' : 'Generated illustration';","const imageKind = image.generated ? 'Generated illustration' : 'Historical depiction';")
    pm=pm.replace('aria-hidden="true">${name[0]}','aria-hidden="${!!image.src}">${name[0]}')
    pm=pm.replace('aria-label="${name}: portrait failed to load"', 'aria-label="${name}: ${image.src ? \'portrait failed to load\' : \'no portrait available\'}"')
    # Match Isaiah: generated art has no repeated credit beneath each portrait.
    # Keep licensed artwork credits and descriptive image alt text.
    write_text(D/f'book-{slug}-portraits.js',pm)
    app=native.replace("'./portraits.js'",f"'./book-{slug}-portraits.js?v=20261009.6'").replace('Isaiah',name).replace('ISA${',code+'${')
    app=app.replace("const releaseVersion = '20261009.6';", "const releaseVersion = '20261009.6';")
    # Psalms uses three-digit publisher chapter filenames.
    if code=='PSA':app=app.replace("String(chapter).padStart(2, '0')", "String(chapter).padStart(3, '0')")
    # Added books have one complete Scripture source, not Isaiah's chapter sources.
    app=app.replace("const webChapter = id === 'web' ? 36 : id.match(/^web(\\d+)$/)?.[1];", "const webChapter = id.match(/^web(\\d+)$/)?.[1];\n  if (id === 'web') return chapters;")
    app=app.replace("const webId = state.chapter === 36 ? 'web' : `web${state.chapter}`;", "const webId = 'web';")
    # Hide controls for data that this book does not contain.
    app=app.replace("['history','Nations','region']].map", "['history','Nations','region']].filter(([key]) => ({places:data.places.length, regions:data.narrativeRegions?.length, campaigns:data.textRoutes?.length || data.campaigns.length, roads:data.ancientRoads.length, history:data.regions.length})[key]).map")
    # Added books have no date slider. A nation shows in the chapters its record lists.
    app=app.replace("visibleAt(region) && (state.studyMode === 'map' || (!region.chapterCoverage || region.chapterCoverage.includes(state.chapter)))", "region.chapterCoverage.includes(state.chapter)")
    # Explain empty maps and expose the actual location limits in Map context.
    app=app.replace('${focus?.narrative ? `<details><summary>Map context</summary>${esc(focus.narrative)}</details>` : \'\'}', '${!chapterPoints(data, state.chapter).length ? \'<p>This chapter has no mapped places.</p>\' : \'\'}${focus?.narrative || focus?.limits ? `<details><summary>Map context</summary>${[focus.narrative, focus.limits].filter(Boolean).map(text => `<p>${esc(text)}</p>`).join(\'\')}</details>` : \'\'}')
    app=app.replace('const url = new URL(s.url);\n    url.searchParams.set(\'t\', `${moment.seconds}s`);', 'const url = new URL(moment.url || s.url);\n    if (!moment.url) url.searchParams.set(\'t\', `${moment.seconds}s`);')
    # Some builders store review date and scope as separate fields.
    app=app.replace('esc(s.reviewed)', "esc(typeof s.reviewed === 'string' ? s.reviewed : [s.reviewed.date, s.reviewed.scope].filter(Boolean).join(': '))")
    app=app.replace('This group has four videos and five works used in them. Each note says what we checked. It also says what the source cannot prove. The video about who wrote '+name+' links to chapter 39. The other videos help with the whole book.','These notes link to relevant McClellan material. Each note states what we reviewed and what remains unverified.')
    app=app.replace('length: 66',f'length: {count}').replace('state.chapter === 66',f'state.chapter === {count}')
    app=app.replace("'isaiah-study-guide-state'",f"'{slug}-native-study-state'").replace("localStorage.getItem('meridian-state')", "null")
    app=app.replace("'data/content.json'",f"'data/books/{slug}-native-content.json'").replace("'data/scripture.json'",f"'data/books/{slug}-native-scripture.json'").replace("'data/portrait-images.json'",f"'data/books/{slug}-art.json'")
    app=app.replace('date: -701','date: 1').replace("const label = chapterDateLabel();", "const label = data.passages.find(p => p.chapter === state.chapter)?.dateLabel || 'Historical dating uncertain';")
    app=app.replace('Generated portraits are illustrations. They do not establish actual appearance.','Portraits are illustrations or later historical art. We do not know how these people looked.')
    # General source summaries belong in the source dialog, not below each chapter.
    a=app.index('function sourceInsightsHtml(');z=app.index('function scriptureExcerptHtml(',a)
    app=app[:a]+"function sourceInsightsHtml(ids = [], chapter = state.chapter) { return sourceMediaHtml(ids, {chapter}); }\n"+app[z:]
    app=app.replace('options.images !== false && item.image &&', 'options.images !== false && (options.allExcerpts || !(item.imageChapters || item.chapterCoverage) || (item.imageChapters || item.chapterCoverage).includes(Number(chapter))) && item.image &&')
    # Original, passage-specific interpretation is distinct from generic source summaries.
    app=app.replace('${chapterEvidenceHtml()}${sourceInsightsHtml(ids)}', '${chapterContextHtml()}${chapterEvidenceHtml()}${sourceInsightsHtml(ids)}')
    app += "\nfunction chapterContextHtml(chapter = state.chapter) {\n  const passage = data.passages.find(p => p.chapter === Number(chapter));\n  const note = passage?.contextNote;\n  if (!note) return '';\n  return `<section class=\"chapter-context-note\"><h3>${esc(note.title)}</h3><p>${esc(note.text)}${passageFootnotes(passage)(note.sourceIds)}</p></section>`;\n}\n"
    a=app.index('function chapterDateHtml()');z=app.index('function renderScripture()',a)
    app=app[:a]+"function chapterDateHtml() { return ''; }\n"+app[z:]
    # Keep the footer's shared art note; avoid repeated date and art warnings in profiles.
    pm=(D/f'book-{slug}-portraits.js').read_text(encoding='utf8')
    pm=pm.replace('<div><dt>Estimated lifespan</dt><dd>${escapeHtml(person.life)}</dd></div>','')
    pm=pm.replace('<div><dt>Known for</dt><dd>${linkHtml(person.role)}</dd></div>','')
    pm=pm.replace('<div><dt>Key locations</dt><dd>${person.locations.map(linkHtml).join(\' · \')}</dd></div>', '${person.locations.length ? `<div><dt>Key locations</dt><dd>${person.locations.map(linkHtml).join(\' · \')}</dd></div>` : ""}')
    pm=pm.replace('<p class="profile-date-note"><strong>Date note.</strong> ${linkHtml(person.dateNote)}</p>','')
    pm=pm.replace('<p class="profile-portrait-note">Portraits are illustrations or later historical depictions. They do not show the person’s known appearance.</p>','')
    write_text(D/f'book-{slug}-portraits.js',pm)
    app=app.replace('Natural Earth · Terrain: Mapzen / USGS / NOAA · Places: <a href="https://www.openbible.info/geo/">OpenBible.info</a> / <a href="https://www.openstreetmap.org/copyright">OSM contributors</a>','Natural Earth · Terrain: Mapzen / USGS / NOAA · Place sources: see study notes')
    app=app.replace("$('#timelineRange').addEventListener('input', e => { state.date = Number(e.target.value); renderTimeline(); drawOverlays(); persist(); });", "$('#timelineRange').min=1; $('#timelineRange').max=chapters.length; $('#timelineRange').setAttribute('aria-label','Chapter in narrative order');\n  $('#timelineRange').addEventListener('input', e => { selectChapter(Number(e.target.value)); focusChapterMap(); });")
    app=app.replace("state.date = Math.round((p.start + p.end) / 2); renderTimeline(); drawOverlays(); persist();", "selectChapter(Math.round((p.start + p.end) / 2)); focusChapterMap();")
    app=re.sub(r'function renderTimeline\(\) \{.*?\n\}',lambda _: "function renderTimeline() {\n  $('#timelineRange').value=state.chapter; $('#timelineRange').setAttribute('aria-valuetext',`"+name+" ${state.chapter}`); $('#timelineChapter').textContent='Chapter order'; $('#dateLabel').value=`"+name+" ${state.chapter} · ${activePassage()?.title || ''}`; $('#returnPassage').classList.add('hidden'); $('#timelineTooltip').textContent=`"+name+" ${state.chapter}`;\n}",app,count=1,flags=re.S)
    app=app.replace('tooltip.textContent = `${Math.abs(Number(range.value))} BCE`;',f'tooltip.textContent = `{name} ${{range.value}}`;')
    app=app.replace('function selectEvent(event) { state.date = Number(event.year); renderTimeline(); drawOverlays(); persist(); openFeature(event, true, null); }','function selectEvent(event) { selectChapter(event.chapter); focusChapterMap(); openFeature(event,true,null); }')
    app=app.replace("return state.studyMode === 'map' ? data.campaigns.filter(visibleAt) : focusedRoutes();",'return focusedRoutes();')
    app=app.replace("state.studyMode === 'map' ? visibleAt(p) : chapterPlaceVisible(p)",'chapterPlaceVisible(p)')
    # Use Isaiah's existing inline entity controls and return navigation for the new profiles.
    start=app.index('  const candidates = eligibleWords(v);',app.index('function renderVerse'))
    end=app.index('\n',start);app=app[:start]+'  const text = linkedEntityHtml(v.text, {verse:v.verse}) + (v.publisherNote ? `<span class="verse-publisher-note"><strong>Publisher note.</strong> ${esc(v.publisherNote)}</span>` : "");'+app[end:]
    app=app.replace("${esc(p.summary)}${cite(ids)}", "${linkedEntityHtml(p.summary)}${cite(ids)}")
    app=app.replace('for (const [id, person] of Object.entries(people)) {','for (const [id, person] of Object.entries(people)) {\n    if (!person.chapterIds.includes(state.chapter)) continue;')
    app=app.replace('function entityLinkTerms() {','function entityLinkTerms(verse = null) {')
    # A verse links to the entry checked for that verse. Other text uses the chapter entry or the plain entry.
    app=app.replace("const words = data.words.filter(word => word.scope === 'glossary' || Number(word.chapter) === state.chapter);", "const words = data.words.filter(word => word.chapter == null || (Number(word.chapter) === state.chapter && (verse == null ? word.chapterDefault : word.verses.includes(verse))));")
    app=app.replace("for (const label of [word.label, ...(word.matches || [])]) add(label, 'word', word.id, word.label);", "for (const label of word.chapter == null ? [word.label, ...(word.matches || [])] : word.matches) add(label, 'word', word.id, word.label);")
    app=app.replace('entityLinkCache.chapter === state.chapter && entityLinkCache.terms.length','entityLinkCache.chapter === state.chapter && entityLinkCache.verse === verse && entityLinkCache.terms.length')
    app=app.replace('entityLinkCache = {chapter:state.chapter, terms:','entityLinkCache = {chapter:state.chapter, verse, terms:')
    app=app.replace('const terms = entityLinkTerms().filter(', 'const terms = entityLinkTerms(options.verse ?? null).filter(')
    app=app.replace("const name = mapDisplayName(feature.name || feature.title || '');", "const scope = feature.verseScope?.[state.chapter];\n    if (verse != null && scope && !scope.includes(verse)) continue;\n    const name = mapDisplayName(feature.name || feature.title || '');")
    app=app.replace("for (const label of [person.name, ...(person.linkNames || [])]) add(label, 'person', id, person.name);", "const scope = person.verseScope?.[state.chapter];\n    if (verse != null && scope && !scope.includes(verse)) continue;\n    const aliases = verse == null && scope ? [] : (person.linkNames || []);\n    for (const label of [person.name, ...aliases]) add(label, 'person', id, person.name);")
    app=app.replace('const start = match.index, end = start + match[0].length;',"const start = match.index, end = start + match[0].length;\n    if (/(?:Tubal|Uzzen|Obed)[ -]$/i.test(text.slice(0,start))) continue;")
    write_text(D/f'book-{slug}-app.js',app)
    print(f'Adapted {name} to Isaiah UI.')
html=(D/'index.html').read_text(encoding='utf-8')
html=re.sub(r'  <meta (?:property="og:[^\n]+|name="twitter:[^\n]+)\n','',html)
html=re.sub(r'  <link rel="canonical"[^\n]+\n','',html)
html=html.replace('<title>Isaiah Study Guide</title>','<title>Bible Study Guide</title>').replace('<b>ISAIAH<small>STUDY GUIDE</small></b>','<b id="bookBrand">BIBLE<small>STUDY GUIDE</small></b>')
html=html.replace('app.js?v=20261009.6','native-book.js?v=20261009.6')
html=html.replace('<span class="map-label label-assyria">ASSYRIA</span><span class="map-label label-judah">JUDAH</span>','')
write_text(D/'book.html',html)
