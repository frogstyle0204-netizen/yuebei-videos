#!/usr/bin/env python3
"""Wikimedia Commons 素材：搜索、查授权、下载原图 / 视频。

  python3 commons.py search "IceCube Neutrino Observatory" [--video]
  python3 commons.py info "File:The ICL at Night.jpg" "File:xxx.webm"
  python3 commons.py get "File:The ICL at Night.jpg" public/footage/<期>/lab-night-raw.jpg

info 会打印尺寸、时长、授权（LicenseShortName）、作者（Artist）和原图地址。只用公有领域、CC0、CC BY、CC BY-SA 的素材，
画面上标「作者 / 授权」，并记进 <素材目录>/素材来源.md。
"""
import json
import re
import subprocess
import sys
import urllib.parse

UA = 'weilanx-claude-videos/1.0 (+https://github.com/Azure12355/weilanx-claude-videos)'
API = 'https://commons.wikimedia.org/w/api.php?'


def api(params):
    url = API + urllib.parse.urlencode({**params, 'format': 'json'})
    return json.loads(subprocess.run(['curl', '-s', '-A', UA, url], check=True, capture_output=True, text=True).stdout)


def clean(html):
    return re.sub(r'<[^>]+>', '', html or '').strip()


def search(q, video=False):
    if video:
        q += ' filetype:video'
    r = api({'action': 'query', 'list': 'search', 'srnamespace': 6, 'srlimit': 20, 'srsearch': q})
    for x in r['query']['search']:
        print(x['title'])


def info(titles):
    r = api({'action': 'query', 'titles': '|'.join(titles), 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata'})
    for p in r['query']['pages'].values():
        if 'imageinfo' not in p:
            print(p['title'], '（找不到）')
            continue
        ii = p['imageinfo'][0]
        m = ii.get('extmetadata', {})
        g = lambda k: clean(m.get(k, {}).get('value'))[:120]
        dur = f" {ii['duration']:.1f}s" if ii.get('duration') else ''
        print(f"{p['title']}\n  {ii['width']}x{ii['height']}{dur} · {g('LicenseShortName')} · 作者：{g('Artist')}\n  {ii['url'].split('?')[0]}")


def get(title, out):
    r = api({'action': 'query', 'titles': title, 'prop': 'imageinfo', 'iiprop': 'url'})
    url = list(r['query']['pages'].values())[0]['imageinfo'][0]['url'].split('?')[0]
    subprocess.run(['curl', '-sL', '-A', UA, '-o', out, url], check=True)
    print('saved', out)


if __name__ == '__main__':
    cmd, *rest = sys.argv[1:]
    if cmd == 'search':
        search(rest[0], '--video' in rest)
    elif cmd == 'info':
        info(rest)
    elif cmd == 'get':
        get(rest[0], rest[1])
    else:
        sys.exit(__doc__)
