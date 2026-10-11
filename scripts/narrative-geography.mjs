// Narrative connections are independent of the date slider. Every line states its evidence.
// A geographic connection is not a reconstructed road or a count of refugee groups.
export function addNarrativeGeography(data) {
  const focus = chapter => data.chapterMaps.find(f => f.chapter === chapter);
  const point = id => {
    const place = data.places.find(p => p.id === id);
    if (!place) throw Error(`Narrative geography needs ${id}`);
    return [place.lat, place.lng];
  };
  const story = (chapter, narrative, contextPlaceIds, impacts = [], limits = '') => {
    Object.assign(focus(chapter), { narrative, contextPlaceIds, impacts, limits, contextRoutes:[] });
  };
  const link = (chapter, id, title, kind, placeIds, verse, endVerse, summary, evidence = 'General connection', direction = true) => {
    const item = { id, title, kind, placeIds, points:placeIds.map(point), chapter, verse, endVerse,
      summary, evidence, direction, textRoute:true,
      uncertainty:'The line shows a geographic relationship. It does not establish an exact road, timing, or group size.',
      sourceIds:['geo', `web${chapter === 36 ? '' : chapter}`] };
    data.textRoutes.push(item);
    focus(chapter).contextRoutes.push({id,from:0,to:item.points.length-1,reference:`Isaiah ${chapter}:${verse}${endVerse !== verse ? `–${endVerse}` : ''}`});
  };
  const impact = (placeId, reference, description) => ({placeId, reference, description});

  story(7,'Aram and northern Israel threaten Jerusalem together. The two capitals identify the opposing kingdoms.', ['damascus','samaria','jerusalem']);
  link(7,'aram-against-judah','Aram attacks Jerusalem','military',['damascus','jerusalem'],1,9,'Rezin joins the attack on Jerusalem. Damascus represents his kingdom; the approach road is not given.');
  link(7,'israel-against-judah','Israel attacks Jerusalem','military',['samaria','jerusalem'],1,9,'Pekah joins the attack. Samaria stands for his kingdom. The line does not show a separate recorded army route.');
  story(8,'Assyria threatens Damascus and Samaria, then reaches into Judah. The flood is an image of Assyrian power.', ['assyria','damascus','samaria','jerusalem'], [], 'These arrows show the political links in the prophecy. They do not show a real flood or a dated army route.');
  for (const destination of ['damascus','samaria','jerusalem']) link(8,`assyria-${destination}`,`Assyrian threat: ${destination}`,'military',['assyria',destination],4,8,'The oracle links Assyrian power with plunder and the threat to Judah. Assyria is represented by a regional point.','Prophetic threat');
  story(10,'The local advance toward Zion belongs to a larger account of Assyrian conquests and threats.', ['assyria','carchemish','hamath','arpad','damascus','samaria','jerusalem'], ['carchemish','hamath','arpad','damascus','samaria'].map(id=>impact(id,'Isaiah 10:9–11','Assyria’s boast names this place among conquered kingdoms.')), 'The cities in the boast do not establish the order of a military march. The detailed view shows the approach in verses 28–32.');
  story(11,'The scattered remnant is gathered from several regions. The vision reverses dispersion and envisions a highway from Assyria.', ['jerusalem','assyria','egypt','pathros','cush','elam','babylon','hamath'], [], 'These are promised gathering connections. They are not records of completed journeys. Babylon represents the wider Shinar setting.');
  for (const origin of ['assyria','egypt','pathros','cush','elam','babylon','hamath']) link(11,`gather-${origin}`,`Gathering from ${origin}`,'restoration',[origin,'jerusalem'],11,16,'The remnant is recovered from named regions. Jerusalem represents the restored Judah setting.','Vision of gathering');
  story(13,'The oracle names the Medes as attackers and Babylon as the city facing destruction.', ['media','babylon'],[impact('babylon','Isaiah 13:17–22','Babylon faces devastation in the oracle.')], 'The oracle supplies the opposing power and target, but not an army’s exact road.');
  link(13,'medes-babylon','Medes against Babylon','military',['media','babylon'],17,19,'Media represents the people named in the attack on Babylon.','Prophetic attack');

  story(15,'Moab’s towns face ruin and mourning. People flee toward Zoar. They weep on the hill to Luhith and the road to Horonaim. They carry their goods across the Brook of the Willows.',
    ['jerusalem','heshbon','elealeh','dibon','nebo','medeba','jahaz','ar','kir-hareseth','nimrim','zoar','luhith','horonaim','brook-of-the-willows','edom'],
    [impact('ar','Isaiah 15:1','Ar is laid waste.'),impact('kir-hareseth','Isaiah 15:1','Kir of Moab is laid waste; conventionally associated with Kerak.'),impact('dibon','Isaiah 15:2,9','Mourning at Dibon; Dimon’s blood-filled waters are often associated with Dibon.'),impact('nebo','Isaiah 15:2','Moab mourns over Nebo.'),impact('medeba','Isaiah 15:2','Moab mourns over Medeba.'),impact('heshbon','Isaiah 15:4','Heshbon cries out.'),impact('elealeh','Isaiah 15:4','Elealeh cries out.'),impact('nimrim','Isaiah 15:6','Nimrim’s waters and vegetation fail.')],
    'The attacker and army route are not named. Red rings show places of ruin or pain, not a rebuilt warpath. Orange branches sum up the flight passages. They do not show separate groups or a set order of stops. Each branch begins at a general point in Moab.');
  for (const [destination,title,verse,summary] of [
    ['zoar','Flight toward Zoar',5,'People of Moab flee toward Zoar. The text does not identify their starting town.'],
    ['luhith','Weeping on the ascent of Luhith',5,'The ascent of Luhith is part of the flight scene. Its starting point and connection to other roads are not specified.'],
    ['horonaim','Distress on the road to Horonaim',5,'The road to Horonaim is named in the flight scene. This branch does not establish the order of travel.'],
    ['brook-of-the-willows','Possessions carried across the brook',7,'People carry their accumulated possessions across the Brook of the Willows. Wadi al Hasa is one proposed identification; others exist.']
  ]) link(15,`moab-flight-${destination}`,title,'flight',['moab',destination],verse,verse,summary,'Textual flight; regional origin');
  focus(15).focusPlaceIds = ['moab','zoar','luhith','horonaim','brook-of-the-willows'];

  story(16,'The Moab scene continues with people forced from their homes. They gather at the Arnon crossings and ask for shelter. A gift is sent from Sela toward Zion.', ['moab','arnon','sela','jerusalem','heshbon','sibmah','kir-hareseth'], [], 'Translations differ about the direction of the request for shelter. The gift scene is separate from the refugee scene. The text does not say that the refugees reached Jerusalem.');
  link(16,'moab-arnon','Displaced people at the Arnon','flight',['moab','arnon'],2,4,'Moab’s displaced women are compared with scattered birds at the Arnon crossings. The line relates Moab to that location; it does not give a starting town.','Displacement scene',false);
  link(16,'sela-zion','Tribute from Sela to Zion','diplomacy',['sela','jerusalem'],1,1,'Lambs are to be sent from Sela through the wilderness toward Zion. The command does not document a completed trip.','Commanded tribute');

  story(19,'Egypt’s crisis ends with a vision of travel and worship linking Egypt, Assyria, and Israel.', ['egypt','memphis','zoan','jerusalem','assyria'], [], 'The highway is a vision of reconciliation. The connecting line does not identify a historical road.');
  link(19,'egypt-assyria-highway','Egypt–Assyria highway','restoration',['egypt','jerusalem','assyria'],23,25,'Egyptians and Assyrians travel to one another. Israel shares the blessing. Jerusalem shows Israel’s place on this broad line.','Vision of mutual travel',false);
  story(20,'Assyria captures Ashdod. Isaiah’s sign then warns of captivity for Egypt and Cush.', ['assyria','ashdod','egypt','cush'],[impact('ashdod','Isaiah 20:1','Sargon’s commander captures Ashdod.')], 'The capture and the warning are separate parts of the chapter. Assyria is a regional reference, not a specified deportation destination.');
  link(20,'assyria-ashdod','Assyrian attack on Ashdod','military',['assyria','ashdod'],1,1,'Sargon sends his commander against Ashdod. The connecting line does not trace his marching route.','Narrated attack');
  for (const origin of ['egypt','cush']) link(20,`captivity-${origin}`,`Captivity warning: ${origin}`,'exile',[origin,'assyria'],3,5,'The sign warns that Assyria will lead people away captive. The final destination is not named.','Symbolic warning; destination regional');
  story(21,'Arabian trade groups take shelter. Tema gives water and bread to people who flee battle. Babylon’s fall is a separate prophecy in this chapter.', ['babylon','elam','media','dedan','tema','kedar','mount-seir'],[impact('babylon','Isaiah 21:9','The watchman announces Babylon’s fall.')], 'The text does not say where the refugees came from. The Dedan–Tema line links the trade and aid scenes. It does not say that every refugee came from Dedan.');
  link(21,'arabian-refuge','Caravans and refugee aid','flight',['dedan','tema'],13,15,'Dedanite caravans shelter in Arabia. Tema brings water and bread to fugitives from battle.','Related scenes; origin unconfirmed',false);
  story(23,'The fall of Tyre disrupts coastal commerce. Sidon is told to cross to Kittim, where rest is still denied.', ['tyre','sidon','cyprus','egypt'],[impact('tyre','Isaiah 23:1','Tyre is laid waste in the oracle.')], 'Kittim is represented by Cyprus. Tarshish remains unplotted because its identification is disputed.');
  link(23,'sidon-kittim','Flight from Sidon toward Kittim','flight',['sidon','cyprus'],12,12,'The oracle tells the oppressed daughter of Sidon to cross to Kittim. This is an instruction in the poem, not a verified sailing track.','Command to cross');
  story(27,'People facing loss in Assyria and exile in Egypt are gathered to worship in Jerusalem.', ['assyria','egypt','jerusalem','euphrates']);
  for (const origin of ['assyria','egypt']) link(27,`return-${origin}`,`Return from ${origin}`,'restoration',[origin,'jerusalem'],12,13,'The trumpet gathering brings people from Assyria and Egypt to Jerusalem.','Promised return');
  story(30,'Judah sends resources toward Egypt in search of protection. The chapter challenges that alliance.', ['jerusalem','negeb','zoan','hanes','egypt'], [], 'Zoan and Hanes are named, but their order along an actual road is not established.');
  story(36,'The wider Assyrian campaign reaches Judah. From Lachish, the Assyrian representative goes to Jerusalem.', ['sidon','tyre','ashkelon','ekron','lachish','jerusalem'],[impact('lachish','Isaiah 36:1–2','Lachish is the campaign setting from which the representative is sent.')], 'The full coastal campaign is historical context from the existing campaign sources. The chapter-specific mission is highlighted separately.');
  focus(36).contextRoutes.push({id:'west-campaign',from:0,to:5,reference:'701 BCE campaign · historical context',title:'Wider western campaign',kind:'military',evidence:'Historical reconstruction'});
  story(37,'The confrontation shifts from Lachish to Libnah. After the failed threat to Jerusalem, Sennacherib returns to Nineveh.', ['jerusalem','lachish','libnah','nineveh'],[impact('libnah','Isaiah 37:8','The Assyrian king is fighting against Libnah.')], 'The local connection and the return to Nineveh are separate movements. The route home is not specified.');
  link(37,'return-nineveh','Sennacherib returns to Nineveh','military',['jerusalem','nineveh'],36,37,'The king departs and returns to Nineveh after the Jerusalem crisis. Jerusalem anchors that crisis, not an identified departure gate.','Narrated return; road unknown');
  story(39,'Visitors come from Babylon to Jerusalem. Isaiah then warns of the opposite movement: treasures and descendants taken to Babylon.', ['babylon','jerusalem'], [], 'The visit and the future exile warning are different events. Both appear here without assigning the prophecy to the visit’s date.');
  link(39,'future-exile','Future exile to Babylon','exile',['jerusalem','babylon'],6,7,'The warning names Babylon as the destination for treasures and royal descendants.','Future warning');
  story(48,'The call to leave Babylon reverses the direction of exile. The wilderness language recalls earlier deliverance.', ['babylon','jerusalem'], [], 'The chapter commands departure from Babylon. Jerusalem is the wider restoration setting; the exact route is unspecified.');
  story(60,'Zion receives returning children and gifts from distant peoples. Named regions show the scale of this vision.', ['jerusalem','midian','sheba','kedar','lebanon'], [], 'These connections visualize a future vision. They are not a map of verified caravan or sea routes.');
  for (const origin of ['midian','sheba','kedar']) link(60,`gifts-${origin}`,`Gifts from ${origin}`,'restoration',[origin,'jerusalem'],6,7,'The vision connects gifts, flocks, and distant peoples with Zion.','Vision of gifts and gathering');
  story(66,'Survivors carry the message to distant nations. People are then brought from the nations to Jerusalem.', ['jerusalem','javan','lud','tubal'], [], 'Javan, Lud, and Tubal use representative atlas locations. These bidirectional links combine the sending and gathering scenes, not actual roads. Tarshish and Pul remain unplotted because their identities are disputed.');
  for (const nation of ['javan','lud','tubal']) link(66,`nations-${nation}`,`Sending and gathering: ${nation}`,'restoration',['jerusalem',nation],19,20,'The first scene sends survivors to named nations. The next brings people from the nations to Jerusalem.','Vision: outward witness and return',false);

  const notes = {
    1:'Judah’s land is devastated and Jerusalem is pictured under threat. Sodom and Gomorrah serve as comparisons, not destinations on an army’s route.',
    2:'Nations stream toward the Lord’s mountain in Zion. The text does not name their home countries. The map shows the destination but does not invent travel routes.',
    3:'The chapter describes failed leaders and pain in Judah and Jerusalem. It gives no army route between cities.',
    4:'The surviving community is centered on Jerusalem and Zion. The shelter imagery does not identify a travel route.',
    5:'The vineyard represents Israel and Judah, and an army is summoned from afar. Its origin and approach road are not named.',
    6:'Isaiah’s call takes place in a temple vision. The later desolation is not presented as a sequence of military movements.',
    9:'The northern lands and Galilee face distress. Aram and Philistia threaten Israel from opposite sides. The text does not name their army roads.',
    12:'The song celebrates deliverance in Zion. It does not describe a journey between named cities.',
    14:'Babylon, Assyria, and Philistia appear in separate prophecies. Their place beside each other does not show one army route.',
    17:'Damascus and Ephraim face loss. The chapter does not specify an attacker’s route between the named places.',
    18:'Messengers and a gift link Cush and Zion. The opening mission’s destination is not specified.',
    22:'Jerusalem’s defenses and the valley setting describe a local crisis. No complete military approach is given.',
    24:'The judgment reaches the whole earth. Zion provides a named local anchor rather than the limits of the vision.',
    25:'The mountain feast and the judgment on Moab are different images. No army’s road between them is described.',
    28:'Judgment on Ephraim and the warning to Jerusalem are related scenes. They do not describe an army march between the cities.',
    29:'Ariel faces siege. Jerusalem is the setting, but the besieging army’s road is unnamed.',
    31:'Egypt’s horses and chariots are contrasted with protection of Jerusalem. The chapter does not describe a completed Egyptian march.',
    32:'Ruined fields contrast with peaceful homes. This contrast shows a changed society, not a named travel route.',
    33:'Broken agreements and deserted roads frame the danger to Zion. The text does not identify a route for those roads.',
    34:'Judgment concentrates on Edom and Bozrah. The imagery does not establish an army’s approach road.',
    35:'The redeemed reach Zion on a holy highway. Their point of departure and exact road are not named.',
    38:'Hezekiah’s illness, prayer, and recovery belong to the Jerusalem setting. They do not supply an intercity route.',
    40:'A way through the wilderness announces comfort to Jerusalem. The poem does not give a measurable route.',
    41:'A conqueror is stirred from the east and north. The chapter does not name a sequence of campaign stops.',
    42:'Coasts, Kedar, and Sela join the song. These are places of praise, not stops on one travel route.',
    43:'The gathering spans east, west, north, and south. Those compass directions do not specify cities of origin.',
    44:'Jerusalem is to be rebuilt. The chapter names Cyrus but does not describe his army route.',
    45:'Cyrus’s victories and the worldwide invitation extend beyond one local scene. No detailed campaign road is given.',
    46:'Babylonian gods are carried as burdens, contrasted with God carrying the people. Their destination is not specified.',
    47:'Babylon’s fall is the central scene. The poem does not give the invaders’ travel route.',
    49:'People gather from afar, north, west, and Sinim. Sinim’s identification is disputed, so it receives no precise route.',
    50:'This chapter uses images of exile and a listening servant. It does not name specific cities of departure or arrival.',
    51:'The return to Zion recalls the exodus. The poetic recollection does not specify a contemporary road.',
    52:'Messengers announce a return, and the people are called to leave. The text does not name their starting point.',
    53:'The servant suffers, dies, and is honored. These events do not give a location or travel route. Jerusalem remains a reference in the writing.',
    54:'The restored city expands in a promise. This is not a record of a specific migration route.',
    55:'Nations come in response to an invitation. The chapter does not identify their geographic starting points.',
    56:'Foreigners are welcomed at the holy mountain. Their origins are not listed as travel routes.',
    57:'High places, valleys, and the restored road form the chapter’s landscape. They do not identify a route between named cities.',
    58:'Rebuilding ruins and repairing paths describe communal restoration. The chapter does not name a specific intercity road.',
    59:'The Redeemer comes to Zion. A departure point or travel route is not supplied.',
    61:'Rebuilt cities and new wealth describe renewal. The chapter does not identify a specific travel route.',
    62:'A highway is prepared for the people approaching Zion. Their origins and the road’s alignment are not specified.',
    63:'The figure comes from Edom and Bozrah. The destination is unstated, and the scene uses judgment imagery.',
    64:'The prayer names ruined holy cities and Jerusalem. It does not specify the attackers’ approach.',
    65:'Sharon, the Valley of Achor, and renewed Jerusalem show restoration across the landscape. They are not sequential travel stops.',
    66:'Survivors go to distant nations, and people are brought to Jerusalem. Several ancient names have disputed identifications.'
  };
  for (const item of data.chapterMaps) {
    item.narrative ||= notes[item.chapter] || 'The chapter has no sufficiently specified intercity movement to trace. The map shows its literary setting and named places.';
    item.contextPlaceIds ||= [...item.focusPlaceIds];
    item.contextRoutes ||= [];
    item.impacts ||= [];
    item.limits ||= 'All connecting lines show broad links. Open a path to see its Bible reference and evidence.';
    const refs = [...item.routes,...item.contextRoutes];
    const routePlaces = refs.flatMap(ref => data.textRoutes.find(r=>r.id===ref.id)?.placeIds || []);
    item.placeIds = [...new Set([...item.placeIds,...item.contextPlaceIds,...routePlaces,...item.impacts.map(p=>p.placeId)])];
  }
  for (const route of data.textRoutes) {
    route.kind ||= route.id === 'return-babylon' ? 'restoration' : route.id === 'egypt-envoys' ? 'diplomacy' : 'military';
    route.evidence ||= 'General connection of places in the text';
  }
}
