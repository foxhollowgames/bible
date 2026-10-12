"""Finish Isaiah's reader files. Run this after create-content.mjs and prepare-words.py."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'dist/data/books'
def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))
settings=read('scripts/isaiah-book.json')
record=read('scripts/isaiah-people.json')
licensed=read('scripts/isaiah-portrait-images.json')
content_path=OUT/'isaiah-native-content.json'
content=json.loads(content_path.read_text(encoding='utf-8'))
# The reader takes the book's name, timeline, and source groups from these keys.
content.update(settings)
# A named reference through another book states its chapter.
for source in content['sources']:
    for reference in source.get('scriptureReferences',[]):
        if reference['label']=='Isaiah through Luke 4:18':reference['chapters']=[61]
content_path.write_text(json.dumps(content,ensure_ascii=False,indent=2),encoding='utf-8')
# Each person has a generated portrait. Twelve also have licensed historical art.
art={}
for person in record['people']:
    art[person]=dict(src=f'assets/portraits/{person}-v2.png',generated=True)
    if person in licensed:art[person]['licensed']=licensed[person]
unknown=sorted(set(licensed)-set(record['people']))
if unknown:raise SystemExit(f'Licensed portraits without a profile: {unknown}')
(OUT/'isaiah-art.json').write_text(json.dumps(art,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(OUT/'isaiah-people.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f"Finished Isaiah: {len(record['people'])} profiles and {len(licensed)} licensed portraits.")
