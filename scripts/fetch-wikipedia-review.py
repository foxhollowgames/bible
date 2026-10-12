"""Read selected public Wikipedia articles and preserve compact review metadata."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import quote, urlencode, urljoin
import urllib.request, json, re, tempfile
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parent.parent
subjects=['Sennacherib', "Sennacherib's campaign in the Levant", 'Siege of Lachish', 'Lachish', 'Azekah', 'Azekah Inscription', 'Ekron', 'Timnah', 'Eltekeh', 'Jaffa', 'Sidon', 'Tyre, Lebanon', 'Libnah', 'Hezekiah', 'Siloam inscription', 'Nineveh', 'Marduk-apla-iddina II', 'Babylonian captivity', 'Cyrus the Great', 'Book of Isaiah', 'Moab', 'Edom', 'Syro-Ephraimite War', 'Taharqa']
def fetch(title):
    url='https://en.wikipedia.org/wiki/'+quote(title.replace(' ','_'))
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'IsaiahStudyGuide/0.1 (local educational source review)'})
        with urllib.request.urlopen(req,timeout=35) as response: html=response.read().decode('utf-8'); final=response.url
        soup=BeautifulSoup(html,'html.parser')
        body=soup
        paragraphs=[p.get_text(' ',strip=True) for p in body.select('p') if len(p.get_text())>50]
        coordinate=soup.select_one('.geo')
        files=[]
        for a in body.select('a[href]'):
            href=a.get('href','')
            if '/wiki/File:' in href or href.startswith('./File:'):
                absolute=urljoin(final,href)
                if absolute not in files:files.append(absolute)
        refs=[{'text':li.get_text(' ',strip=True),'links':[urljoin(final,a.get('href')) for a in li.select('a.external[href]')]} for li in body.select('li[id^="cite_note"]')]
        old=soup.select_one('#t-permalink a')
        match=re.search(r'oldid=(\d+)',str(old or '')) or re.search(r'"wgRevisionId":(\d+)',html) or re.search(r'oldid=(\d+)',html)
        return {'title':title,'url':final,'revisionId':match.group(1) if match else None,'coordinates':coordinate.get_text() if coordinate else None,'files':files,'references':refs,'paragraphs':paragraphs}
    except Exception as e:return {'title':title,'url':url,'error':str(e)}
with ThreadPoolExecutor(max_workers=4) as pool:rows=list(pool.map(fetch,subjects))
cache=Path(tempfile.gettempdir())/'bible-wayfinder-wikipedia-review.json'
cache.write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'cache':str(cache),'articles':len(rows),'errors':[{'title':r['title'],'error':r['error']} for r in rows if 'error' in r]}))
