from PIL import Image, ImageDraw
import os, json, math

SRC = 'verification/design/baseline-390'
OUT = 'verification/design/qa/baseline/contact-sheets'
os.makedirs(OUT, exist_ok=True)
files = sorted(f for f in os.listdir(SRC) if f.endswith('.png'))
# group by experience family in a deterministic order
groups = {
 'portal-nav': ['root','browse','index','now','games','chat','mihrab','diwan','weather','travel-atlas'],
 'spiritual': ['quran','tafsir','dhikr','sunnah','mihrab_prayer-guide','section_prophetic-day','section_quran-virtues','section_timed-sunnah','section_timed-sunnah_1','section_untimed-sunnah','knowledge','journal','reading','marginalia'],
 'editorial-library': ['diwan_library','diwan_library_search','diwan_library_poets','diwan_library_poet_test-slug','diwan_library_poem_test-slug','diwan_library_favorites','diwan_bayan','archive','archive_new','archive_1','pkm','pkm_mind'],
 'audio-german': ['podcasts','podcasts_1','podcasts_library','podcasts_history','german-club','german-club_dictionary','german-club_grammar','german-club_review','german-club_shelf_test-slug','german-club_wortliste'],
 'data': ['weather','wellness','fitness','crypto','time-ledger','occasions'],
 'travel': ['travel-atlas','travel-atlas_explore','travel-atlas_countries','travel-atlas_trips','travel-atlas_trips_1','travel-atlas_place_1','travel-atlas_DE'],
 'games': ['games','games_chess','games_chess_career','games_chess_puzzles','games_memory','games_memory_adventure','games_sudoku'],
 'chat': ['chat','chat_g_00000000-0000-0000-0000-000000000000','chat_groups','chat_settings'],
 'settings-auth': ['auth','profile','settings','settings_appearance','settings_interface','settings_theme','settings_font','settings_keyboard','settings_motion','settings_prayer','settings_profile','dev_design-system','dev_material-preview','.lovable_oauth_consent'],
}
seen = set()
order = []
for g, names in groups.items():
    for n in names:
        if n in (f[:-4] for f in files) and n not in seen:
            order.append((g,n)); seen.add(n)
# anything not covered
for f in files:
    n=f[:-4]
    if n not in seen: order.append(('misc',n)); seen.add(n)
print('total', len(order))
CW, CH = 260, 563
LABEL = 18
cols, rows = 4, 2
per = cols*rows
manifest=[]
for si in range(math.ceil(len(order)/per)):
    chunk = order[si*per:(si+1)*per]
    sheet = Image.new('RGB', (cols*CW, rows*(CH+LABEL)), (18,18,18))
    d = ImageDraw.Draw(sheet)
    names=[]
    for i,(g,n) in enumerate(chunk):
        img = Image.open(os.path.join(SRC, n+'.png')).convert('RGB')
        img = img.resize((CW, CH), Image.LANCZOS)
        x=(i%cols)*CW; y=(i//cols)*(CH+LABEL)
        sheet.paste(img,(x,y+LABEL))
        d.rectangle([x,y,x+CW-1,y+LABEL-1], fill=(30,30,30))
        label = str(si*per+i+1)+'. '+n
        d.text((x+4,y+4), label[:42], fill=(220,220,220))
        names.append(g+'/'+n)
    path = os.path.join(OUT, 'sheet-'+str(si+1).zfill(2)+'.jpg')
    sheet.save(path, quality=88)
    manifest.append({'sheet':path,'items':names})
with open(os.path.join(OUT,'manifest.json'),'w') as f:
    json.dump(manifest,f,indent=1)
print(json.dumps([{'sheet':m['sheet'],'items':len(m['items'])} for m in manifest], indent=0))
