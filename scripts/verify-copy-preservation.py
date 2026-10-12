"""Compare this editorial change with its recorded publication baseline."""
import json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
D=ROOT/'dist/data/books'
BASE='ddc06081b1cefb3a868ba2038e467f1fd2ea21ff'
def previous(path):
 return subprocess.check_output(['git','show',f'{BASE}:{path}'],cwd=ROOT)
count=0
for item in json.loads(previous('dist/data/books/directory.json')):
 if item['status']!='ready' or item['id']=='isaiah':continue
 path=f'dist/data/books/{item["id"]}.json'
 old=json.loads(previous(path));new=json.loads((ROOT/path).read_text(encoding='utf8'))
 for key in ['scripture','translation','copyright','sources']:
  assert old[key]==new[key],f'{item["id"]}: changed {key}'
 for a,b in zip(old['chapters'],new['chapters']):
  for key in ['sourceIds','places','people','route']:
   assert a[key]==b[key],f'{item["id"]} {a["chapter"]}: changed {key}'
  assert a['lds']['sourceIds']==b['lds']['sourceIds']
 count+=sum(map(len,new['scripture'].values()))
for path in ['dist/app.js','dist/portraits.js','dist/data/books/isaiah-native-content.json','dist/data/books/isaiah-native-scripture.json','dist/index.html']:
 assert previous(path).decode('utf8').replace('\r\n','\n')==(ROOT/path).read_text(encoding='utf8'),f'Changed original Isaiah file: {path}'
print(f'Preserved {count} scripture verses, source records, chapter links, and the original Isaiah guide.')
