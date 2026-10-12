// Public sources checked on September 29, 2026. Summaries are original study guide prose.
const reviewed = 'Checked September 29, 2026. ';
const linked = 'Linked source with an original study guide summary. Public access does not grant permission to reproduce the work.';
export function addPrismAndHarmony(content) {
  const sources = [
{
  "id": "madsen-poetry",
  "group": "opening-isaiah",
  "title": "Poetry in the Book of Isaiah",
  "author": "Ann N. Madsen, interviewed by Darryl Alder · Search Isaiah",
  "url": "https://searchisaiah.org/expert-insights/ann-madsen/poetry-in-the-book-of-isaiah/",
  "summary": "Latter-day Saint Isaiah scholar Ann N. Madsen explains how related poetic lines develop an idea. She gives this explanation in an interview. Isaiah 1:8 shows field shelters and a city under attack. These images show different parts of Zion’s isolation.",
  "limitations": "This page presents parts of an interview. The note sums up her example. It does not say every line of Isaiah has the same poetic form.",
  "year": "Undated online text",
  "type": "Public interview excerpt",
  "reviewed": "Checked September 30, 2026. Relevant public text reviewed. Recordings and full book not reviewed.",
  "license": "Linked source with an original study guide summary. Short quotations retain attribution."
},
{
  "id": "madsen-understanding",
  "group": "opening-isaiah",
  "title": "Ann Madsen Shares Insights Into Understanding Isaiah (Part 1)",
  "author": "Ann N. Madsen, interviewed by Darryl Alder · Search Isaiah",
  "url": "https://searchisaiah.org/expert-insights/ann-madsen-shares-insights-into-understanding-isaiah-part-1/",
  "summary": "Latter-day Saint Isaiah scholar Ann N. Madsen connects study with historical context and close reading in an interview. She reads Isaiah 30:21 as an example of personal revelation.",
  "limitations": "Her personal-revelation reading is an LDS devotional application. It does not replace the passage’s address to Judah.",
  "year": "Undated online text",
  "type": "Public interview excerpt",
  "reviewed": "Checked September 30, 2026. Relevant public text reviewed. Recordings and full book not reviewed.",
  "license": "Linked source with an original study guide summary. Short quotations retain attribution."
},
{
  "id": "harmony-kjv2",
  "group": "opening-isaiah",
  "title": "Isaiah 2 · King James Version",
  "author": "The Church of Jesus Christ of Latter-day Saints · online scripture edition",
  "url": "https://www.churchofjesuschrist.org/study/scriptures/ot/isa/2?lang=eng&id=p16#p16",
  "summary": "Verse 16 names the ships of Tarshish. It does not include the separate ships-of-the-sea clause found in 2 Nephi 12:16.",
  "limitations": "This comparison identifies an English wording difference. It does not by itself establish the history of the underlying texts.",
  "year": "Undated online text",
  "type": "Scripture · official online edition",
  "reviewed": "Checked September 30, 2026. Relevant public text reviewed. Recordings and full book not reviewed.",
  "license": "Linked source with an original study guide summary. Short quotations retain attribution."
},
{
  "id": "harmony-nephi12",
  "group": "opening-isaiah",
  "title": "2 Nephi 12 · Book of Mormon",
  "author": "The Church of Jesus Christ of Latter-day Saints · online scripture edition",
  "url": "https://www.churchofjesuschrist.org/study/scriptures/bofm/2-ne/12?lang=eng&id=p16#p16",
  "summary": "Verse 16 includes ships of the sea as well as ships of Tarshish. Read with Isaiah 2:16 to see the additional clause.",
  "limitations": "The chapter note applies Hopkin’s comparison method. He does not discuss this verse in the cited interview.",
  "year": "Undated online text",
  "type": "Scripture · official online edition",
  "reviewed": "Checked September 30, 2026. Relevant public text reviewed. Recordings and full book not reviewed.",
  "license": "Linked source with an original study guide summary. Short quotations retain attribution."
},
    {
      id: 'prism-taylor', group: 'sennacherib-prism',
      title: 'Sennacherib’s Prism — the Taylor Prism',
      author: 'British Museum · museum number 91032', year: '691 BCE', type: 'Primary evidence · museum record',
      url: 'https://www.britishmuseum.org/collection/object/W_1855-1003-1',
      summary: 'The Taylor Prism preserves an Assyrian royal account. The museum dates this object to 691 BCE. The campaign against Judah occurred in 701 BCE. The photograph shows two views of one object.',
      limitations: 'The Taylor, Chicago, and Jerusalem prisms are separate objects. Do not use their dates as the date of the campaign. The royal account promotes Sennacherib’s rule.',
      reviewed: reviewed + 'Object identity and date checked in the museum’s indexed collection record. Direct access to the object page returned HTTP 403. Photograph and public-domain release checked on Wikimedia Commons.',
      license: 'Museum record linked only. Photograph by David Castor, released into the public domain by its creator.'
    },
    {
      id: 'prism-luckenbill', group: 'sennacherib-prism',
      title: 'The Annals of Sennacherib — free English translation',
      author: 'Daniel David Luckenbill · University of Chicago', year: '1924 · Oriental Institute Publications 2', type: 'Scholarly edition · free PDF',
      url: 'https://isac.uchicago.edu/publications/annals-sennacherib',
      summary: 'The university provides the full edition as a free PDF. It includes an English translation, transliteration, and copies of the cuneiform signs. The Hezekiah passage is in column III. It is on printed pages 32–34 and PDF pages 46–48. Sennacherib claims 46 walled cities, captives, and tribute. He says that he trapped Hezekiah in Jerusalem. He does not claim to have captured Jerusalem.',
      limitations: 'This 1924 translation uses older language and includes uncertain readings. Royal claims and totals are not independent counts. The inscription does not confirm the angel in Isaiah’s account. It also does not confirm the number of Assyrian deaths.',
      reviewed: reviewed + 'University publication record and the Hezekiah section of the linked PDF checked. The complete book was not reviewed.',
      license: 'Free PDF linked from the university. Its current publication page displays CC BY-NC-ND 4.0. Bible Wayfinder reproduces no pages.'
    },
    {
      id: 'prism-jerusalem', group: 'sennacherib-prism',
      title: 'The Assyrian Campaign in Judah as told in the Sennacherib Prism',
      author: 'Laura A. Peri · The Israel Museum, Jerusalem', year: '2025 exhibition page · object dated 691 BCE', type: 'Museum scholarship',
      url: 'https://imj.org.il/en/exhibitions/special-display-assyrian-campaign-judah-told-sennacherib-prism',
      summary: 'The museum identifies its Jerusalem Prism as IMJ 71.72.249, from Nineveh. Its display page links the royal account with Isaiah 36–37. It also links it with 2 Kings 18–19 and 2 Chronicles 32. The page links to a translation, sign copy, object record, and campaign notes. The museum says the text does not clearly describe an attack on Jerusalem.',
      limitations: 'This page concerns the Jerusalem object, not the Taylor Prism. The linked translation pages returned no readable text during this check. Their full contents were not reviewed. Words about shutting a king in do not show how the army fought.',
      reviewed: reviewed + 'English exhibition text and object metadata reviewed.', license: linked
    },
    {
      id: 'opening-isaiah', group: 'opening-isaiah', title: 'Opening Isaiah: A Harmony',
      author: 'Ann N. Madsen and Shon D. Hopkin', year: '2018 · ISBN 978-1-9443-9430-1', type: 'LDS scholarly study aid · publisher record',
      url: 'https://rsc.byu.edu/book/opening-isaiah',
      summary: 'This harmony places five Isaiah texts beside each other. They include the King James Version and Joseph Smith Translation. They also include the Book of Mormon, Dead Sea Scrolls, and NRSV. The public publisher page describes notes and maps. Its contents list includes a map for Isaiah 36:19 and 37:12–13.',
      limitations: 'BYU marks the full book as unavailable for online reading. The download button requires purchase details. A separate public sample is listed below. This scholarly study aid is not an official statement of Church doctrine.',
      reviewed: reviewed + 'Publisher description, authors, publication year, contents list, and purchase-download page checked. Full book not reviewed.', license: linked
    },
    {
      id: 'opening-isaiah-sample', group: 'opening-isaiah', title: 'Opening Isaiah — public sample: Isaiah 1–6 and 7:1',
      author: 'Ann N. Madsen and Shon D. Hopkin · BYU Religious Studies Center', year: 'Undated online sample · 2018 book', type: 'LDS scholarly study aid · free sample PDF',
      url: 'https://rsc.byu.edu/sites/default/files/pub_content/pdf/Isaiah.pdf',
      summary: 'This public PDF has 23 pages. Its printed page numbers are 2–24. It shows Isaiah 1–6 and Isaiah 7:1 in side-by-side columns. Short notes explain selected differences.',
      limitations: 'This is a sample, not the complete book. It does not include Isaiah 36–37 or the rest of Isaiah 7. The file may differ from the final print edition. Blank cells must not be treated as proof that a manuscript lacks a passage.',
      reviewed: reviewed + 'PDF length, first and last passages, column headings, and selected notes checked. Every variant was not independently verified.',
      license: 'Publisher-hosted sample linked only. The modern translations and editorial notes remain copyrighted.'
    },
    {
      id: 'opening-isaiah-hopkin', group: 'opening-isaiah', title: 'Shon Hopkin — The Start of Opening Isaiah: A Harmony with Ann Madsen',
      author: 'Shon D. Hopkin, interviewed by Ken Krogue · Search Isaiah', year: '2018', type: 'LDS author interview · public transcript',
      url: 'https://searchisaiah.org/podcast/shon-hopkin-the-start-of-opening-isaiah-a-harmony-with-ann-madsen/',
      summary: 'Hopkin says students needed an easier way to compare two Isaiah texts. They were the Book of Mormon and Joseph Smith Translation. He tells how he worked with Madsen. He also describes five columns, Dead Sea Scrolls differences, and short notes. He identifies the modern column as the NRSV. The notes also mention some NIV readings.',
      limitations: 'The page provides an interview transcript, not the book. Statements about release timing and electronic availability describe the interview period. They do not establish free access to the full book today.',
      reviewed: reviewed + 'Public transcript reviewed; embedded recording not independently checked.', license: linked
    },
    {
      id: 'opening-isaiah-madsen', group: 'opening-isaiah', title: 'Ann Madsen — Shares Her Experiences & Studies of Isaiah',
      author: 'Ann N. Madsen, interviewed by Kelsey Wilding · Search Isaiah', year: '2018', type: 'LDS author interview · public transcript',
      url: 'https://searchisaiah.org/podcast/ann-madsen-shares-her-experiences-studies-of-isaiah/',
      summary: 'Latter-day Saint Isaiah scholar Ann N. Madsen explains in an interview that hineni in Isaiah 6:8 shows readiness to serve. She also describes how poetic lines, word notes, and maps help readers understand the text.',
      limitations: 'This is the author’s brief explanation of the resource. It does not reproduce the harmony or independently establish its textual conclusions.',
      reviewed: reviewed + 'Public transcript reviewed; embedded recording not independently checked.', license: linked
    }
  ];
  for (const source of sources) {
    if (!content.sources.some(item => item.id === source.id)) content.sources.push(source);
  }
  const interviewNotes = {
  "1": {
    "title": "Ann Madsen on three images of an isolated city",
    "text": "Ann N. Madsen is a Latter-day Saint Isaiah scholar. In an interview, she explains how Isaiah 1:8 uses related images. They develop one idea. A temporary field shelter and a city under attack show different parts of Zion’s isolation. The lines build meaning through comparison, not end rhyme.",
    "application": "Read verses 7–9 together. The images follow the account of ruined land; the surviving city remains exposed. Survival here does not mean safety.",
    "sourceIds": [
      "madsen-poetry"
    ],
    "perspective": "lds",
    "kind": "interview-insight"
  },
  "2": {
    "title": "Hopkin: compare the wording before the commentary",
    "text": "Hopkin puts the scripture texts first. Parallel columns let readers see differences directly, while brief notes help with difficult points.",
    "application": "Compare Isaiah 2:16 in the King James Version with 2 Nephi 12:16. Both name ships of Tarshish. The Book of Mormon also names ships of the sea. Mark the extra words. Then read verses 12–17. The list leads to the humbling of human pride. This example applies Hopkin’s method. He does not discuss this verse in the interview.",
    "sourceIds": [
      "opening-isaiah-hopkin",
      "harmony-kjv2",
      "harmony-nephi12"
    ],
    "perspective": "lds",
    "kind": "interview-insight"
  },
  "6": {
    "title": "Ann Madsen on Isaiah’s offer to serve",
    "text": "Latter-day Saint Isaiah scholar Ann N. Madsen explains in an interview that hineni in Isaiah 6:8 expresses readiness to serve. Isaiah offers himself for the mission; he does more than announce his presence.",
    "application": "Trace the steps in verses 5–8. Isaiah admits his unclean lips. He receives cleansing and then volunteers. His offer follows the removal of guilt. Read the reply as a response to that cleansing.",
    "sourceIds": [
      "opening-isaiah-madsen"
    ],
    "perspective": "lds",
    "kind": "interview-insight"
  },
  "30": {
    "title": "Ann Madsen on hearing and following guidance",
    "text": "Ann N. Madsen is a Latter-day Saint Isaiah scholar. In an interview, she reads Isaiah 30:21 as an example of personal revelation. Her LDS application connects hearing God’s direction with following it.",
    "application": "Read verses 19–22 together. Guidance comes amid distress, and the people then reject their idols. In this passage, listening leads to a change in worship and conduct. Madsen’s personal application builds on this address to Judah.",
    "sourceIds": [
      "madsen-understanding"
    ],
    "perspective": "lds",
    "kind": "interview-insight"
  }
};
  const addIds = (item, ids) => { item.sourceIds = [...new Set([...(item.sourceIds || []), ...ids])]; };
  for (const passage of content.passages) {
    if ([36, 37].includes(passage.chapter)) addIds(passage, ['prism-taylor', 'prism-luckenbill', 'prism-jerusalem']);
    passage.studyNotes = [];
    if (passage.start === 1) {
      if (interviewNotes[passage.chapter]) passage.studyNotes.push(interviewNotes[passage.chapter]);
      if (passage.chapter === 36) passage.studyNotes.push({
        title: 'See the Assyrian evidence', perspective: 'historical',
        text: 'Isaiah 36:2 places the Assyrian mission at Lachish. A palace relief depicts Sennacherib receiving its spoils. The prism gives a royal account of the campaign. Open the footnotes to see both objects and their source summaries.',
        sourceIds: ['lachish', 'prism-taylor', 'prism-luckenbill']
      });
      if (passage.chapter === 37) passage.studyNotes.push({
        title: 'Compare the accounts of Jerusalem', perspective: 'historical',
        text: 'Isaiah credits God with saving Jerusalem. Sennacherib’s account emphasizes Judah’s losses and tribute. It does not claim Jerusalem’s capture. These sources do not establish the same explanation for the outcome.',
        sourceIds: ['web37', 'prism-taylor', 'prism-luckenbill', 'prism-jerusalem']
      });
    }
  }
  const step = content.guides.find(guide => guide.id === 'evidence')?.steps.find(item => item.title === 'The royal inscription');
  if (step) {
    step.text = 'Study guide summary: Sennacherib presents Judah’s losses and Hezekiah’s tribute as royal success. The prism does not claim Jerusalem’s capture. Compare this account with Isaiah 37. What does each account emphasize? The photograph shows the Taylor Prism. Luckenbill’s edition translates the separate Chicago Prism.';
    addIds(step, ['prism-taylor', 'prism-luckenbill', 'prism-jerusalem']);
  }
}
