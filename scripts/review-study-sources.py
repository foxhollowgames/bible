"""Fetch public prose for a bounded study-source review. The cache is temporary."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json, urllib.request, re, tempfile
from html.parser import HTMLParser
root=Path(__file__).resolve().parent.parent
sources=json.loads((root/'dist/data/books/isaiah-native-content.json').read_text(encoding='utf-8'))['sources']
class Reader(HTMLParser):
    def __init__(self):
        super().__init__(); self.blocks=[]; self.current=None; self.skip=0
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag in ('script','style'): self.skip+=1
        if tag in ('p','h1','h2','h3') and not self.skip: self.current={'id':attrs.get('id',''),'text':''}
    def handle_endtag(self,tag):
        if tag in ('script','style'): self.skip=max(0,self.skip-1)
        if tag in ('p','h1','h2','h3') and self.current:
            self.current['text']=re.sub(r'\s+',' ',self.current['text']).strip()
            if self.current['text']: self.blocks.append(self.current)
            self.current=None
    def handle_data(self,text):
        if self.current is not None and not self.skip: self.current['text']+=text
selected=[s for s in sources if s['id'].startswith(('gc-','cfm2026-')) or s['id'] in ('opening-isaiah-hopkin','opening-isaiah-madsen','yale','met701','anderson','livius605','ldsmanual','ldslesson','condie','ldsisaiah','prism-jerusalem')]
def fetch(s):
    try:
        req=urllib.request.Request(s['url'],headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req,timeout=25) as response: html=response.read().decode('utf-8')
        reader=Reader(); reader.feed(html)
        return {'id':s['id'],'url':s['url'],'blocks':reader.blocks}
    except Exception as e: return {'id':s['id'],'url':s['url'],'error':str(e)}
with ThreadPoolExecutor(max_workers=6) as pool: results=list(pool.map(fetch,selected))
cache=Path(tempfile.gettempdir())/'bible-wayfinder-source-review.json'
cache.write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'cache':str(cache),'sources':len(results),'errors':[{'id':r['id'],'error':r.get('error','No text')} for r in results if not r.get('blocks')]},ensure_ascii=False))
