"""Download reviewed Commons portrait images and preserve their license data."""
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path
from html import unescape

ROOT = Path(__file__).resolve().parent.parent
FILES = {
    'rezin': 'King Rezin as he is protrayed in the Liber Chronicarum.jpg',
    'ahaz': 'Ahaz.png',
    'pekah': 'Pekah.png',
    'uzziah': 'Ozias-Uzziah.png',
    'jotham': 'Joatham rex.png',
    'david': 'King David, the King of Israel.jpg',
    'isaiah': 'Jesaja (Michelangelo).jpg',
    'hezekiah': 'Åhus kyrka-10.jpg',
    'sennacherib': 'Sanherib-tr-4271.jpg',
    'merodach-baladan': 'Vorderasiatisches Museum Berlin 027.jpg',
    'nebuchadnezzar': 'Nebuchadnezzar II crop.png',
    'cyrus': 'Cyrus II (The Great) (cropped).jpg',
}

def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'IsaiahStudyGuide/1.0 (educational portrait attribution)'})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()

def plain(value):
    return unescape(re.sub('<[^>]+>', '', value)).strip()

def main():
    params = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'prop': 'imageinfo',
        'titles': '|'.join('File:' + name for name in FILES.values()),
        'iiprop': 'url|extmetadata', 'iiurlwidth': 320})
    result = json.loads(fetch('https://commons.wikimedia.org/w/api.php?' + params))
    pages = {page['title'].replace('_', ' '): page for page in result['query']['pages'].values()}
    images = {}
    for person, filename in FILES.items():
        page = pages.get('File:' + filename)
        if not page or not page.get('imageinfo'):
            print(person, 'No Commons image; use initial.')
            continue
        info = page['imageinfo'][0]
        meta = info['extmetadata']
        value = lambda key: plain(meta.get(key, {}).get('value', ''))
        license_name = value('LicenseShortName')
        if license_name not in ['Public domain', 'CC0', 'CC BY 3.0', 'CC BY 4.0', 'CC BY-SA 3.0', 'CC BY-SA 4.0']:
            print(person, 'License needs review:', license_name)
            continue
        url = info.get('thumburl', info['url'])
        extension = Path(urllib.parse.urlparse(url).path).suffix
        relative = f'assets/portraits/commons/{person}{extension}'
        target = ROOT / 'dist' / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(fetch(url))
        images[person] = {'src': relative, 'sourceUrl': info['descriptionurl'],
            'originalUrl': info['url'], 'credit': value('Artist') or 'Unknown artist',
            'license': license_name, 'licenseUrl': (value('LicenseUrl') or 'https://creativecommons.org/publicdomain/mark/1.0/').replace('http://', 'https://'),
            'description': value('ImageDescription'), 'date': value('DateTimeOriginal'),
            'note': 'Display uses a square crop. Historical art does not establish actual appearance.'}
        if person == 'hezekiah':
            images[person]['credit'] = 'Unknown painter; photograph by David Castor'
        print(person, license_name, images[person]['credit'][:100])
    target = ROOT / "scripts" / "isaiah-portrait-images.json"
    target.write_text(json.dumps(images, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

if __name__ == '__main__':
    main()
