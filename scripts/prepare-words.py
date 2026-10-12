"""Curated associations, checked against OSHB verse lemmas; not exhaustive alignment."""
from pathlib import Path
import json, re, xml.etree.ElementTree as E
ROOT=Path(__file__).resolve().parent.parent
NS={'o':'http://www.bibletechnologies.net/2003/OSIS/namespace'}
lex=E.parse(ROOT/'scripts/hebrew-strong.xml')
headwords={int(d.get('n')):d.find('o:w',NS).attrib for d in lex.findall('.//o:div[@type="entry"]',NS)}
hb=E.parse(ROOT/'scripts/Isa.xml')
verses={v.get('osisID'):v for v in hb.findall('.//o:verse',NS)}
words=[]
scripture=json.loads((ROOT/'dist/data/books/isaiah-native-scripture.json').read_text(encoding='utf-8'))['chapters']

def tokens(text):
    return {re.sub(r'^\W+|\W+$', '', token).casefold() for token in text.split()}

def lemma_ids(verse):
    return {int(number) for w in verse.findall('o:w',NS) for number in re.findall(r'\d+',w.get('lemma',''))}

def hebrew_verse(chapter, verse):
    # OSHB follows Hebrew numbering; the reading pane follows English numbering.
    if chapter==9:
        chapter,verse=(8,23) if verse==1 else (9,verse-1)
    elif chapter==64:
        chapter,verse=(63,19) if verse==1 else (64,verse-1)
    return verses[f'Isa.{chapter}.{verse}']
def word(id,label,matches,chapter,verse_list,strong,greek,meaning,discussion,greeknote='',related=None):
    # Check each verse where the English selection can actually appear.
    english=scripture[str(chapter)]
    for verse_number in verse_list:
        text=next(v['text'] for v in english if v['verse']==verse_number)
        if not any(re.search(r'\b'+re.escape(m)+r'\b',text,re.I) for m in matches):
            continue
        v=hebrew_verse(chapter,verse_number)
        found=any(str(strong) in re.findall(r'\d+',w.get('lemma','')) for w in v.findall('o:w',NS))
        assert found,(id,chapter,verse_number,strong)
    entry=headwords[strong]
    words.append(dict(id=id,label=label,matches=matches,chapter=chapter,verses=verse_list,hebrew=entry.get('lemma',''),transliteration=entry.get('xlit',''),greek=greek,greekNote=greeknote,meaning=meaning,grammar=f'This is the dictionary form of Hebrew word H{strong}. The verse may use another form.',discussion=discussion,sourceIds=['strong','oshb',f'lxx{chapter}','web' if chapter==36 else f'web{chapter}'],related=related or []))
    words[-1]['strongId']=f'H{strong}'

word('king','King',['King','king'],36,[1],4428,'βασιλεὺς','A ruler. The verse names both Judah’s king and the Assyrian king.','Both men have the title king, but they are not equal. In verse 4, Rabshakeh calls his master “the great king.”')
word('hezekiah','Hezekiah',['Hezekiah'],36,[1,2,3,4,5,7,14,15,16,18,22],2396,'Ἑζεκίου','The king of Judah in this account.',"")
word('sennacherib','Sennacherib',['Sennacherib'],36,[1],5576,'Σενναχηρεὶμ','The king of Assyria. In verse 1, he attacks the fortified cities of Judah.',"")
word('assyria','Assyria',['Assyria'],36,[1,2,4,6,8,9,13,15,16,18,20],804,'Ἀσσυρίων','The empire that threatens Judah.',"The Hebrew names the land, Assyria. The Greek phrase names the people: king of the Assyrians.")
word('judah','Judah',['Judah'],36,[1,7],3063,'Ἰουδαίας','The southern kingdom in this passage.','Judah can also name an ancestor, a people, or a land. Here it has fortified cities, so it means the kingdom.')
word('rabshakeh','Rabshakeh',['Rabshakeh'],36,[2,4,11,12,13,22],7262,'Ῥαβσάκην','An Assyrian official’s title. The translation uses an English spelling of its sounds.','Strong’s Hebrew dictionary explains Rabshakeh as “chief cupbearer.” This official served drinks to the king. In Isaiah 36, he speaks for the Assyrian king. He urges Jerusalem to surrender.')
word('lachish','Lachish',['Lachish'],36,[2],3923,'Λαχεὶς','A fortified city of Judah. The Assyrian king sends Rabshakeh from there to Jerusalem.',"")
word('jerusalem','Jerusalem',['Jerusalem'],36,[2,7,20],3389,'Ἰερουσαλὴμ','Judah’s royal and temple city.',"In Isaiah 36:2, the Hebrew word has an ending that means toward Jerusalem. English shows this direction with the separate word “to.”")
word('army','Army',['army'],36,[2],2426,'δυνάμεως','A force of soldiers in this verse.','The Hebrew word can mean force or strength. Here it means the soldiers the king sends. The Greek word can also mean power or force.')
word('aqueduct','Aqueduct',['aqueduct'],36,[2],8585,'ὑδραγωγῷ','A channel that carries water.',"")
word('pool','Pool',['pool'],36,[2],1295,'κολυμβήθρας','A water pool or reservoir.',"")
word('confidence','Confidence',['confidence'],36,[4],986,'πεποιθὼς','Something a person relies on. Rabshakeh asks what Hezekiah relies on.',"Isaiah 36:4 uses the Hebrew noun for confidence. The same question uses the related verb for trust. The pair opens the main question: whom can Judah trust?",'Swete’s text uses πεποιθὼς in verse 4. This verb form expresses trust in a question. It is not a noun like “confidence.”')
word('trust','Trust',['trust'],36,[4,5,6,7,9,15],982,'πέποιθας','To rely on someone or something.',"Rabshakeh attacks trust in Egypt’s army in Isaiah 36:6 and 9. He attacks trust in the LORD’s rescue in verse 15. His speech attacks both reasons for resisting Assyria.",'This form comes from verse 5. The Greek verb has different forms elsewhere in the chapter.')
word('egypt','Egypt',['Egypt'],36,[6,9],4714,'Αἴγυπτον','The country to the southwest of Judah. Rabshakeh says Judah trusts it for help.','Rabshakeh calls Egypt a bruised reed. He says it will pierce the hand of a man who leans on it.')
word('aramaic','Aramaic',['Aramaic'],36,[11],762,'Συριστί','The language Hezekiah’s officials ask Rabshakeh to speak.','The officials understand Aramaic. They do not want the people on the wall to hear. Rabshakeh keeps speaking in the Jews’ language.','The Greek word Συριστί names the language. It does not refer to a modern country.')
word('judean','Jews’ language',['Jews'],36,[11,13],3066,'Ἰουδαιστί','In Judean, the language the people on the wall speak. This translation says “the Jews’ language.”',"One Hebrew word matches the English phrase “the Jews’ language.” In Isaiah 36:13, Rabshakeh speaks directly to the people on the wall.")
word('remnant','Remnant',['remnant'],37,[4,32],7611,'καταλελιμμένων','The people who remain after a disaster or loss.',"In Isaiah 37:4, Hezekiah asks for prayer for the survivors. In verses 31–32, they take root again and bear fruit. The picture shows survivors who start to grow again.",'This Greek form comes from verse 4 and means those left. Verse 32 uses another form. Verse 31 uses different Hebrew wording, so this note does not cover it.')
word('spirit','Spirit',['spirit'],37,[7],7307,'πνεῦμα','A spirit or state of mind. God says he will put it in the Assyrian king.',"The Hebrew word can mean wind, breath, or spirit. In Isaiah 37:7, the Assyrian king then hears news and returns home.")
word('shadow','Shadow',['shadow'],38,[8],6738,'σκιὰν','A shadow. As a sign for Hezekiah, God makes it return ten steps.',"")
word('steps','Steps / sundial',['steps','sundial'],38,[8],4609,'ἀναβαθμούς','Steps or degrees. Some translations use “sundial” for the structure where the shadow appears.','The World English Bible says “sundial” where the Hebrew speaks of steps. The Hebrew does not describe a round clock face.')
word('sheol','Sheol',['Sheol'],38,[10,18],7585,'ᾅδου','The place of the dead in Hezekiah’s poem.',"Isaiah 38:18–19 contrasts the dead with the living. The dead cannot praise God, but the living can. Hezekiah gives praise after God saves him from death.",related=[{'label':'Matthew 16:18 — gates of Hades','url':'https://ebible.org/engwebp/MAT16.htm#V18','note':'A later verse with a similar picture. This note does not claim that Matthew quotes Isaiah 38.'}])
word('soul','Soul / life',['soul'],38,[17],5315,'ψυχὴν','Hezekiah’s life or self. God delivers it from the pit.',"Isaiah 38:17 names two acts of God. He saves Hezekiah’s life. He also casts Hezekiah’s sins behind his back.")
word('sins','Sins',['sins'],38,[17],2399,'ἁμαρτίας','Wrong acts.',"In Isaiah 38:17, God casts Hezekiah’s sins behind his back. This picture expresses forgiveness. The same verse thanks God for saving Hezekiah’s life.")
word('babylon','Babylon',['Babylon'],39,[1,3,6,7],894,'Βαβυλωνίας','The city and kingdom of the visitors. Isaiah also names Babylon in his warning about the future.',"Babylon sends a gift in Isaiah 39:1. In verse 6, Judah’s lost treasures will go to Babylon. The warning concerns the same wealth Hezekiah showed the visitors.",'This form comes from verse 1. Later verses use other word forms and names for the people.')
word('eunuchs','Eunuchs',['eunuchs'],39,[7],5631,'σπάδοντας','Servants in a king’s court. The word can mean eunuchs or officials.',"In Isaiah 39:7, Hezekiah’s descendants serve in the Babylonian king’s palace. Sons of Judah’s royal family will serve a foreign king.")
word('peace','Peace',['peace'],39,[8],7965,'εἰρήνη','Peace or well-being in Hezekiah’s days.',"Isaiah 39:8 says that Hezekiah expects peace in his own days. He says this after hearing that his descendants will be taken away. His answer sets safety now beside the loss Isaiah says will come.")
word('truth','Truth / stability',['truth'],39,[8],571,'δικαιοσύνη','Firmness or faithfulness.',"Hezekiah names this word with peace in Isaiah 39:8. Together they can suggest steady, safe years while he lives.",'Swete’s Greek uses δικαιοσύνη, which commonly means righteousness or justice. The Hebrew and Greek words do not mean the same thing.')

# Selected additions use the checked Hebrew text only. No Greek match is implied.
additional=[
    (1,17,'Justice','justice',4941,'A just decision or the practice of justice.','The next commands name the oppressed, the fatherless, and the widow.'),
    (6,3,'Holy','Holy',6918,'Holy or sacred.','In the vision, one calls “Holy” three times. Then he says the LORD’s glory fills the earth.'),
    (7,14,'Sign','sign',226,'A sign or a mark.','Ahaz will not ask for a sign in verse 12. The Lord gives one in verse 14. Two kings threaten Judah at this time.'),
    (10,21,'Remnant','remnant',7605,'What remains after loss.','The remnant of Jacob will return to the mighty God.'),
    (11,1,'Shoot','shoot',2415,'A twig or shoot.','A shoot comes out of the stock of Jesse. Verse 2 says the LORD’s Spirit will rest on him.'),
    (12,2,'Salvation','salvation',3444,'Deliverance or rescue.','The song joins salvation with trust, strength, and the end of fear.'),
    (28,16,'Stone','stone',68,'A stone.','God lays this stone in Zion as a sure foundation.'),
    (29,11,'Book','book',5612,'A written document or scroll.','The vision is like a sealed book that no one can read. The ancient object need not be a bound book.'),
    (30,15,'Rest','rest',5183,'Rest or quietness.','God says returning and rest will save the people. They refuse.'),
    (35,1,'Wilderness','wilderness',4057,'Open country or wilderness.','The wilderness and the dry land will be glad. The desert will blossom like a rose.'),
    (40,1,'Comfort','Comfort',5162,'To comfort or console in this verse.','God gives the command twice: “Comfort, comfort my people.”'),
    (42,1,'Servant','servant',5650,'A servant.','God says this servant will bring justice to the nations. The word alone does not say who the servant is.'),
    (43,1,'Redeemed','redeemed',1350,'To redeem or reclaim.','God tells Israel not to be afraid. He created Israel, called it by name, and says, “You are mine.”'),
    (45,1,'Anointed','anointed',4899,'An anointed person.','Here the LORD gives the title to Cyrus. The word alone does not make every anointed person the same person.'),
    (48,18,'Peace','peace',7965,'Peace, welfare, or well-being.','God says the people did not listen to his commandments. If they had, their peace would have been like a river.'),
    (53,4,'Sickness','sickness',2483,'Sickness or illness.','The speakers say he bore their sickness. They had thought God struck him. Translations and later readers add to the dictionary meaning.'),
    (54,10,'Covenant','covenant',1285,'A covenant or binding relationship.','The mountains may depart and the hills be removed. God’s covenant of peace will not be removed.'),
    (55,1,'Waters','waters',4325,'Water.','God invites everyone who thirsts to come to the waters. They may buy wine and milk without money.'),
    (56,7,'Prayer','prayer',8605,'Prayer.','God calls his house a house of prayer for all peoples.'),
    (58,6,'Fast','fast',6685,'A fast: a time of going without food.','God chooses a fast that lets the oppressed go free. Verse 7 adds bread for the hungry and clothes for the naked.'),
    (61,1,'Liberty','liberty',1865,'Liberty or release.','The speaker is sent to proclaim liberty to the captives. He also preaches good news and binds up the broken hearted.'),
    (65,17,'New','new',2319,'New or fresh.','God says he creates new heavens and a new earth. The word “new” describes both.'),
    (66,2,'Spirit','spirit',7307,'Spirit, breath, or wind.','Here it describes a person. God looks to the one who is “poor and of a contrite spirit.”'),
]
for chapter,verse,label,match,strong,meaning,discussion in additional:
    word(f'isaiah-{chapter}-{match.lower()}',label,[match],chapter,[verse],strong,'',meaning,discussion)
    words[-1]['sourceIds']=['strong','oshb',f'web{chapter}']

# Passage-specific Greek forms must not be copied into other chapters.
word('isaiah-7-king','King',['king','kings'],7,[1,6,16,17,20],4428,'βασιλεὺς','A king. The chapter names kings of Judah, Syria, Israel, and Assyria.','Kings on both sides of the war have the same title.','The displayed form occurs in verse 1. Verses 16, 17, and 20 use other forms. Verse 6 uses the related verb βασιλεύσομεν.')
word('isaiah-7-believe','Believe',['believe','established'],7,[9],539,'πιστεύσητε','To believe or trust. Another form of the same Hebrew word means to be established.','The verse uses both forms. Those who will not believe will not be established.','This form matches believe. The Greek ends with συνῆτε, meaning understand, where the English has established.')
word('isaiah-7-virgin','Virgin / young woman',['virgin'],7,[14],5959,'παρθένος','The Hebrew word means a young woman old enough to marry. This English translation uses virgin.','The word is part of the sign the Lord gives the house of David. A dictionary alone cannot say who the woman or the child is.','The Greek uses παρθένος, commonly translated virgin.')
word('isaiah-7-immanuel','Immanuel',['Immanuel'],7,[14],6005,'Ἐμμανουήλ','The name means God with us.','The son in the sign receives this name. Two kings threaten Judah at this time.','The Greek gives the Hebrew name in Greek letters.')
sign=next(w for w in words if w['id']=='isaiah-7-sign')
sign.update(verses=[11,14],greek='σημεῖον',greekNote='This form occurs in verses 11 and 14.',sourceIds=['strong','oshb','lxx7','web7'])

# Match complete displayed tokens, then require the Hebrew dictionary number
# in that same verse. Existing passage notes take priority over general entries.
covered={(w['chapter'],v,m.casefold()) for w in words for v in w['verses'] for m in w['matches']}
catalog=json.loads((ROOT/'scripts/word-catalog.json').read_text(encoding='utf-8'))
for strong,label,aliases,meaning in catalog:
    for chapter,chapter_verses in scripture.items():
        chapter=int(chapter)
        for match in aliases.split('|'):
            hits=[v['verse'] for v in chapter_verses
                  if match.casefold() in tokens(v['text'])
                  and strong in lemma_ids(hebrew_verse(chapter,v['verse']))
                  and (chapter,v['verse'],match.casefold()) not in covered]
            if not hits:
                continue
            word(f'lex-{chapter}-{strong}-{match.lower()}',label,[match],chapter,hits,strong,'',meaning,
                 '')
            words[-1].update(scope='dictionary',sourceIds=['strong','oshb','web' if chapter==36 else f'web{chapter}'])
            covered.update((chapter,v,match.casefold()) for v in hits)

out=ROOT/'dist/data/books/isaiah-native-content.json'; content=json.loads(out.read_text(encoding='utf-8')); content['words']=words
if not any(s['id']=='lxx7' for s in content['sources']):
    template=next(s for s in content['sources'] if s['id']=='lxx36')
    content['sources'].append({**template,'id':'lxx7','title':'Isaiah 7 — Swete’s Septuagint','url':'https://biblehub.com/sepd/isaiah/7.htm'})
background = {
    'sennacherib':['wiki-sennacherib'], 'hezekiah':['wiki-hezekiah'],
    'lachish':['wiki-lachish','wiki-lachish-siege'], 'babylon':['wiki-exile','wiki-merodach'],
}
source_ids={source['id'] for source in content['sources']}
for entry in words:
    entry['sourceIds'] += [sid for sid in background.get(entry['id'],[]) if sid in source_ids]
out.write_text(json.dumps(content,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Prepared {len(words)} curated word studies with Hebrew lemma checks.')
