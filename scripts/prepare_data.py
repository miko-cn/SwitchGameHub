#!/usr/bin/env python3
"""Build-time data step: reads ../web/data.json + covers + screenshots,
writes public/data/games.json, public/thumbs/, public/screenshots/.

CI / seed checkout: if ../web/data.json is missing but public/data/games.json
is already committed, skip regeneration (no source media or Pillow required).
Missing thumbs/covers are tolerated; the UI falls back to placeholders."""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
WEB = os.environ.get('SWITCHLIB_WEB', os.path.join(APP, '..', 'web'))
OUT_DATA = os.path.join(APP, 'public', 'data')
OUT_TH = os.path.join(APP, 'public', 'thumbs')
OUT_SS = os.path.join(APP, 'public', 'screenshots')
SIZE = int(os.environ.get('THUMB_SIZE', 320))
QUAL = int(os.environ.get('THUMB_Q', 72))
SS_THUMB_W = int(os.environ.get('SS_THUMB_W', 360))
SS_FULL_W = int(os.environ.get('SS_FULL_W', 1280))
SS_Q = int(os.environ.get('SS_Q', 76))
if not os.path.exists(os.path.join(WEB, 'data.json')):
    if os.path.exists(os.path.join(OUT_DATA, 'games.json')):
        print('web/data.json not found; using existing public/data (CI mode)'); sys.exit(0)
    sys.exit('web/data.json not found and no prepared data')

from concurrent.futures import ThreadPoolExecutor
from PIL import Image

os.makedirs(OUT_DATA, exist_ok=True); os.makedirs(OUT_TH, exist_ok=True); os.makedirs(OUT_SS, exist_ok=True)

games = json.load(open(os.path.join(WEB, 'data.json'), encoding='utf-8'))
if isinstance(games, dict):
    games = games.get('games', [])

def thumb(g):
    c = g.get('cover')
    if not c:
        return None
    src = os.path.join(WEB, c)
    if not os.path.exists(src):
        return None
    name = f"{g['序号']}.webp"
    dst = os.path.join(OUT_TH, name)
    if not (os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src)):
        try:
            im = Image.open(src)
            im = im.convert('RGBA').convert('RGB') if im.mode in ('P', 'LA', 'RGBA') else im.convert('RGB')
            im.thumbnail((SIZE, SIZE), Image.LANCZOS)
            im.save(dst, 'WEBP', quality=QUAL, method=6)
        except Exception as e:
            print('thumb fail', g['序号'], e, file=sys.stderr)
            return None
    with Image.open(dst) as t:
        w, h = t.size
    return name, round(w / h, 3)

PACK = os.environ.get('SS_PACK', os.path.join(APP, '..', 'screenshots_pack', 'screenshots'))
SS_MIN_W = int(os.environ.get('SS_MIN_W', 960))

def remote_of(shot):
    """Original-source URL the app may load online when no local pack is present."""
    u = shot.get('url') or ''
    if 'assets.nintendo.com/image/upload/' in u:
        u = u.replace('c_limit,w_1920/f_auto/q_auto', 'c_limit,w_1280/f_auto/q_auto')
    return u

def ss_one(shot, n):
    """Bundle only a strip/offline thumbnail; write the large webp into the optional screenshot pack."""
    src = os.path.join(WEB, shot.get('path') or '')
    if not src or not os.path.exists(src):
        return None
    if (shot.get('w') or 0) < SS_MIN_W:
        return None
    stem = os.path.splitext(os.path.basename(shot['path']))[0]  # 01
    dest_dir = os.path.join(OUT_SS, str(n)); os.makedirs(dest_dir, exist_ok=True)
    pack_dir = os.path.join(PACK, str(n)); os.makedirs(pack_dir, exist_ok=True)
    full_dst = os.path.join(pack_dir, stem + '.webp')
    th_dst = os.path.join(dest_dir, stem + '_t.webp')
    try:
        if not (os.path.exists(full_dst) and os.path.getmtime(full_dst) >= os.path.getmtime(src)):
            im = Image.open(src).convert('RGB')
            if im.size[0] > SS_FULL_W:
                im = im.resize((SS_FULL_W, int(im.size[1] * SS_FULL_W / im.size[0])), Image.LANCZOS)
            im.save(full_dst, 'WEBP', quality=SS_Q, method=4)
        if not (os.path.exists(th_dst) and os.path.getmtime(th_dst) >= os.path.getmtime(src)):
            im = Image.open(src).convert('RGB')
            w, h = im.size
            if w > SS_THUMB_W:
                im = im.resize((SS_THUMB_W, int(h * SS_THUMB_W / w)), Image.LANCZOS)
            im.save(th_dst, 'WEBP', quality=int(os.environ.get('SS_THUMB_Q', 62)), method=5)
    except Exception as e:
        print('ss fail', n, stem, e, file=sys.stderr)
        return None
    out = {k: shot[k] for k in ('url', 'src', 'by') if k in shot}
    with Image.open(full_dst) as fi:
        out['w'], out['h'] = fi.size
    out['ar'] = round(out['w'] / out['h'], 3)
    out['thumb'] = f'screenshots/{n}/{stem}_t.webp'
    out['file'] = f'{n}/{stem}.webp'
    out['remote'] = remote_of(shot)
    out['path'] = out['remote'] or out['thumb']
    return out

with ThreadPoolExecutor(8) as ex:
    res = list(ex.map(thumb, games))

def ss_game(g):
    return [o for o in (ss_one(s, g['序号']) for s in (g.get('screenshots') or [])) if o]
with ThreadPoolExecutor(8) as ex:
    ss_res = list(ex.map(ss_game, games))
keep = set(); keep_ss = set()
for (g, r), built in zip(zip(games, res), ss_res):
    if r:
        g['thumb'] = 'thumbs/' + r[0]; g['thumb_ar'] = r[1]; keep.add(r[0])
    else:
        g['thumb'] = None
    g.pop('cover_url', None)
    for o in built:
        if o:
            keep_ss.add(f"{g['序号']}/{os.path.basename(o['thumb'])}")
    g['screenshots'] = built

for f in os.listdir(OUT_TH):
    if f not in keep:
        os.remove(os.path.join(OUT_TH, f))
# prune stale screenshot files
for root, dirs, files in os.walk(OUT_SS):
    for f in files:
        rel = os.path.relpath(os.path.join(root, f), OUT_SS)
        if rel not in keep_ss:
            try: os.remove(os.path.join(root, f))
            except Exception: pass
# prune empty dirs
for root, dirs, files in os.walk(OUT_SS, topdown=False):
    if root == OUT_SS: continue
    if not os.listdir(root):
        try: os.rmdir(root)
        except Exception: pass

json.dump(games, open(os.path.join(OUT_DATA, 'games.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
tot = sum(os.path.getsize(os.path.join(OUT_TH, f)) for f in os.listdir(OUT_TH))
ss_n = sum(1 for g in games if g.get('screenshots'))
ss_imgs = sum(len(g.get('screenshots') or []) for g in games)
ss_bytes = 0
for root,_,files in os.walk(OUT_SS):
    for f in files: ss_bytes += os.path.getsize(os.path.join(root,f))
print(f"games={len(games)} thumbs={len(keep)} thumbs_size={tot/1e6:.1f}MB ss_games={ss_n} ss_imgs={ss_imgs} ss_size={ss_bytes/1e6:.1f}MB data={os.path.getsize(os.path.join(OUT_DATA,'games.json'))/1e6:.1f}MB")
