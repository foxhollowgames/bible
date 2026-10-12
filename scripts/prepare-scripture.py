"""Extract publisher scripture text, excluding navigation and footnotes; retain notes separately."""
from html.parser import HTMLParser
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parent.parent
class ScriptureParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.verses=[]; self.current=None; self.skip_anchor=False; self.skip_number=False; self.done=False
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag=='ul' and self.current: self.done=True
        if self.done: return
        if tag=='a' and attrs.get('class')=='notemark': self.skip_anchor=True
        if tag=='span' and attrs.get('class')=='verse':
            self.current={'verse':int(attrs['id'][1:]),'text':''}
            self.verses.append(self.current); self.skip_number=True
        if tag=='div' and self.current and not self.skip_anchor: self.current['text']+=' '
    def handle_endtag(self, tag):
        if tag=='a': self.skip_anchor=False
        if tag=='span' and self.skip_number: self.skip_number=False
    def handle_data(self, text):
        if self.current and not self.done and not self.skip_anchor and not self.skip_number: self.current['text']+=text

chapters={}
counts=[31,22,26,6,30,13,25,22,21,34,16,6,22,32,9,14,14,7,25,6,17,25,18,23,12,21,13,29,24,33,9,20,24,17,10,22,38,22,8,31,29,25,28,28,25,13,15,22,26,11,23,15,12,17,13,12,21,14,21,22,11,12,19,12,25,24]
for chapter, expected in enumerate(counts,1):
    parser=ScriptureParser(); parser.feed((ROOT/f'scripts/isaiah{chapter}-source.html').read_text(encoding='utf-8'))
    for v in parser.verses: v['text']=re.sub(r'\s+',' ',v['text']).strip()
    assert len(parser.verses)==expected, (chapter,len(parser.verses))
    assert [v['verse'] for v in parser.verses]==list(range(1,expected+1))
    assert all(v['text'] for v in parser.verses)
    chapters[str(chapter)]=parser.verses
out={'translation':'World English Bible','copyright':'Public domain','source':'https://ebible.org/engwebp/ISA01.htm','edition':'Updated WEB, 66-book protocanon (engwebp). Chapters retrieved September 20–27, 2026.','chapters':chapters}
(ROOT/'dist/data/books/isaiah-native-scripture.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Prepared {sum(counts)} verses across Isaiah 1–66.')
