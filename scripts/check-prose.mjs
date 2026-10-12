import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const data = JSON.parse(await readFile(new URL('../dist/data/books/isaiah-native-content.json', import.meta.url)));
const errors = [];
const proseKeys = new Set([
  'summary', 'limitations', 'studyText', 'detail',
  'uncertainty', 'description', 'note', 'narrative', 'limits', 'application',
  'treatment', 'quotationCheck', 'accessLimits', 'grammar', 'meaning',
  'discussion', 'greekNote', 'context', 'evidence', 'periodNote', 'mapNote',
  'status', 'text', 'previewText',
]);
const badText = /proveed|reshow|givess|showss|\b(?:teh|recieve|seperate)\b/i;
const unclearTerms = /\b(?:schematic|corridor|itinerary|geopolitical|chronology|reconstruction|contextual anchor|coherent account)\b/i;

function checkText(text, path) {
  if (!text) return;
  if (/\s{2,}/.test(text)) errors.push(`${path}: repeated spaces`);
  if (badText.test(text)) errors.push(`${path}: possible typo`);
  if (/\b(?:undefined|null|NaN)\b/.test(text)) errors.push(`${path}: unfinished generated value`);
  if (unclearTerms.test(text)) errors.push(`${path}: use simpler words or explain the technical term`);
  const mayBeLabel = path.includes('.periods[') || path.endsWith('.evidence');
  if (!mayBeLabel && !/[.!?…”')\]]$/.test(text)) errors.push(`${path}: prose does not end with punctuation`);

  const sentences = text.split(/(?<=[.!?][”')\]]?)\s+/);
  for (const sentence of sentences) {
    const words = sentence.match(/[A-Za-zÀ-ÿ0-9’'-]+/g) || [];
    if (words.length > 15) errors.push(`${path}: sentence has ${words.length} words; the guide limit is 15`);
  }
}

function visit(value, path = 'content', parentKey = '') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, `${path}[${index}]`, parentKey));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    const quotedText = key === 'text' && (parentKey === 'excerpt' || parentKey === 'chapterStudies');
    if (typeof child === 'string' && proseKeys.has(key) && !quotedText) checkText(child, nextPath);
    else visit(child, nextPath, key);
  }
}

visit(data);
for (const source of data.sources) {
  if (/^The (?:lesson|article|interview|study)\b/i.test(source.studyText || '')) {
    errors.push(`source ${source.id}: study text begins without naming its source`);
  }
  if ((source.id.startsWith('cfm2026-') || source.group === 'conference-year') && /chapters 36[–-]39/i.test(source.limitations || '')) {
    errors.push(`source ${source.id}: generic source limits must not center chapters 36–39`);
  }
}
if (/Isaiah 36[–-]39/i.test(data.periods.find(period => period.id === 'pre')?.description || '')) {
  errors.push('period pre: timeline label must not center chapters 36–39');
}
for (const passage of data.passages) {
  if (/^(?:Meridian|Isaiah Study Guide) study question:/i.test(passage.lds?.text || '')) {
    errors.push(`passage ${passage.id}: LDS question must not use a branded preface`);
  }
  if (passage.chapter >= 36 && passage.chapter <= 39 && /Related (?:Come, Follow Me|general conference) study:/i.test(passage.lds?.text || '')) {
    errors.push(`passage ${passage.id}: pilot-era cross-chapter prompt must not privilege chapters 36–39`);
  }
  for (const note of passage.studyNotes || []) {
    if ((note.sourceIds || []).some(id => id.startsWith('madsen') || id === 'opening-isaiah-madsen')) {
      if (!/Ann (?:N\. )?Madsen/.test(`${note.title} ${note.text}`) || !/scholar/i.test(note.text) || !/interview/i.test(note.text)) {
        errors.push(`passage ${passage.id}: Madsen note needs her full name, role, and interview context`);
      }
    }
  }
}
assert.equal(errors.length, 0, `Prose check failed:\n${errors.slice(0, 30).join('\n')}`);
console.log('Prose check passed: punctuation, generated values, common typos, spacing, vocabulary, and the 15-word sentence limit.');
