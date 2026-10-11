// Reviewed 2026-09-27. Video summaries use YouTube's English auto-captions.
// Publisher and university records verify bibliography. Access limits stay visible.
const license = 'Linked resource; original study guide summary. Video, transcript, and publication text are not reproduced.';
const group = 'mcclellan';
const sources = [
  {
    id: 'dm-isaiah53', title: 'My claim about Isaiah 53 is “demonstrably false”?',
    author: 'Dan McClellan', year: 'September 2, 2026', type: 'Scholar video',
    url: 'https://www.youtube.com/watch?v=kfaeHPSkMHY',
    summary: 'McClellan says the servant is Israel. He links the servant’s pain with exile. He studies an old Aramaic Bible. He says it does not show a dying Messiah before Jesus’s time. The books he cites do not rule out every earlier idea.',
    limitations: 'This video is about Isaiah 49 and 53. It gives McClellan’s view of history. It is not Church teaching. Experts still debate who the servant is. Missing proof does not prove that an idea never existed.',
    reviewed: 'English auto-captions reviewed. Publication titles checked against publisher or university records.',
    citedSourceIds: ['dm-chilton','dm-page','dm-suffering-servant','dm-tooman'],
    timestamps: [{seconds:100,label:'1:40 · Scope of the claim'},{seconds:211,label:'3:31 · Chilton'},{seconds:293,label:'4:53 · Page and uncertainty'},{seconds:467,label:'7:47 · The Suffering Servant'},{seconds:557,label:'9:17 · Tooman and the Targum'}],
  },
  {
    id: 'dm-deutero', title: 'What is Deutero-Isaiah?',
    author: 'Dan McClellan', year: 'October 10, 2024', type: 'Scholar video',
    url: 'https://www.youtube.com/watch?v=wd34rzWRjCM',
    summary: 'Second Isaiah is a name for Isaiah 40–55. McClellan thinks these chapters came from a later time. Chapter 39 warns of exile. Chapter 40 speaks as if exile has begun. He also finds new words and a new style.',
    limitations: 'This is one expert view. The video does not review all the proof. A new chapter does not prove that a new person wrote it. The words we checked did not name another study.',
    reviewed: 'English auto-captions and video date reviewed.',
    timestamps: [{seconds:33,label:'0:33 · Isaiah 39 to 40'},{seconds:136,label:'2:16 · Authorship conclusion'}],
  },
  {
    id: 'dm-scroll', title: 'Does the Great Isaiah Scroll prove the Bible hasn’t changed?',
    author: 'Dan McClellan', year: 'May 3, 2024', type: 'Scholar video',
    url: 'https://www.youtube.com/watch?v=HL9N-pF5pcU',
    summary: 'McClellan compares two old Hebrew copies of Isaiah 53. Many changes are only spelling. Some changes affect the words or their meaning. One copy has the word “light” in verse 11. The text was kept well, but it did change.',
    limitations: 'We did not check the video’s number totals. One chapter cannot show how much the whole Bible changed. The date of a copy is not the date when the book was first written.',
    reviewed: 'English auto-captions reviewed. The cited edition’s identity and scope were checked with its publisher.',
    citedSourceIds: ['dm-ulrich'],
    timestamps: [{seconds:63,label:'1:03 · Edition and variant readings'},{seconds:270,label:'4:30 · Isaiah 53:11'},{seconds:336,label:'5:36 · Preservation and its limits'}],
  },
  {
    id: 'dm-line', title: 'What’s going on with “line upon line” in Isaiah 28:10?',
    author: 'Dan McClellan', year: 'May 23, 2024', type: 'Scholar video',
    url: 'https://www.youtube.com/watch?v=bLDWQ6vW1qA',
    summary: 'Isaiah 28:10 repeats short sounds. McClellan says they copy speech that people cannot understand. Verses 11–13 warn that the people will not understand. This is not the same as a lesson about learning one step at a time.',
    limitations: 'This is one way to read hard Hebrew words. A faith lesson can use the words in another way. The part we checked did not name another study.',
    reviewed: 'English auto-captions and video date reviewed. No Hebrew transcription was copied from the auto-captions.',
    timestamps: [{seconds:18,label:'0:18 · Translation question'},{seconds:60,label:'1:00 · Context in Isaiah 28'}],
  },
  {
    id: 'dm-chilton', title: 'The Glory of Israel: The Theology and Provenience of the Isaiah Targum',
    author: 'Bruce D. Chilton', year: '1982 original; linked publisher edition dated 1983', type: 'Scholarly book',
    url: 'https://www.bloomsbury.com/uk/glory-of-israel-9780567460929/',
    summary: 'Chilton studies how the Isaiah Targum developed across the first through fourth centuries CE. A Targum is an Aramaic translation that also interprets the text. McClellan cites Chilton at 3:31 when discussing stages of interpretation around 70–135 CE. The useful distinction is between a text’s surviving form and earlier traditions within it.',
    limitations: 'Publisher description and the excerpt read in the video were reviewed, not the complete book. The proposed dates describe layers of interpretation. They do not date every sentence. The linked edition’s date differs from the 1982 original cited in the video.',
    reviewed: 'Publisher record checked. Video excerpt supplies the specific dating discussion.',
  },
  {
    id: 'dm-page', title: 'The Suffering Servant between the Testaments',
    author: 'S. H. T. Page', year: '1985 · New Testament Studies 31(4), 481–497', type: 'Scholarly article',
    url: 'https://www.cambridge.org/core/journals/new-testament-studies/article/abs/suffering-servant-between-the-testaments/EA79EE87245D6E4AF34470865632660B',
    summary: 'Page examines whether people saw the suffering servant as the Messiah before Christianity. Page rejects the claim that all readers agreed. He also refuses to rule out all earlier ideas. He finds no clear early belief in a Messiah who atones through suffering. He allows that some ideas prepared for that belief. This limit matters when we assess McClellan’s stronger opening words.',
    limitations: 'Cambridge’s record, extract, and references were accessible. The conclusion was reviewed through McClellan’s reading, not a complete independent reading of the article. This 1985 study does not represent every subsequent argument.',
    reviewed: 'Bibliography checked with Cambridge. The conclusion comes second-hand, through the cited video.',
  },
  {
    id: 'dm-suffering-servant', title: 'The Suffering Servant: Isaiah 53 in Jewish and Christian Sources',
    author: 'Bernd Janowski and Peter Stuhlmacher, editors', year: '2004', type: 'Scholarly essay collection',
    url: 'https://www.eerdmans.com/9780802808455/the-suffering-servant/',
    summary: 'This book collects Jewish and Christian studies of Isaiah 53. McClellan introduces this book at 7:47. His selected passage describes the Targum’s victorious Messiah. It warns against assuming that its changes were aimed at Christianity. The collection points readers to more study of this passage.',
    limitations: 'Publisher description and the excerpt read in the video were reviewed. The complete collection was not read. The chapter author and page for the displayed excerpt were not independently verified. The excerpt does not speak for every contributor.',
    reviewed: 'Title, editors, and publication year checked with Eerdmans. The excerpt summary comes second-hand, through the video.',
  },
  {
    id: 'dm-tooman', title: 'The Servant-Messiah and the Messiah’s Servants in Targum Jonathan Isaiah',
    author: 'William A. Tooman', year: '2021 · in Isaiah’s Servants in Early Judaism and Christianity', type: 'Scholarly chapter · free manuscript',
    url: 'https://research-repository.st-andrews.ac.uk/bitstream/10023/28155/1/Servant_and_Servants_in_TJ_Isaiah_WUNT_.pdf',
    summary: 'Tooman compares the traditional Hebrew text with the Isaiah Targum. The Targum presents a victorious Messiah who protects those who suffer. Its servants are the righteous who obey Torah, God’s instruction. They can include outsiders who join the covenant. This changes how the servant and the community relate. McClellan cites the chapter at 9:17.',
    limitations: 'The university repository provides an accessible manuscript. Its pagination can differ from the published chapter. The argument concerns this Targum’s interpretation, not every Jewish reading of Isaiah. The university dates it to 2021. The video gave only a rough age.',
    reviewed: 'Repository manuscript and University of St Andrews publication record reviewed.',
  },
  {
    id: 'dm-ulrich', title: 'The Biblical Qumran Scrolls: Transcriptions and Textual Variants',
    author: 'Eugene Ulrich, editor', year: '2010', type: 'Scholarly manuscript edition',
    url: 'https://www.degruyterbrill.com/document/isbn/9789004181830/html',
    summary: 'This edition presents written copies of Bible manuscripts from Qumran. It also records differences between the texts. McClellan introduces the edition at 1:07 in his Great Isaiah Scroll video. A critical apparatus is a set of notes about these differences. It helps readers check which manuscript supports each reading. Readers do not need to trust a broad claim about accuracy.',
    limitations: 'Publisher description and McClellan’s explanation were reviewed, not the complete edition. The local guide does not reproduce its transcriptions or apparatus. The video’s letter counts remain attributed to McClellan.',
    reviewed: 'Bibliography and scope checked with the publisher. Passage-level discussion comes from the video.',
  },
];

export function addMcClellan(content) {
  for (const source of sources) {
    const record = {...source, group, license};
    const index = content.sources.findIndex(s => s.id === record.id);
    if (index < 0) content.sources.push(record);
    else content.sources[index] = record;
  }
  const passage = content.passages.find(p => p.chapter === 39 && p.start <= 6 && p.end >= 6);
  if (!passage) throw new Error('Missing Isaiah 39:6 passage');
  const note = ' McClellan compares this warning with Isaiah 40. Isaiah 40 speaks as if the exile has already happened. He uses this change to support a later date for Isaiah 40–55. Scholars often call this section Second Isaiah.';
  if (!passage.summary.includes(note.trim())) passage.summary += note;
  passage.sourceIds = [...new Set([...passage.sourceIds, 'dm-deutero'])];
  const step = content.guides.find(g => g.id === 'horizon')?.steps.find(s => s.title === 'Jerusalem’s later destruction');
  if (!step) throw new Error('Missing Babylon guide step');
  const study = ' Related authorship study: McClellan compares Isaiah 39’s warning with chapter 40’s perspective after exile. His video explains the term Second Isaiah.';
  if (!step.text.includes(study.trim())) step.text += study;
  step.sourceIds = [...new Set([...step.sourceIds, 'dm-deutero'])];
  return content;
}
