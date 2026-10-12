"""Build the Bible directory and the reviewed Genesis content. Keep publisher text cached."""
import json, re, html, urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'dist/data/books'
OUT.mkdir(parents=True, exist_ok=True)
OT = 'Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi'.split('|')
NT = 'Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation'.split('|')
books = []
for testament, names in [('Old Testament', OT), ('New Testament', NT)]:
    for name in names:
        slug = name.lower().replace(' ', '-')
        books.append(dict(id=slug, name=name, testament=testament, status='ready' if slug == 'genesis' or (OUT/f'{slug}-native-content.json').exists() else 'planned', url=f'{slug}.html'))
(OUT / 'directory.json').write_text(json.dumps(books, indent=2)+'\n', encoding='utf-8')

def get(url):
    req=urllib.request.Request(url, headers={'User-Agent':'BibleStudyGuide/1.0 (educational source review)'})
    with urllib.request.urlopen(req, timeout=40) as r: return r.read().decode('utf-8')
def chapter_text(n):
    cache=ROOT / f'scripts/genesis{n}-source.html'
    if not cache.exists(): cache.write_text(get(f'https://ebible.org/engwebp/GEN{n:02}.htm'), encoding='utf-8')
    raw=cache.read_text(encoding='utf-8')
    # A verse ends at the next verse or the end of the publisher's main content.
    main=raw.split('<div class="footnote">')[0].split('<div class="copyright">')[0]
    main=re.sub(r'<ul class=[\'"]tnav[\'"]>.*?</ul>', '', main, flags=re.S)
    matches=list(re.finditer(r'<span class="verse" id="V(\d+)">.*?</span>', main, re.S))
    verses=[]
    for i,m in enumerate(matches):
        text=main[m.end():matches[i+1].start() if i+1<len(matches) else len(main)]
        text=re.sub(r'<div class="(?:s|s2|ms|ms2|r|d)"[^>]*>.*?</div>', '', text, flags=re.S)
        text=re.sub(r'<a [^>]*class="notemark"[^>]*>.*?</a>', '', text, flags=re.S)
        text=html.unescape(re.sub('<[^>]+>', ' ', text))
        text=' '.join(text.split())
        verses.append(dict(verse=int(m[1]), text=text))
    if not verses: raise ValueError(f'No verses: {n}')
    return str(n),verses
scripture=dict(ThreadPoolExecutor(max_workers=4).map(chapter_text, range(1,51)))

# Each row is original prose grounded in that chapter, not a quotation from a commentary.
# title | summary | meaning | people | places | thematic LDS scripture (where supplied)
ROWS = '''
Creation|God creates the world and gives humans care of its life. God calls creation good.|Human life has worth. Care for the earth follows from God's gift.|adam,eve||moses-2
Life in the garden|God rests. God places the man in Eden and forms the woman.|Rest, work, and partnership belong to human life. The garden also includes a command.|adam,eve||moses-3
The Fall|The man and woman eat the forbidden fruit. They leave the garden.|Their choice brings loss and responsibility. God still clothes them.|adam,eve||moses-4
Cain and Abel|Cain kills Abel. The chapter follows Cain's family and the birth of Seth.|Anger can destroy family bonds. Cain's question tests our care for other people.|adam,eve,cain,abel||moses-5
Generations to Noah|The family record traces Adam's line to Noah. Enoch walks with God.|Death repeats through the record. Enoch's account introduces hope within that pattern.|adam,enoch,noah||moses-6
Noah builds the ark|Violence fills the earth. God tells Noah to build an ark.|Noah responds to God's warning with action. The story connects judgment with preservation.|noah||moses-8
The flood|Noah's household and the animals enter the ark. The flood covers the land.|The narrative depicts loss on a great scale. Preservation remains part of the story.|noah||
The waters recede|The ark rests in the mountains of Ararat. Noah leaves and builds an altar.|Noah responds to deliverance with worship. The promise concerns the world's continuing seasons.|noah|ararat|
A covenant with Noah|God gives the rainbow as a covenant sign. Noah's sons receive different blessings.|The covenant includes living creatures. The chapter also warns against bloodshed.|noah,shem,ham,japheth||
Families and nations|The chapter lists peoples descended from Noah's sons.|The list links Israel's story to many peoples. It expresses kinship through family lines.|noah,shem,ham,japheth,nimrod|babel|
Babel and Terah's family|People build Babel. God confuses their speech. Terah's family travels from Ur toward Canaan.|Babel questions human attempts to secure greatness. Terah's family prepares the next story.|nimrod,abraham,sarah,lot|babel,ur,haran|
Abram's call|Abram travels from Haran to Canaan. Famine leads him into Egypt.|The promise extends blessing beyond one household. Abram's fear also exposes others to danger.|abraham,sarah,lot|haran,shechem,bethel,egypt|abraham-2
Abram and Lot separate|Abram lets Lot choose land. Lot settles near Sodom. God renews Abram's promise.|Abram chooses peace over a dispute. Land and descendants remain central to the promise.|abraham,lot|bethel,hebron,sodom|
Lot rescued|Abram rescues Lot after a battle. Melchizedek blesses Abram.|Abram rejects wealth from Sodom. Melchizedek connects blessing with worship of God.|abraham,lot,melchizedek|dan,damascus,salem|alma-13
God's covenant with Abram|God promises descendants to Abram. A covenant ceremony follows.|Abram trusts despite his lack of an heir. The promise includes future suffering and return.|abraham|hebron|
Hagar and Ishmael|Hagar flees harsh treatment from Sarai. God's messenger meets her. Ishmael is born.|God sees a woman in distress. Her story challenges indifference toward vulnerable people.|abraham,sarah,hagar,ishmael|beer-lahai-roi|
New names and covenant|God names Abraham and Sarah. Circumcision becomes a covenant sign. God promises Isaac.|The covenant sets duties for the household. God also promises to bless Ishmael.|abraham,sarah,ishmael,isaac|hebron|abraham-2
Visitors and Abraham's plea|Visitors promise Sarah a son. Abraham pleads for Sodom.|Hospitality opens the story. Abraham's questions explore justice and mercy.|abraham,sarah,lot|hebron,sodom|
Sodom and Lot's escape|Lot hosts visitors. A violent crowd threatens them. Lot's household escapes Sodom.|The account condemns violence and abuse of guests. Escape does not end the household's troubles.|lot|sodom,zoar|
Abraham and Abimelech|Abraham calls Sarah his sister. God warns Abimelech in a dream.|Fear leads to deception. The account shows how that deception harms other people.|abraham,sarah,abimelech|gerar|
Isaac and Ishmael|Isaac is born. Hagar and Ishmael leave. God provides water. Abraham makes a treaty.|Both sons receive God's care. Family conflict does not erase Hagar's need or Ishmael's promise.|abraham,sarah,isaac,hagar,ishmael,abimelech|beersheba|
The binding of Isaac|God tests Abraham. A messenger stops the sacrifice. A ram takes Isaac's place.|The narrative presents trust under severe strain. God stops the killing of Isaac.|abraham,isaac|moriah,beersheba|jacob-4
Sarah's burial|Sarah dies. Abraham buys the field and cave of Machpelah.|The purchase gives Abraham a burial place. The promised land first becomes a family grave.|abraham,sarah|hebron|
Rebekah meets Isaac|Abraham's servant seeks a wife for Isaac. Rebekah agrees to travel.|Rebekah shows care through action. Her consent matters in the journey to Isaac.|abraham,isaac,rebekah,laban|haran,beer-lahai-roi|
Abraham's death and the twins|Abraham dies. Rebekah bears Esau and Jacob. Esau sells his birthright.|Family promises pass to another generation. Immediate hunger and lasting inheritance come into conflict.|abraham,isaac,rebekah,esau,jacob,ishmael|hebron|
Isaac's wells|Isaac lives near Gerar. Disputes arise over wells. God renews the promise.|Water supports life and creates conflict. Isaac moves rather than continuing each dispute.|isaac,rebekah,abimelech|gerar,beersheba|
Jacob receives the blessing|Rebekah and Jacob deceive Isaac. Esau loses the blessing and threatens Jacob.|A family promise unfolds through deception and grief. The chapter does not hide their harmful choices.|isaac,rebekah,jacob,esau|beersheba|
Jacob's dream at Bethel|Jacob leaves for Haran. At Bethel he dreams of a stairway reaching heaven.|God meets Jacob during his flight. Jacob responds with a vow.|jacob,isaac,esau|beersheba,bethel,haran|
Leah and Rachel|Jacob meets Rachel. Laban substitutes Leah at the wedding. Jacob also marries Rachel.|Deception returns within Jacob's life. God sees Leah's distress and gives her children.|jacob,leah,rachel,laban|haran|
Jacob's growing household|Rachel, Leah, Bilhah, and Zilpah bear children. Jacob's flocks increase.|The account includes rivalry and unequal power. The mothers' words reveal their hopes and pain.|jacob,leah,rachel,bilhah,zilpah,laban,joseph|haran|
Jacob leaves Laban|Jacob's household leaves Haran. Laban pursues them. They make an agreement.|The household seeks freedom from Laban's control. A boundary helps end their dispute.|jacob,leah,rachel,laban|haran,gilead|
Jacob wrestles|Jacob prepares to meet Esau. He wrestles through the night and receives the name Israel.|Jacob faces fear and dependence. His new name marks a lasting change.|jacob,esau|mahanaim,penuel|
Jacob and Esau meet|Esau embraces Jacob. Jacob settles near Shechem.|The meeting interrupts expected revenge. Gifts and humility support renewed peace.|jacob,esau,leah,rachel|penuel,shechem,succoth|
Dinah and Shechem|Shechem violates Dinah. Her brothers kill the town's men after a deceptive agreement.|The narrative exposes sexual violence and violent revenge. Neither harm should disappear from the reading.|dinah,jacob,simeon,levi|shechem|
Return to Bethel|Jacob returns to Bethel. Rachel dies near Bethlehem. Isaac dies.|Worship, birth, and death shape the family's return. The promise continues through grief.|jacob,rachel,leah,isaac,benjamin|bethel,bethlehem,hebron|
Esau's descendants|The chapter records Esau's family and rulers in Edom.|Esau's line receives space in the story. Israel's neighbors also have a history.|esau|edom|
Joseph sold|Joseph's brothers sell him. Traders take him to Egypt. Jacob mourns.|Favoritism and jealousy fracture the family. Joseph's loss begins the journey toward Egypt.|joseph,jacob,judah,reuben|hebron,shechem,dothan,egypt|
Judah and Tamar|Judah fails to provide for Tamar. Tamar acts to preserve her family claim.|Judah admits his failure. The story exposes his unequal judgment of Tamar.|judah,tamar|adullam,timnah|
Joseph in Potiphar's house|Joseph serves Potiphar. Potiphar's wife falsely accuses Joseph. He enters prison.|Joseph keeps his integrity despite pressure. His imprisonment is not evidence of guilt.|joseph,potiphar|egypt|
Dreams in prison|Joseph explains the cupbearer's and baker's dreams. The cupbearer forgets Joseph.|Joseph serves others while confined. Help given does not guarantee quick relief.|joseph|egypt|
Joseph before Pharaoh|Joseph explains Pharaoh's dreams. Pharaoh appoints him to prepare for famine.|Preparation turns knowledge into care for others. Joseph gains authority after years of loss.|joseph,pharaoh,asenath|egypt|
The brothers seek grain|Joseph's brothers arrive in Egypt. Joseph holds Simeon and asks for Benjamin.|The brothers remember their guilt. Joseph's tests begin to reveal their changed relationships.|joseph,jacob,reuben,simeon|egypt,canaan|
Benjamin goes to Egypt|Judah pledges Benjamin's safety. The brothers return. Joseph hosts a meal.|Judah accepts responsibility for another brother. Joseph's hidden identity creates hope and fear.|joseph,jacob,judah,benjamin|canaan,egypt|
Judah offers himself|Joseph's cup is found in Benjamin's sack. Judah offers to remain instead.|Judah's offer reverses his earlier sale of Joseph. He protects a brother and his father.|joseph,judah,benjamin|egypt|
Joseph reveals himself|Joseph names himself. He sends his brothers to bring Jacob to Egypt.|Reconciliation includes truthful recognition of harm. Joseph interprets survival as God's preserving work.|joseph,jacob,judah,benjamin|egypt,canaan|
Jacob goes to Egypt|God reassures Jacob at Beersheba. Jacob's family enters Egypt. Joseph meets his father.|Migration preserves the family during famine. God's promise accompanies them beyond Canaan.|jacob,joseph,judah|beersheba,goshen,egypt|
The famine continues|Jacob meets Pharaoh. Joseph manages famine relief. Egyptians surrender property for food.|The account includes survival and concentrated royal power. Food policy changes people's dependence on Pharaoh.|jacob,joseph,pharaoh|goshen,egypt|
Ephraim and Manasseh|Jacob blesses Joseph's sons. He places Ephraim before Manasseh.|The younger son receives the leading blessing. The act repeats Genesis's reversals of expected rank.|jacob,joseph,ephraim,manasseh|goshen|
Jacob's final words|Jacob speaks over his sons. He asks for burial with his ancestors and dies.|The speeches address different tribal futures. The burial request holds the family to Canaan.|jacob,joseph,judah,reuben,simeon,levi,benjamin|goshen,hebron|
Burial and forgiveness|Joseph buries Jacob in Canaan. He reassures his brothers. Joseph later dies in Egypt.|Forgiveness does not deny the brothers' evil. Joseph's burial request points toward a future return.|joseph,jacob,judah|egypt,hebron|nephi-3
'''.strip().splitlines()

PLACES = [
('ur','Ur',30.962,46.103,'Genesis 11 names Ur of the Chaldeans. Southern Ur is a common identification.','The identification remains debated. This marker does not settle Abraham\'s origin.'),
('haran','Haran',36.865,39.032,'Terah\'s household settles here. Abraham later leaves for Canaan.','The ancient city is near modern Harran.'),
('babel','Babel / Babylon',32.543,44.421,'Genesis 11 places Babel in Shinar. The story links its name with confused speech.','Babylon is the usual city identification. The tower itself is not identified.'),
('ararat','Mountains of Ararat',38.7,43.3,'Genesis 8 names a mountain region where the ark rests.','This marker represents a broad region. It does not locate the ark or one mountain.'),
('shechem','Shechem',32.213,35.282,'Abraham builds an altar nearby. Jacob later buys land here.','Tell Balata is the usual ancient city site.'),
('bethel','Bethel',31.929,35.238,'Abraham camps nearby. Jacob names the site after his dream.','Beitin is a common identification. Exact ancient boundaries remain uncertain.'),
('hebron','Hebron / Machpelah',31.532,35.1,'Abraham lives near Hebron. Sarah\'s burial establishes a family grave.','The marker shows Hebron. It does not verify the burial chamber.'),
('beersheba','Beersheba',31.245,34.84,'Abraham and Isaac make agreements here. Jacob stops before entering Egypt.','The marker shows the ancient settlement area.'),
('egypt','Egypt / Nile valley',30.1,31.2,'Famine draws Abraham and later Jacob\'s family into Egypt. Joseph rises to royal service.','This regional marker does not identify Joseph\'s palace or Pharaoh.'),
('goshen','Goshen / eastern delta',30.7,31.8,'Genesis places Jacob\'s household in Goshen, within Egypt.','The broad delta placement is approximate. Its exact limits are unknown.'),
('sodom','Sodom / Dead Sea region',31.2,35.5,'Lot settles near Sodom. Genesis 19 narrates its destruction.','The site is disputed. This marker shows a region rather than a confirmed city.'),
('zoar','Zoar / Dead Sea region',31.0,35.5,'Lot seeks refuge in Zoar when he leaves Sodom.','The exact Genesis site is uncertain.'),
('gerar','Gerar',31.39,34.61,'Abraham and Isaac deal with Abimelech near Gerar.','Tell Haror is a proposed identification. The marker is approximate.'),
('beer-lahai-roi','Beer Lahai Roi / Negev',30.8,34.8,'Hagar names the well after her encounter. Isaac later lives nearby.','Its location is unknown. The marker represents the Negev region only.'),
('moriah','Land of Moriah',31.778,35.235,'Genesis 22 places Abraham\'s test in the land of Moriah.','Jerusalem reflects a later biblical association. Genesis does not give a verified site.'),
('salem','Salem',31.778,35.235,'Melchizedek is king of Salem and priest of God Most High.','Jerusalem is a traditional identification. Genesis alone does not establish it.'),
('dan','Dan',33.249,35.652,'Abram pursues Lot\'s captors as far as Dan.','The name may reflect the narrator\'s later geography.'),
('damascus','Damascus region',33.514,36.277,'Genesis 14 places Hobah north of Damascus.','This marker shows Damascus. Hobah\'s exact site is unknown.'),
('gilead','Gilead',32.2,35.85,'Jacob and Laban make their agreement in this hill region.','This is a regional marker.'),
('mahanaim','Mahanaim',32.21,35.62,'Jacob names the place after meeting God\'s messengers.','The site is uncertain. The marker shows the broader region.'),
('penuel','Penuel / Jabbok',32.184,35.702,'Jacob wrestles near the Jabbok before meeting Esau.','The marker follows a proposed site near the river.'),
('succoth','Succoth',32.18,35.62,'Jacob builds shelters here after meeting Esau.','The marker follows a proposed Jordan valley site.'),
('bethlehem','Bethlehem / Ephrath',31.705,35.202,'Rachel dies on the journey toward Ephrath, identified in the text as Bethlehem.','The marker shows the town. Rachel\'s burial site has competing traditions.'),
('edom','Edom / Seir',30.7,35.5,'Genesis 36 associates Esau\'s descendants with Seir and Edom.','This is a regional marker, not a political boundary.'),
('dothan','Dothan',32.413,35.238,'Joseph finds his brothers near Dothan before they sell him.','Tell Dothan is the usual identification.'),
('adullam','Adullam',31.65,35.0,'Judah goes down to Adullam in Genesis 38.','The marker follows the usual hill-country identification.'),
('timnah','Timnah region',31.75,34.94,'Judah travels to Timnah for sheep shearing.','More than one ancient site has this name. The identification is uncertain.'),
('canaan','Canaan',32.0,35.15,'The promised land forms the main setting of the ancestral stories.','This is a regional marker, not a surveyed border.')]

PERSON_ROWS = '''
adam|Adam|First man in the Genesis account|Partner of Eve. Father of Cain, Abel, and Seth.|Genesis 2–5|God gives him work and a command. His choices shape life outside Eden.
eve|Eve|First woman in the Genesis account|Partner of Adam. Mother of Cain, Abel, and Seth.|Genesis 2–4|She acts in the garden story. Her later words express hope through childbirth.
cain|Cain|Farmer and brother of Abel|Son of Adam and Eve. Father of Enoch in Cain's line.|Genesis 4|He kills Abel. His story exposes anger, violence, and denied responsibility.
abel|Abel|Shepherd killed by his brother|Son of Adam and Eve. Brother of Cain.|Genesis 4|His accepted offering precedes his murder. His death gives the account its first family tragedy.
enoch|Enoch|Ancestor who walks with God|Descendant of Seth. Father of Methuselah.|Genesis 5:18–24|God takes him. Moses 6–7 expands his role within LDS scripture.
noah|Noah|Ark builder and covenant recipient|Father of Shem, Ham, and Japheth.|Genesis 5–9|He follows the ark command. His story joins judgment, preservation, and covenant.
shem|Shem|Son of Noah|Brother of Ham and Japheth. Ancestor in Abraham's family record.|Genesis 5–11|His line connects Noah's household with Terah and Abraham.
ham|Ham|Son of Noah|Father of Canaan. Brother of Shem and Japheth.|Genesis 5–10|Genesis 9 directs Noah's curse at Canaan. The passage does not justify racial slavery.
japheth|Japheth|Son of Noah|Brother of Shem and Ham.|Genesis 5–10|His descendants appear in the table of nations. The account places many peoples within one family.
nimrod|Nimrod|Mighty hunter and ruler|Descendant of Ham through Cush.|Genesis 10:8–12|The text associates his kingdom with Babel. Genesis 11 does not name him as tower builder.
abraham|Abraham / Abram|Covenant recipient and migrating ancestor|Husband of Sarah. Father of Ishmael and Isaac. Uncle of Lot.|Genesis 11–25|God calls him to Canaan. His story includes faith, failure, hospitality, and covenant.
sarah|Sarah / Sarai|Mother of Isaac|Wife of Abraham. Mistress of Hagar.|Genesis 11–23|She receives the promise of a son. Her treatment of Hagar also requires careful reading.
lot|Lot|Abraham's nephew|Son of Haran. Father of two daughters in Genesis 19.|Genesis 11–19|He chooses the Jordan plain. His story explores danger, hospitality, and family harm.
hagar|Hagar|Egyptian servant and mother of Ishmael|Servant of Sarah. Mother of Abraham's first son.|Genesis 16; 21|God meets her in distress. Her account gives a vulnerable woman a voice.
ishmael|Ishmael|Abraham and Hagar's son|Half-brother of Isaac. Father of twelve named sons.|Genesis 16–25|God hears and preserves him. He receives a promise distinct from Isaac's covenant line.
melchizedek|Melchizedek|King of Salem and priest|He blesses Abram after Lot's rescue.|Genesis 14:18–20|His blessing links God with Abram's deliverance. LDS scripture expands his priestly role.
isaac|Isaac|Son of Abraham and Sarah|Husband of Rebekah. Father of Esau and Jacob.|Genesis 17–35|The covenant continues through him. Wells and family blessings shape his story.
rebekah|Rebekah|Mother of Esau and Jacob|Wife of Isaac. Sister of Laban.|Genesis 24–28|She agrees to travel to Isaac. She later directs the deception that secures Jacob's blessing.
abimelech|Abimelech|King associated with Gerar|He makes agreements with Abraham or Isaac.|Genesis 20–21; 26|The stories use the same royal name. They do not establish that one man fills every role.
esau|Esau / Edom|Isaac's elder son|Twin brother of Jacob. Ancestor of Edom.|Genesis 25–36|He loses the birthright and blessing. He later welcomes Jacob rather than taking revenge.
jacob|Jacob / Israel|Ancestor of Israel's tribes|Son of Isaac and Rebekah. Father of twelve sons and Dinah.|Genesis 25–50|He deceives and suffers deception. His later life joins struggle, reconciliation, and grief.
laban|Laban|Rebekah's brother|Father of Leah and Rachel. Jacob's employer and father-in-law.|Genesis 24; 29–31|He controls marriage and labor agreements. His disputes with Jacob end at a marked boundary.
leah|Leah|Mother of six sons and Dinah|Daughter of Laban. Wife of Jacob. Sister of Rachel.|Genesis 29–35; 49|Her children's names express pain and praise. Her story exposes unequal affection within the household.
rachel|Rachel|Mother of Joseph and Benjamin|Daughter of Laban. Wife of Jacob. Sister of Leah.|Genesis 29–35|She longs for children. Her death on the road brings grief during the family's return.
bilhah|Bilhah|Mother of Dan and Naphtali|Rachel's servant. Mother of two of Jacob's sons.|Genesis 29–35|The household treats her within unequal power. Genesis records little of her own voice.
zilpah|Zilpah|Mother of Gad and Asher|Leah's servant. Mother of two of Jacob's sons.|Genesis 29–30|Her sons join the family record. The account gives few details about her own choices.
dinah|Dinah|Daughter of Jacob and Leah|Sister of Simeon and Levi.|Genesis 30; 34|She suffers sexual violence. The account focuses on others' actions and records no speech from her.
joseph|Joseph|Son sold into Egypt and later royal official|Son of Jacob and Rachel. Husband of Asenath. Father of Ephraim and Manasseh.|Genesis 30; 37–50|He survives betrayal and false accusation. His later authority preserves the family during famine.
judah|Judah|Brother who later protects Benjamin|Son of Jacob and Leah. Father of Perez and Zerah through Tamar.|Genesis 29; 37–50|He helps sell Joseph. His later offer to protect Benjamin shows a change in responsibility.
reuben|Reuben|Jacob's eldest son|Son of Jacob and Leah. Brother of Joseph.|Genesis 29; 35; 37; 42; 49|He tries to rescue Joseph. His later loss of rank connects with his father's final speech.
simeon|Simeon|Son of Jacob and Leah|Brother of Levi and Dinah.|Genesis 29; 34; 42–43; 49|He joins the attack at Shechem. Joseph later keeps him in Egypt as a pledge.
levi|Levi|Son of Jacob and Leah|Brother of Simeon and Dinah.|Genesis 29; 34; 49|His violence at Shechem shapes Jacob's final words. Later priestly history belongs to other books.
benjamin|Benjamin|Jacob's youngest son|Son of Rachel. Full brother of Joseph.|Genesis 35; 42–49|His safety becomes the test of his brothers' changed conduct.
tamar|Tamar|Woman who claims Judah's family duty|Widow of Er and Onan. Mother of Perez and Zerah.|Genesis 38|Judah withholds the expected marriage arrangement. Her action makes him acknowledge his failure.
potiphar|Potiphar|Egyptian officer who buys Joseph|Husband of the unnamed woman who accuses Joseph.|Genesis 37:36; 39|He gives Joseph household responsibility. Joseph's later imprisonment follows a false accusation.
pharaoh|Pharaoh|Title of Egypt's ruler|The ruler appoints Joseph and receives Jacob.|Genesis 12; 40–47|Genesis does not name these rulers. Their stories must not be assigned to a verified reign.
asenath|Asenath|Joseph's Egyptian wife|Daughter of Potiphera. Mother of Manasseh and Ephraim.|Genesis 41; 46|Her marriage joins Joseph to an Egyptian household. Genesis gives little direct detail about her life.
ephraim|Ephraim|Joseph's younger son|Son of Joseph and Asenath. Brother of Manasseh.|Genesis 41; 48|Jacob gives him the leading blessing. His name later identifies a major Israelite tribe.
manasseh|Manasseh|Joseph's elder son|Son of Joseph and Asenath. Brother of Ephraim.|Genesis 41; 48|Jacob includes him among his own sons. His descendants share Joseph's family inheritance.
'''.strip().splitlines()

sources=[dict(id='web',title='Genesis — World English Bible',perspective='historical',category='Scripture',url='https://ebible.org/engwebp/GEN01.htm',summary='The public-domain reading text supplies all 50 chapters.',limits='Chapter notes describe the narrative. They do not prove every narrated event.'),
dict(id='flood-tablet',title='The Flood Tablet — British Museum',perspective='historical',category='Historical evidence',url='https://www.britishmuseum.org/collection/object/W_K-3375',summary='This tablet preserves a Mesopotamian flood account in the Epic of Gilgamesh.',limits='A related flood account does not verify Noah\'s flood or date Genesis.'),
dict(id='egypt',title='Egypt in the Middle Kingdom — Metropolitan Museum of Art',perspective='historical',category='Historical context',url='https://www.metmuseum.org/essays/egypt-in-the-middle-kingdom-2030-1640-b-c',summary='Museum evidence explains one period of Egyptian society, government, and art.',limits='This context does not identify Joseph\'s Pharaoh or establish Joseph\'s dates.'),
dict(id='trade',title='Beyond Babylon: Art, Trade, and Diplomacy in the Second Millennium B.C.',perspective='historical',category='Historical context',url='https://www.metmuseum.org/met-publications/beyond-babylon-art-trade-and-diplomacy-in-the-second-millenium-bc',summary='Museum research examines trade and diplomacy across the ancient Near East.',limits='Regional evidence does not prove the journeys of named Genesis ancestors.')]
for sid,num,title,summary in [
('yale-creation',3,'Genesis 1–4 in Context','Christine Hayes compares the creation stories with their ancient Near Eastern setting.'),
('yale-flood',4,'Genesis 5–11 and the Historical-Critical Method','Christine Hayes examines repeated accounts and literary sources in Genesis.'),
('yale-ancestors',5,'Introduction to Genesis 12–50','Christine Hayes introduces methods for reading the ancestral narratives.'),
('yale-patriarchs',6,'The Stories of the Patriarchs','Christine Hayes studies covenant, family conflict, and the limits of historical evidence.')]:
    sources.append(dict(id=sid,title=title+' — Open Yale Courses',perspective='historical',category='Scholarly study',url=f'https://oyc.yale.edu/religious-studies/rlst-145/lecture-{num}',summary=summary,limits='This academic interpretation remains separate from LDS teaching. Scholars disagree about composition and historicity.'))
MANUAL='https://www.churchofjesuschrist.org/study/manual/old-testament-student-manual-genesis-2-samuel/'
for sid,title,slug in [
('creation','Genesis 1–2: The Creation','genesis-1-2-the-creation'),('fall','Genesis 3: The Fall','genesis-3-the-fall'),('early','Genesis 4–11: The Patriarchs','genesis-4-11-the-patriarchs'),('abraham','Genesis 12–17: Abraham—Father of the Faithful','genesis-12-17-abraham-father-of-the-faithful'),('abraham-later','Genesis 18–23: Abraham—A Model of Faith and Righteousness','genesis-18-23-abraham-a-model-of-faith-and-righteousness'),('jacob','Genesis 24–36: The Covenant Line Continues with Isaac and Jacob','genesis-24-36-the-covenant-line-continues-with-isaac-and-jacob'),('joseph','Genesis 37–50: Joseph: The Power of Preparation','genesis-37-50-joseph-the-power-of-preparation')]:
    sources.append(dict(id=sid,title=title,perspective='lds',category='LDS study manual',url=MANUAL+slug+'?lang=eng',summary='Church study notes discuss this chapter range through LDS teachings.',limits='This older manual includes commentary. Its explanations are not independent archaeological evidence.'))
for sid,title,path in [('moses-2','Moses 2','pgp/moses/2'),('moses-3','Moses 3','pgp/moses/3'),('moses-4','Moses 4','pgp/moses/4'),('moses-5','Moses 5','pgp/moses/5'),('moses-6','Moses 6','pgp/moses/6'),('moses-7','Moses 7','pgp/moses/7'),('moses-8','Moses 8','pgp/moses/8'),('abraham-2','Abraham 2','pgp/abr/2'),('alma-13','Alma 13','bofm/alma/13'),('jacob-4','Jacob 4','bofm/jacob/4'),('nephi-3','2 Nephi 3','bofm/2-ne/3'),('nephi-2','2 Nephi 2','bofm/2-ne/2')]:
    sources.append(dict(id=sid,title=title,perspective='lds',category='LDS scripture',url='https://www.churchofjesuschrist.org/study/scriptures/'+path+'?lang=eng',summary='This LDS scripture offers a related reading for the Genesis passage.',limits='Read this as a Restoration-scripture connection, distinct from Genesis\'s own words.'))
sources.append(dict(id='atlas',title='Bible Maps: The World of the Old Testament',perspective='historical',category='Geography',url='https://www.churchofjesuschrist.org/study/scriptures/bible-maps/map-9?lang=eng',summary='This Church-published atlas locates the wider setting and marks some disputed places.',limits='Use the geographic labels as context. The linked atlas also includes LDS commentary.'))
sources.append(dict(id='atlas-canaan',title='Bible Maps: Canaan in Old Testament Times',perspective='historical',category='Geography',url='https://www.churchofjesuschrist.org/study/scriptures/bible-maps/map-10?lang=eng',summary='This Church-published atlas identifies towns and regions in Canaan.',limits='Coordinates are display estimates. A town marker does not verify each Genesis event.'))
sources.append(dict(id='terrain',title='Mapzen / Tilezen terrain and Natural Earth geography',perspective='historical',category='Geography',url='https://registry.opendata.aws/terrain-tiles/',summary='Cached terrain shows modern elevation. Natural Earth supplies the land and water outlines.',limits='Modern terrain is a geographic aid. It does not reconstruct ancient shorelines or settlements.'))

lds_notes = {
'creation':'LDS scripture presents creation as part of God\'s plan for human life. Compare Moses 2–3.',
'fall':'LDS readings connect the Fall with moral choice and redemption through Christ. Compare Moses 4.',
'early':'Moses adds teachings about Adam, Enoch, and Noah. Keep those additions distinct from Genesis.',
'abraham':'The Church manual links Abraham\'s covenant with blessings and duties shared through the gospel.',
'abraham-later':'The Church manual studies Abraham\'s faith and family trials. It connects sacrifice with trust in God.',
'jacob':'The Church manual follows the covenant through Isaac and Jacob. Read family failures alongside the promises.',
'joseph':'The Church manual emphasizes preparation, integrity, and forgiveness in Joseph\'s life. These themes guide personal application.'}
LDS_CHAPTER_NOTES='''
Moses 2 places human creation within God's work. Human dignity shapes how we treat others.
Moses 3 connects the garden with God's commands. Study work, rest, and partnership together.
Moses 4 expands the garden account. Second Nephi 2 connects the Fall with choice and redemption.
Moses 5 adds gospel teaching after the Fall. Compare Cain's choices with Adam and Eve's worship.
Moses 6–7 expands Enoch's account. Zion means a people united in righteousness and care.
Moses 8 describes Noah's preaching before the flood. Read preparation alongside the call to repent.
The Church manual reads Noah's deliverance within God's dealings with humanity. Consider faithful action under warning.
Noah worships after deliverance. Consider how gratitude can follow a period of waiting.
A covenant is a sacred agreement. God's sign joins a promise with duties toward life.
The family record joins many peoples to common ancestors. Consider the duties that shared humanity creates.
The Church manual contrasts Babel with the covenant family story. Consider how pride differs from trust.
Abraham 2 links the covenant with blessing all families. Study the promise as a duty to serve.
Abraham gives Lot the first choice. Consider how covenant living can support peace over advantage.
Alma 13 expands Melchizedek's role as a priest. Keep that teaching distinct from Genesis's brief account.
God's promise meets Abraham's fear about an heir. Consider how faith can coexist with unanswered questions.
God sees Hagar in distress. Consider whose need you can recognize within unequal relationships.
Abraham 2 links covenant blessings with the gospel. Study both the promised blessing and its responsibility.
Abraham pleads for other people's lives. Consider how prayer can express care beyond your household.
Lot's escape includes grief and later family harm. Deliverance does not remove the need for moral care.
Abraham's fear puts Sarah at risk. Consider the effects of choices made to protect yourself.
God hears Hagar and Ishmael. Family conflict must not erase another person's need.
Jacob 4:5 links Abraham's offering with the Father's gift of Christ. Genesis itself stops Isaac's sacrifice.
Abraham secures a burial place for Sarah. Consider how covenant hope can accompany mourning.
Rebekah agrees to the journey. Consider the place of willingness within family and covenant choices.
The birthright concerns a lasting family responsibility. Consider what you value beyond an immediate need.
God renews the promise to Isaac. Consider how patient action can reduce a dispute.
Jacob receives a blessing through deception. A promised purpose does not make every family choice harmless.
God meets Jacob while he travels away from home. Consider your response to God's promised presence.
God sees Leah's pain. Consider how unequal affection can affect people within a family.
The children's names reveal hope and distress. Consider each mother's experience rather than only the family totals.
Jacob and Laban set a boundary. Consider how clear agreements can help end harmful disputes.
Jacob receives the name Israel after a struggle. Consider how dependence on God can accompany fear.
Esau welcomes Jacob. Consider what reconciliation requires after years of injury.
Dinah suffers violence and her brothers take revenge. Consider how to protect people without adding further harm.
Jacob returns to worship amid family loss. Consider how faith and grief can remain present together.
Esau's descendants have their own place in Genesis. Consider how to read neighbors without dismissing them.
Joseph loses home through his brothers' choices. Consider the damage caused by favoritism and envy.
Judah admits that Tamar has a stronger claim. Consider whether your judgment uses unequal standards.
Joseph refuses sexual wrongdoing and suffers false accusation. Consider integrity when it brings no immediate reward.
Joseph serves others while he waits in prison. Consider how service can continue during uncertainty.
Joseph prepares for famine after explaining the dreams. Consider how knowledge can become practical care.
The brothers begin to acknowledge their earlier harm. Consider the place of truthful memory in repentance.
Judah accepts responsibility for Benjamin. Consider how changed conduct can make a promise credible.
Judah offers his own freedom for Benjamin. Compare this choice with his earlier treatment of Joseph.
Joseph speaks truth about the sale while preserving the family. Consider forgiveness without denial of harm.
God reassures Jacob before the move to Egypt. Consider how covenant trust can accompany a difficult change.
Famine relief also increases royal control. Consider both the aid given and its cost to vulnerable people.
Jacob blesses both sons and gives Ephraim the leading place. Consider duties as well as inherited blessing.
Jacob's words join blessing with consequences. Consider how family choices can affect later generations.
Second Nephi 3 adds a prophecy attributed to Joseph. Keep that Restoration account distinct from Genesis 50.
'''.strip().splitlines()
chapters=[]
for n,row in enumerate(ROWS,1):
    title,summary,meaning,people,places,extra=row.split('|')
    group='creation' if n<3 else 'fall' if n==3 else 'early' if n<12 else 'abraham' if n<18 else 'abraham-later' if n<24 else 'jacob' if n<37 else 'joseph'
    refs=['web','yale-creation' if n<=4 else 'yale-flood' if n<=11 else 'yale-patriarchs' if n<=36 else 'yale-ancestors']
    if n in [6,7,8,9]: refs+=['flood-tablet']
    if n>=11: refs+=['trade']
    if n in [12] or n>=37: refs+=['egypt']
    lds_refs=[group]+([extra] if extra else [])+(['nephi-2'] if n==3 else ['moses-7'] if n==5 else [])
    chapters.append(dict(chapter=n,title=title,summary=summary,meaning=meaning,people=people.split(',') if people else [],places=places.split(',') if places else [],sourceIds=refs,lds=dict(text=LDS_CHAPTER_NOTES[n-1],sourceIds=lds_refs),eventOrder=n,dateLabel='Narrative order · historical year unknown',mapNote='No verified location is supplied for this chapter.' if not places else 'Lines connect named places. They do not trace a surveyed ancient road.'))
people=[]
for row in PERSON_ROWS:
    sid,name,role,relations,passages,meaning=row.split('|')
    people.append(dict(id=sid,name=name,role=role,relations=relations,passages=passages,meaning=meaning,life='Birth and death years are not securely known.',sourceIds=['web']))
for p in people:
    p['placeIds']=list(dict.fromkeys(place for c in chapters if p['id'] in c['people'] for place in c['places']))

routes={11:['ur','haran'],12:['haran','shechem','bethel','egypt'],13:['bethel','hebron'],14:['dan','damascus'],19:['sodom','zoar'],22:['beersheba','moriah'],24:['haran','beer-lahai-roi'],28:['beersheba','bethel','haran'],31:['haran','gilead'],33:['penuel','succoth','shechem'],35:['bethel','bethlehem','hebron'],37:['hebron','shechem','dothan','egypt'],43:['canaan','egypt'],46:['beersheba','goshen'],50:['egypt','hebron']}
for c in chapters:
    c['route']=routes.get(c['chapter'],[])
    c['routeEvidence']='Text names these locations in the journey. Connecting lines are approximate.' if c['route'] else ''
data=dict(id='genesis',name='Genesis',chapterCount=50,translation='World English Bible',copyright='Public domain',scripture=scripture,chapters=chapters,people=people,places=[dict(id=i,name=n,lat=a,lng=b,summary=s,limits=l,sourceIds=['web','atlas','atlas-canaan'] if i not in ['ur','haran','babel','ararat','egypt','goshen'] else ['web','atlas']) for i,n,a,b,s,l in PLACES],sources=sources,review=dict(date='2026-10-04',scope='All chapters reviewed against the cached World English Bible. Museum sources provide context, not confirmation of individual patriarchs. LDS readings remain a separate layer.',nextBook='exodus'))
(OUT/'genesis.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Built {len(books)} directory entries, {len(chapters)} chapters, {sum(map(len,scripture.values()))} verses, {len(people)} people.')
