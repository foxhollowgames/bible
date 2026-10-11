"""Hebrew and Greek dictionary forms for glossary terms in the added books.

An entry needs the English form and the listed dictionary number in the same verse.
This is a verse-level association, not a full interlinear alignment.
"""
from pathlib import Path
import csv,re,xml.etree.ElementTree as E
ROOT=Path(__file__).resolve().parent.parent
SRC=ROOT/'scripts/lexicon-sources'
NS={'o':'http://www.bibletechnologies.net/2003/OSIS/namespace'}
OSIS={'genesis':'Gen','exodus':'Exod','leviticus':'Lev','numbers':'Num','deuteronomy':'Deut','joshua':'Josh','judges':'Judg','ruth':'Ruth','1-samuel':'1Sam','2-samuel':'2Sam','1-kings':'1Kgs','2-kings':'2Kgs','1-chronicles':'1Chr','2-chronicles':'2Chr','ezra':'Ezra','nehemiah':'Neh','esther':'Esth','job':'Job','psalms':'Ps','proverbs':'Prov','ecclesiastes':'Eccl','song-of-solomon':'Song','jeremiah':'Jer','lamentations':'Lam','ezekiel':'Ezek','daniel':'Dan','hosea':'Hos','joel':'Joel','amos':'Amos','obadiah':'Obad','jonah':'Jonah','micah':'Mic','nahum':'Nah','habakkuk':'Hab','zephaniah':'Zeph','haggai':'Hag','zechariah':'Zech','malachi':'Mal'}
BYZ={'matthew':'MAT','mark':'MAR','luke':'LUK','john':'JOH','acts':'ACT','romans':'ROM','1-corinthians':'1CO','2-corinthians':'2CO','galatians':'GAL','ephesians':'EPH','philippians':'PHP','colossians':'COL','1-thessalonians':'1TH','2-thessalonians':'2TH','1-timothy':'1TI','2-timothy':'2TI','titus':'TIT','philemon':'PHM','hebrews':'HEB','james':'JAM','1-peter':'1PE','2-peter':'2PE','1-john':'1JO','2-john':'2JO','3-john':'3JO','jude':'JUD','revelation':'REV'}
SOURCES={
    'strong':dict(id='strong',title='A Concise Dictionary of the Words in the Hebrew Bible',author='James Strong · Open Scriptures XML edition',year='1894 / digital edition',perspective='historical',category='Historical lexicon',url='https://github.com/openscriptures/strongs',summary='This dictionary lists Hebrew words in their dictionary forms. It gives the possible meanings of each word. Use it with the passage to study a word.',limits='This is an older dictionary. Compare its meanings with the passage. A list of meanings alone cannot show which one applies.',license='Source XML declares Public Domain. Only selected headwords are used.'),
    'oshb':dict(id='oshb',title='Open Scriptures Hebrew Bible',author='Open Scriptures contributors / Westminster Leningrad Codex',year='Digital edition',perspective='historical',category='Hebrew text',url='https://hb.openscriptures.org/',summary='This source gives the Hebrew text with a label for each word. This study guide uses these labels to check selected words against their verses.',limits='The app checks selected words, not every English–Hebrew match. It shows Hebrew dictionary forms. The forms in the verses can differ.',license='Hebrew text public domain; lemma/morphology data CC BY 4.0. Original work of the Open Scriptures Hebrew Bible, https://hb.openscriptures.org/.'),
    'strong-greek':dict(id='strong-greek',title='A Concise Dictionary of the Words in the Greek Testament',author='James Strong · Open Scriptures XML edition',year='1890 / digital edition',perspective='historical',category='Historical lexicon',url='https://github.com/openscriptures/strongs',summary='This dictionary lists Greek words in their dictionary forms. It gives the possible meanings of each word. Use it with the passage to study a word.',limits='This is an older dictionary. Compare its meanings with the passage. A list of meanings alone cannot show which one applies.',license='Source XML declares Public Domain. Only selected headwords are used.'),
    'byz':dict(id='byz',title='The New Testament in the Original Greek: Byzantine Textform',author='Maurice A. Robinson and William G. Pierpont',year='2018 digital edition',perspective='historical',category='Greek text',url='https://github.com/byztxt/byzantine-majority-text',summary='This edition gives a Greek New Testament text with dictionary numbers. This study guide uses these numbers to check selected words against their verses.',limits='The app checks selected words, not every English–Greek match. It shows Greek dictionary forms. The forms in the verses can differ. Other Greek editions differ in some verses.',license='Public domain.'),
}
_cache={}

def hebrew_headwords():
    if 'h' not in _cache:
        lex=E.parse(ROOT/'scripts/hebrew-strong.xml')
        _cache['h']={int(d.get('n')):d.find('o:w',NS).attrib for d in lex.findall('.//o:div[@type="entry"]',NS)}
    return _cache['h']

def greek_headwords():
    if 'g' not in _cache:
        _cache['g']={int(e.get('strongs')):e.find('greek').attrib for e in E.parse(SRC/'strongsgreek.xml').iter('entry') if e.find('greek') is not None}
    return _cache['g']

def verse_map():
    # English (KJV-style) reference -> Hebrew references. Unlisted verses have the same number.
    if 'map' not in _cache:
        table={}
        for v in E.parse(SRC/'oshb/VerseMap.xml').iter('{http://www.APTBibleTools.com/namespace}verse'):
            table.setdefault(v.get('kjv').split('!')[0],[]).append(v.get('wlc').split('!')[0])
        _cache['map']=table
    return _cache['map']

def hebrew_lemmas(slug):
    """Return {(chapter, verse): dictionary numbers} in the English verse numbers."""
    osis=OSIS[slug];tree=E.parse(SRC/f'oshb/{osis}.xml')
    by_ref={v.get('osisID'):{int(n) for w in v.findall('o:w',NS) for n in re.findall(r'\d+',w.get('lemma',''))} for v in tree.iter('{%s}verse'%NS['o'])}
    table=verse_map();moved={ref for refs in table.values() for ref in refs};out={}
    for english,refs in table.items():
        if english.startswith(osis+'.'):
            _,c,v=english.split('.');out[(int(c),int(v))]=set().union(*(by_ref.get(ref,set()) for ref in refs))
    for ref,numbers in by_ref.items():
        _,c,v=ref.split('.')
        if ref not in moved and ref not in table:out.setdefault((int(c),int(v)),numbers)
    return out

def greek_lemmas(slug):
    out={}
    with open(SRC/f'byz/{BYZ[slug]}.csv',encoding='utf-8',newline='') as f:
        for row in csv.DictReader(f):
            out[(int(row['chapter']),int(row['verse']))]={int(n) for n in re.findall(r'(?<![\w-])\d+(?![\w-])',re.sub(r'\{[^}]*\}','',row['text']))}
    return out

def candidates(table,form):
    return next((numbers for key,numbers in table.items() if key.casefold()==form.casefold()),table.get('*',[]))

def has_form(text,form):
    return re.search(r'(?<![^\W_])'+re.escape(form)+r'(?![^\W_])',text,re.I) is not None

def glossary_words(book,glossary):
    """Return (words, sources) for one book. Verse entries come before the plain entries."""
    slug=book['id'];scripture=book['scripture'];words=[];used=False
    if slug in OSIS:
        lemmas=hebrew_lemmas(slug);heads=hebrew_headwords();field='hebrew';prefix='H';language='Hebrew';source_ids=['strong','oshb','web']
        # Do not guess where the English and Hebrew verse divisions differ.
        chapters={int(c):len(vs) for c,vs in scripture.items()}
        for c,total in chapters.items():
            if max((v for (ch,v) in lemmas if ch==c),default=0)!=total:
                lemmas={key:value for key,value in lemmas.items() if key[0]!=c}
    elif slug in BYZ:
        lemmas=greek_lemmas(slug);heads=greek_headwords();field='greek';prefix='G';language='Greek';source_ids=['strong-greek','byz','web']
        for c,vs in scripture.items():
            if max((v for (ch,v) in lemmas if ch==int(c)),default=0)!=len(vs):
                lemmas={key:value for key,value in lemmas.items() if key[0]!=int(c)}
    else:
        lemmas={}
    prose=' '.join(c['summary']+' '+c['meaning'] for c in book['chapters'])
    for g in glossary:
        present=False
        # The reader ignores letter case, so “Antichrist” and “antichrist” are one form.
        for form in {m.casefold():m for m in reversed(g['matches'])}.values():
            wanted=candidates(g.get(field,{}),form) if lemmas else []
            for chapter,verses in scripture.items():
                chapter=int(chapter);hits={}
                for v in verses:
                    if not has_form(v['text'],form):continue
                    present=True
                    found=[n for n in wanted if n in lemmas.get((chapter,v['verse']),())]
                    # Two listed dictionary forms in one verse cannot be told apart at verse level.
                    if len(found)==1:hits.setdefault(found[0],[]).append(v['verse'])
                for number,verse_list in hits.items():
                    head=heads[number];used=True
                    entry=dict(id=f"glossary-{g['id']}-{chapter}-{prefix}{number}-{form.lower()}",label=g['label'],matches=[form],chapter=chapter,verses=verse_list,hebrew='',transliteration='',greek='',greekNote='',meaning=g['meaning'],grammar=f'This is the dictionary form of {language} word {prefix}{number}. The verse may use another form.',discussion='',sourceIds=source_ids,related=[],scope='glossary',strongId=f'{prefix}{number}',language=language.lower())
                    if field=='hebrew':entry.update(hebrew=head.get('lemma',''),transliteration=head.get('xlit',''))
                    else:entry.update(greek=head.get('unicode',''),greekTransliteration=head.get('translit',''))
                    words.append(entry)
        if present or any(has_form(prose,form) for form in g['matches']):
            words.append(dict(id='glossary-'+g['id'],label=g['label'],matches=g['matches'],chapter=None,verses=[],hebrew='',transliteration='',greek='',greekNote='',meaning=g['meaning'],grammar='',discussion='',sourceIds=['web'],related=[],scope='glossary',language='greek' if slug in BYZ else 'hebrew'))
    # A chapter summary has no verse. Use a verse entry there only when the chapter has one form of the term.
    for word in words:
        if word['chapter'] is None:continue
        same=[w for w in words if w['chapter']==word['chapter'] and w['label']==word['label'] and w['matches']==word['matches']]
        word['chapterDefault']=len(same)==1
    return words,[SOURCES[i] for i in source_ids[:2]] if used else []

# Names of people and places.
GENERIC={'the','mount','mountain','mountains','land','valley','river','sea','wilderness','city','king','queen','plain','plains','hill','brook','pool','gate','lake','island','region','desert','upper','lower'}
JOINING={'of','the','son','in','on','at','bar','ben'}

def _capital(text):
    return any(ch.isupper() for ch in text.lstrip("ʼʻ‘’'-")[:1])

def _plain(name):
    return re.sub(r"[\s’'‘-]",'',name).casefold()

def hebrew_names():
    """Name entries: {number: the English spellings that the dictionary lists for it}."""
    if 'hn' not in _cache:
        lex=E.parse(ROOT/'scripts/hebrew-strong.xml');out={}
        for d in lex.findall('.//o:div[@type="entry"]',NS):
            if not _capital(d.find('o:w',NS).get('xlit','')):continue
            usage=d.find('o:note[@type="translation"]',NS);first=d.find('o:list/o:item',NS)
            spellings=re.split(r'[,.;]',''.join(usage.itertext()) if usage is not None else '')
            spellings+=re.split(r'or|,',(''.join(first.itertext()) if first is not None else '').split('=')[0])
            out[int(d.get('n'))]={_plain(x) for x in spellings if x.strip()}
        _cache['hn']=out
    return _cache['hn']

def greek_names():
    if 'gn' not in _cache:
        hebrew=hebrew_names();out={}
        for e in E.parse(SRC/'strongsgreek.xml').iter('entry'):
            g=e.find('greek')
            if g is None or not _capital(g.get('translit','')):continue
            text=lambda tag:' '.join(''.join(part.itertext()) for part in e if part.tag==tag)
            spellings=re.split(r'[,.;]',text('kjv_def').replace(':--',''))+re.findall(r'\(i\.e\. ([^)]+)\)',text('strongs_def'))
            names={_plain(x) for x in spellings if x.strip()}
            # A Greek name of Hebrew origin can use the Old Testament spelling in English.
            for r in e.iter('strongsref'):
                if r.get('language')=='HEBREW':names|=hebrew.get(int(r.get('strongs')),set())
            out[int(e.get('strongs'))]=names
        _cache['gn']=out
    return _cache['gn']

def name_keys(label,person=False,greek=False):
    """The full name, then the name words that can stand for it.

    “Mountains of Ararat” gives “Ararat”, and “Antioch in Syria” gives “Antioch”.
    “Kiriath Jearim” is one name, so its words are not used alone.
    A Greek personal name such as “Simon Peter” has two names, and either can stand for the person.
    """
    head=re.split(r',| / | · ',label)[0].strip()
    parts=re.findall(r"[^\W\d_][\w’'-]*",head)
    # “Elisha’s servant at Dothan” describes a person. It is not that person’s name.
    # “Philip the evangelist” starts with a name, so the name is used.
    first=next((w for w in parts if w!='The'),'a')
    if person and (first[0].islower() or ' and ' in head) or any('’s' in w or "'s" in w for w in parts):return []
    while parts and (parts[0].casefold() in GENERIC or parts[0] in JOINING):parts=parts[1:]
    lead=[]
    for w in parts:
        if not w[0].isupper():break
        lead.append(w)
    return list(dict.fromkeys([head]+(lead if len(lead)==1 or (person and greek) else [])))

def has_name(text,key):
    # “Obed Edom” matches “Obed-Edom”. “Edom” alone does not match inside “Obed-Edom”.
    return re.search(r'(?<![\w-])'+re.escape(key).replace(r'\ ','[ -]').replace(r'\-','[ -]')+r'(?![\w-])',text,re.I) is not None

def name_word(book,label,lemmas=None,person=False):
    """Return the dictionary form for a name, or None. The name and the form must share a verse."""
    slug=book['id']
    if slug in OSIS:
        names=hebrew_names();heads=hebrew_headwords();prefix='H';language='Hebrew';source_ids=['strong','oshb']
        lemmas=lemmas if lemmas is not None else hebrew_lemmas(slug)
    elif slug in BYZ:
        names=greek_names();heads=greek_headwords();prefix='G';language='Greek';source_ids=['strong-greek','byz']
        lemmas=lemmas if lemmas is not None else greek_lemmas(slug)
    else:return None
    head=re.split(r',| / | · ',label)[0].strip()
    best=None
    for key in name_keys(label,person,slug in BYZ):
        spellings={_plain(key)}|({_plain(key[:-1])} if key.endswith('s') and len(key)>4 else set())
        counts={};example={}
        for chapter,verses in book['scripture'].items():
            for v in verses:
                if not has_name(v['text'],key):continue
                found=[n for n in lemmas.get((int(chapter),v['verse']),()) if spellings&names.get(n,set())]
                # Two listed names in one verse cannot be told apart at verse level.
                if len(found)==1:
                    counts[found[0]]=counts.get(found[0],0)+1;example.setdefault(found[0],[int(chapter),v['verse']])
        if not counts or (best and best['checkedVerses']>=max(counts.values())):continue
        number=max(counts,key=lambda n:(counts[n],-n));entry=heads[number]
        word=dict(language=language.lower(),strongId=f'{prefix}{number}',key=key,checkedVerses=counts[number],example=example[number],hebrew='',transliteration='',greek='',greekNote='',sourceIds=source_ids)
        if prefix=='H':word.update(hebrew=entry.get('lemma',''),transliteration=entry.get('xlit',''))
        else:word.update(greek=entry.get('unicode',''),greekTransliteration=entry.get('translit',''))
        if key.casefold()==head.casefold():return word
        # “Simon Peter” has two name words. Use the one that more verses name.
        word['languageNote']=f'This is the dictionary form of the name “{key}.”';best=word
    return best

def name_words(book):
    """Return ({person id: word}, {place id: word}, sources) for one book."""
    slug=book['id']
    if slug in OSIS:lemmas=hebrew_lemmas(slug);ids=['strong','oshb']
    elif slug in BYZ:lemmas=greek_lemmas(slug);ids=['strong-greek','byz']
    else:return {},{},[]
    people={p['id']:w for p in book['people'] if (w:=name_word(book,p['name'],lemmas,True))}
    places={p['id']:w for p in book['places'] if (w:=name_word(book,p['name'],lemmas))}
    return people,places,[SOURCES[i] for i in ids] if people or places else []
