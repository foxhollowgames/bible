// Source-checked against the five official 2026 lesson pages on 2026-09-27.
// Keep each lesson's stated chapter range. Attach it only where the lesson covers the chapter.
const lessons = [
  {
    lesson: 38,
    title: 'God Is My Salvation',
    range: 'Isaiah 1–12',
    dates: 'September 14–20',
    summary: 'This lesson encourages reading Isaiah with attention to symbols, Jesus Christ, and fulfilled prophecy. It connects repentance with hope in Isaiah 1. It joins temple worship with gathering in chapters 2 and 11–12. It also studies Isaiah’s call and trust in the promised Savior.',
  },
  {
    lesson: 39,
    title: 'A Marvellous Work and a Wonder',
    range: 'Isaiah 13–14; 22; 24–30; 35',
    dates: 'September 21–27',
    summary: 'This lesson uses Babylon as an image of pride and sin in Isaiah 13–14. It finds the Messiah’s mission in chapters 22, 25, 26, and 28. It connects Isaiah 29 with the Restoration. Chapters 30 and 35 invite trust in the Lord’s power to heal and renew.',
  },
  {
    lesson: 40,
    title: 'Comfort Ye My People',
    range: 'Isaiah 40–49',
    dates: 'September 28–October 4',
    summary: 'This lesson reads these chapters as comfort for future captives and discouraged readers. It highlights God’s strength in Isaiah 40. It shows His help amid fear in chapter 41. Chapter 49 shows God remembering His people. It also studies how servant language can point to Christ, Israel, and Cyrus. These chapters show God’s power over earthly rulers.',
  },
  {
    lesson: 41,
    title: 'He Hath Borne Our Griefs, and Carried Our Sorrows',
    range: 'Isaiah 50–57',
    dates: 'October 5–11',
    summary: 'This lesson reads Isaiah 53 through Jesus Christ’s suffering for sins and sorrows. It finds hope for returning to God in chapters 54 and 57. Chapters 55–56 extend an invitation beyond one nation. The lesson connects Israel’s troubles with the reader’s need for God’s help.',
  },
  {
    lesson: 42,
    title: 'The Redeemer Shall Come to Zion',
    range: 'Isaiah 58–66',
    dates: 'October 12–18',
    summary: 'This lesson connects fasting with care for people in need in Isaiah 58. It also joins Sabbath worship with joy. Isaiah 61 describes a healing mission. Jesus applies this passage to Himself in Luke 4. The lesson studies gathering through light in Isaiah 60 and 62. It also looks toward Christ’s future reign in chapters 65–66.',
  },
];

export function addComeFollowMe(content) {
  for (const lesson of lessons) {
    const source = {
      id: `cfm2026-${lesson.lesson}`,
      title: `Come, Follow Me 2026 — ${lesson.range}: “${lesson.title}”`,
      author: 'The Church of Jesus Christ of Latter-day Saints',
      year: `${lesson.dates}, 2026`,
      type: 'LDS Come, Follow Me manual',
      url: `https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026/${lesson.lesson}?lang=eng`,
      summary: lesson.summary,
      limitations: `This lesson covers ${lesson.range}. The linked questions are original study prompts. The lesson teaches faith. It is not proof from history.`,
      license: 'Linked reading; original study guide paraphrase. Church lesson text and images are not reproduced.',
    };
    const index = content.sources.findIndex(item => item.id === source.id);
    if (index === -1) content.sources.push(source);
    else content.sources[index] = source;
  }
  return content;
}
