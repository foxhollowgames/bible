"""Write each book page, its share card, and its share tags.

Link previews do not run scripts. Each book therefore has its own page, dist/<id>.html.
The page is the shell dist/book.html with that book's title and tags.
Share cards are 1200 x 630 JPEG files in dist/assets/share. The fonts are Windows fonts.

    python scripts/build-share.py            # write pages, tags, and missing cards
    python scripts/build-share.py --force    # draw every card again
"""
import html,json,re,sys
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent.parent
D=ROOT/'dist';SHARE=D/'assets/share'
SITE='https://isaiah.josephnewelldesign.com/'
NAME='Bible Wayfinder'
TAGLINE='Map-first study guides for all 66 books of the Bible.'
W,H=1200,630
FONTS=Path('C:/Windows/Fonts')
def font(file,size):return ImageFont.truetype(str(FONTS/file),size)
def gradient(width,height,left,right):
    row=Image.new('RGB',(width,1))
    row.putdata([tuple(round(a+(b-a)*x/(width-1)) for a,b in zip(left,right)) for x in range(width)])
    return row.resize((width,height))
def square(path,size):
    """Crop the upper square of a cover, where the face is."""
    art=Image.open(path).convert('RGB');side=min(art.size)
    left=(art.width-side)//2;top=0 if art.height>art.width else (art.height-side)//2
    return art.crop((left,top,left+side,top+side)).resize((size,size),Image.LANCZOS)
def spaced(draw,xy,text,face,fill,gap):
    x,y=xy
    for letter in text:
        draw.text((x,y),letter,font=face,fill=fill);x+=draw.textlength(letter,font=face)+gap
def base():
    card=gradient(W,H,(4,25,45),(11,60,88))
    # Fade the artwork into the text side.
    fade=Image.linear_gradient('L').rotate(90,expand=True).resize((220,H))
    return card,fade
def star(draw,cx,cy,r,fill):
    k=r*.19
    draw.polygon([(cx,cy-r),(cx+k,cy-k),(cx+r,cy),(cx+k,cy+k),(cx,cy+r),(cx-k,cy+k),(cx-r,cy),(cx-k,cy-k)],fill=fill)
def text_side(draw,title,line,max_width):
    star(draw,98,118,26,(140,233,255))
    spaced(draw,(142,103),NAME.upper(),font('segoeuib.ttf',26),(140,233,255),6)
    size=112
    while size>52 and draw.textlength(title,font=font('georgiab.ttf',size))>max_width:size-=4
    face=font('georgiab.ttf',size)
    draw.text((72,300),title,font=face,fill=(244,231,209),anchor='ls')
    draw.line((76,338,196,338),fill=(140,233,255),width=3)
    draw.text((76,372),line,font=font('segoeui.ttf',34),fill=(181,207,223))
    draw.rectangle((24,24,W-25,H-25),outline=(38,96,128),width=2)
def book_card(name,line,cover,target):
    card,fade=base()
    mask=Image.new('L',(H,H),255);mask.paste(fade,(0,0))
    card.paste(square(cover,H),(W-H,0),mask)
    text_side(ImageDraw.Draw(card),name,line,W-H-60)
    card.save(target,'JPEG',quality=86,optimize=True,progressive=True)
def site_card(covers,target):
    card,fade=base()
    tile=H//3;mosaic=Image.new('RGB',(tile*2,H))
    for index,cover in enumerate(covers[:6]):mosaic.paste(square(cover,tile),(index%2*tile,index//2*tile))
    mask=Image.new('L',mosaic.size,255);mask.paste(fade.resize((160,H)),(0,0))
    card.paste(mosaic,(W-tile*2,0),mask)
    draw=ImageDraw.Draw(card)
    star(draw,98,118,26,(140,233,255))
    spaced(draw,(142,103),'SCRIPTURE · PEOPLE · PLACES',font('segoeuib.ttf',24),(140,233,255),5)
    draw.text((72,268),'Bible',font=font('georgiab.ttf',104),fill=(244,231,209),anchor='ls')
    draw.text((72,376),'Wayfinder',font=font('georgiab.ttf',104),fill=(244,231,209),anchor='ls')
    draw.line((76,412,196,412),fill=(140,233,255),width=3)
    draw.text((76,444),'Map-first study guides',font=font('segoeui.ttf',34),fill=(181,207,223))
    draw.text((76,490),'for all 66 books of the Bible',font=font('segoeui.ttf',34),fill=(181,207,223))
    draw.rectangle((24,24,W-25,H-25),outline=(38,96,128),width=2)
    card.save(target,'JPEG',quality=86,optimize=True,progressive=True)
def tags(title,description,url,image,alt,kind='website'):
    e=lambda text:html.escape(text,quote=True)
    rows=[('name','description',description),('property','og:type',kind),('property','og:site_name',NAME),('property','og:title',title),
        ('property','og:description',description),('property','og:url',url),('property','og:locale','en_US'),
        ('property','og:image',image),('property','og:image:secure_url',image),('property','og:image:type','image/jpeg'),
        ('property','og:image:width',str(W)),('property','og:image:height',str(H)),('property','og:image:alt',alt),
        ('name','twitter:card','summary_large_image'),('name','twitter:title',title),('name','twitter:description',description),
        ('name','twitter:image',image),('name','twitter:image:alt',alt)]
    return '\n'.join([f'  <meta {key}="{name}" content="{e(value)}">' for key,name,value in rows]+[f'  <link rel="canonical" href="{e(url)}">'])
def fill(page,block):
    page,count=re.subn(r'[ \t]*<!-- share -->.*?<!-- /share -->',lambda _:f'  <!-- share -->\n{block}\n  <!-- /share -->',page,count=1,flags=re.S)
    if count!=1:raise SystemExit('A page has no share markers.')
    return page
def main():
    force='--force' in sys.argv
    SHARE.mkdir(parents=True,exist_ok=True)
    directory=json.loads((D/'data/books/directory.json').read_text(encoding='utf-8'))
    covers=json.loads('{'+re.search(r'const bookArtwork=\{(.*?)\};',(D/'books.js').read_text(encoding='utf-8'),re.S)[1]+'}')
    shell=(D/'book.html').read_text(encoding='utf-8')
    # The shell has no description of its own. Each page states one in its share tags.
    shell=re.sub(r'  <meta name="description"[^\n]*\n','',shell)
    ready=[book for book in directory if book['status']=='ready']
    for book in ready:
        slug,name=book['id'],book['name']
        count=json.loads((D/f'data/books/{slug}-native-content.json').read_text(encoding='utf-8'))['book']['chapterCount']
        scope=f'all {count} chapters of {name}' if count>1 else name
        if slug=='psalms':scope='all 150 psalms'
        description=f'Study {scope} with the full text, maps, people, sources, and word notes.'
        line=f'{count} chapters' if count>1 else 'One chapter'
        if slug=='psalms':line='150 psalms'
        card=SHARE/f'{slug}.jpg'
        if force or not card.exists():book_card(name,f'{line} · maps · people · sources',D/'assets/portraits'/covers[slug],card)
        url=f'{SITE}{slug}.html'
        block=tags(f'{name} · {NAME}',description,url,f'{SITE}assets/share/{slug}.jpg',f'{name}. {NAME}. Cover art beside the book name.','article')
        page=fill(shell,block).replace('<html lang="en">',f'<html lang="en" data-book="{slug}">',1)
        page=page.replace(f'<title>{NAME}</title>',f'<title>{html.escape(name)} · {NAME}</title>',1)
        (D/f'{slug}.html').write_text(page,encoding='utf-8')
    site=SHARE/'site.jpg'
    picks=['genesis','ruth','psalms','isaiah','matthew','acts']
    if force or not site.exists():site_card([D/'assets/portraits'/covers[slug] for slug in picks],site)
    home=tags(NAME,TAGLINE,SITE,f'{SITE}assets/share/site.jpg',f'{NAME}. {TAGLINE}')
    for name in ['index.html','book.html']:
        path=D/name;path.write_text(fill(re.sub(r'  <meta name="description"[^\n]*\n','',path.read_text(encoding='utf-8')),home),encoding='utf-8')
    rows=[f'  <url><loc>{SITE}</loc></url>']+[f'  <url><loc>{SITE}{book["id"]}.html</loc></url>' for book in ready]
    (D/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+'\n'.join(rows)+'\n</urlset>\n',encoding='utf-8')
    print(f'Wrote {len(ready)} book pages, {len(ready)+1} share cards, and the sitemap.')
if __name__=='__main__':main()
