import { readFileSync } from 'node:fs';

const audit = JSON.parse(readFileSync(new URL('./conference-isaiah-audit.json', import.meta.url), 'utf8'));
const summaries = {
  '2025-10-14barcellos': 'Barcellos uses Isaiah 29:13 with Matthew 15:8. These verses separate sincere faith from outward religious acts. Barcellos asks listeners to examine their motives and give their hearts to God.',
  '2025-10-17johnson': 'Johnson applies Isaiah 11:1’s image of Jesse’s stem to Jesus Christ. He uses this image to encourage a strong bond with the Savior. He also calls for peace with God.',
  '2025-10-23jaggi': 'Jaggi links Isaiah 6:8 with willingness to answer God’s call. The talk uses Isaiah 28:10, 13 for gradual understanding of the Atonement. It applies Isaiah 51:17, 22’s cup imagery to Christ’s suffering. It pairs these verses with 3 Nephi 11:11. These references support teaching about covenants, worship, and strength through suffering.',
  '2025-10-26cziesla': 'Cziesla cites Isaiah 9:6 for the title Prince of Peace. He also cites Isaiah 49:13 for God’s comfort. He encourages simple, daily discipleship centered on Jesus Christ and His example.',
  '2025-10-35andersen': 'Andersen uses Isaiah 61:3’s promise of beauty from ashes. It offers hope to people hurt by the sins of others. He teaches that Christ can heal and strengthen them. He does not say when pain, grief, or unwanted memories will end.',
  '2025-10-41holland': 'Holland applies Isaiah 53:2 to Jesus Christ’s humble appearance. He says that God can work through ordinary or unexpected people. God can also work through ordinary means. He relates this theme to his testimony of the Book of Mormon.',
  '2025-10-45christofferson': 'Christofferson uses Isaiah 45:22 to invite people to seek salvation and strength from God. A quotation from Russell M. Nelson includes Isaiah 1:16–18 in a call to repentance and forgiveness. Christofferson applies these teachings to faith amid personal and public challenges.',
  '2025-10-46spannaus': 'Spannaus uses Isaiah 52:1’s garments of Zion. She also cites Isaiah 28:16 with Psalm 125:1. She applies these images to confidence in Christ’s kingdom. She encourages testimony, repentance, and attention to living prophets.',
  '2025-10-51bednar': 'Bednar cites Isaiah 11:2–3 with Job and Proverbs. He separates respect for God from anxious fear. He teaches that faith, repentance, and covenants can bring confidence about the Final Judgment.',
  '2025-10-52cuvelier': 'Cuvelier cites Isaiah 28:10 with Doctrine and Covenants 98:12. These verses describe discipleship as growth over time. He ends with Isaiah 43:1. This verse says the Redeemer calls His people by name. Cuvelier asks listeners to make their identity as Christ’s disciples their priority.',
  '2025-10-55renlund': 'Renlund names Isaiah in note 20 while quoting Luke 4:18. The verse tells of Christ’s work to heal and free people. Renlund connects that work with taking Christ’s name. He also calls people to serve those who are weak or wounded. This Isaiah reference comes through Luke. It is not a numbered Isaiah citation.',
  '2026-04-13kearon': 'Kearon cites Isaiah 55:8–11 with Proverbs while discussing trust when Church callings change. The talk encourages faith during assignments that challenge expectations, require adjustment, or attract little attention.',
  '2026-04-14yee': 'Yee cites Isaiah 41:10 to show that the Lord helps people who serve. Yee teaches that He knows each person they serve. He can help them meet each person’s needs.',
  '2026-04-15gilbert': 'Gilbert cites Isaiah 58:12 in applying the name Repairer to Jesus Christ. He presents Christ’s invitation to return. He describes Christ as the Redeemer who helps people come home.',
  '2026-04-210soares': 'Soares cites Isaiah 55:1, 3, 6, and 12. These verses invite people to receive spiritual food from Christ. Soares connects them with Jesus as the True Vine. He also connects them with lasting spiritual growth.',
  '2026-04-26wunderli': 'Wunderli cites Isaiah 41:10. He says Jesus Christ gives strength and relief. He encourages listeners to continue walking with Christ during hard experiences.',
  '2026-04-29matswagothata': 'Matswagothata quotes Isaiah 40:31 in note 16. The verse supports new strength through waiting on the Lord. Matswagothata connects this promise with trusting Christ during trials. He also gives hope for a better future.',
  '2026-04-44rowe': 'Rowe quotes Isaiah 41:10 and 43:1, 3 in note 17. These verses give hope against fear. Rowe applies their promises of strength, rescue, and personal care. She presents Christ as a guide and healer.',
  '2026-04-45rasband': 'Rasband uses the supporting hand in Isaiah 41:10. He also uses the marked palms in Isaiah 49:16. Both images describe Christ’s continuing care. Note 10 also cites Isaiah 45:23. This verse promises that every knee will bow. Rasband uses these verses in his Easter witness of Christ’s Resurrection.',
  '2026-04-53hall': 'Hall uses Isaiah 9:6 for names of Christ. These names include Prince of Peace and Counselor. He cites Isaiah 49:16 when describing the Redeemer’s mercy. He cites Isaiah 33:22 when calling Him the Lawgiver. Hall connects these names with repentance, forgiveness, and covenant discipleship.',
  '2026-04-54porter': 'Porter cites Isaiah 53:4–5 while teaching children about Christ’s suffering. This suffering covers sins and life’s challenges. Porter connects His Atonement and Resurrection with hope and service. We checked that the Isaiah citation is 53:4–5. We did not infer it from the talk’s title.',
  '2026-04-55andersen': 'Andersen applies Isaiah 40:28–29, 31 to strength and patience within an eternal marriage. He adapts the wording to address a couple waiting upon the Lord together. The published quotation marks these additions with brackets.',
};

export function addGeneralConference(content) {
  for (const talk of audit.matches) {
    const summary = summaries[talk.key];
    if (!summary) throw new Error(`Missing conference summary: ${talk.key}`);
    const record = {
      id: `gc-${talk.key}`, title: talk.title, author: talk.author,
      year: talk.conference, type: 'LDS general conference talk', url: talk.url,
      group: 'conference-year', conference: talk.conference, summary,
      scriptureReferences: talk.references,
      reviewed: 'Official English text, Isaiah references, and the associated paragraphs checked on September 27, 2026.',
      limitations: 'This talk uses Isaiah to teach faith. The questions are original study prompts. The speaker did not teach those questions.',
      license: 'Linked Church resource; original study guide summary. Talk text and media are not reproduced.',
    };
    const index = content.sources.findIndex(s => s.id === record.id);
    if (index < 0) content.sources.push(record);
    else content.sources[index] = record;
  }
}
