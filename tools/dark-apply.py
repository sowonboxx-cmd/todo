"""Régénère le bloc « MODE SOMBRE » de index.html : python3 tools/dark-apply.py"""
import re, subprocess, sys, os
here = os.path.dirname(os.path.abspath(__file__)); p = os.path.join(here, '..', 'index.html')
s = open(p).read()
A, B = '/* === MODE SOMBRE (généré par tools/dark-apply.py, ne pas modifier à la main) === */', '/* === FIN MODE SOMBRE === */'
if A in s: s = s[:s.index(A)] + s[s.index(B) + len(B):]
tmp = p + '.tmp'; open(tmp, 'w').write(s)
gen = subprocess.run([sys.executable, os.path.join(here, 'dark-gen.py'), tmp], capture_output=True, text=True, check=True).stdout
os.remove(tmp)
tokens = '''html[data-theme="dark"], html[data-theme="dark"] #v2, html[data-theme="dark"] #v2m {
    color-scheme: dark;
    --v-bg: #000000; --v-card: #1C1C1E; --v-ink: #F2F2F3; --v-ink2: #E6E6E8;
    --v-muted: #A1A1A6; --v-faint: #8A8A90; --v-line: #2A2A2C; --v-soft: #242426;
    --v-soft2: #242426; --v-chip: #2C2C2E; --v-seg: #1C1C1E; --v-check: #3A3A3C; --v-chk-ring: #5A5A5E;
    --v-red: #FF6B5E; --v-orange: #F2A33A; --v-green: #4CC27A; --v-gold: #F0C45A;
    --bg: #000000; --paper: #0E0E0F; --card: #1C1C1E; --ink: #F2F2F3; --muted: #A1A1A6; --faint: #8A8A90; --line: #2A2A2C; --line-soft: #242426;
  }
  html[data-theme="dark"], html[data-theme="dark"] body { background: #000; }
  html[data-theme="dark"] .vm-bar { background: rgba(38,38,40,.66); box-shadow: 0 6px 18px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06); }
  html[data-theme="dark"] .vm-bar button { color: #b9b9bd; }
  html[data-theme="dark"] .vm-bar button.on { background: rgba(255,255,255,.13); color: #fff; }
  html[data-theme="dark"] .vm-bar button.add { background: #fff; color: #111; }
  html[data-theme="dark"] img { color-scheme: normal; }
  html[data-theme="dark"] .v-seg button.on { background: #3A3A3C; color: #fff; box-shadow: none; }
  html[data-theme="dark"] .v-opts-btn.on { background: #3A3A3C; color: #fff; }
  html[data-theme="dark"] .czi-go, html[data-theme="dark"] .cz-addbtn, html[data-theme="dark"] .cz-chip.on { color: #111; }
  html[data-theme="dark"] .lb-jpt, html[data-theme="dark"] .lb-mjp { color: #d2d2d6; }
  html[data-theme="dark"] .czv-notes { color: #f2f2f3; }
  html[data-theme="dark"] .czv-snew b { box-shadow: inset 0 0 0 1.5px #5a5a5e; color: #a1a1a6 !important; }
  html[data-theme="dark"] .qp-optmenu .qp-push { border-top-color: #2C2C2E; color: #7FA6F0; }
  html[data-theme="dark"] .push-row { color: #7FA6F0; }
  html[data-theme="dark"] .qp-optmenu .qp-push.info, html[data-theme="dark"] .push-row.info { color: #A1A1A6; }
  html[data-theme="dark"] .lb-sqs .lb-sq.img, html[data-theme="dark"] .lb-sqs .lb-sq.img:hover { background: #1f1f1f; border-color: transparent; color: #fff; }
  html[data-theme="dark"] .v-cat, html[data-theme="dark"] .v-block, html[data-theme="dark"] .v-tcat { background: color-mix(in srgb, var(--c-bg) 9%, #1C1C1E); }
  html[data-theme="dark"] .v-cat.active-cat { background: color-mix(in srgb, var(--c-fg) 24%, #1C1C1E); }
  html[data-theme="dark"] .v-cat-name, html[data-theme="dark"] .v-cat-btn, html[data-theme="dark"] .v-page svg, html[data-theme="dark"] .v-block-head h2, html[data-theme="dark"] .v-count-sq, html[data-theme="dark"] .v-tcat { color: color-mix(in srgb, var(--c-fg) 45%, #fff); }
  html[data-theme="dark"] .v-count-sq { background: #2C2C2E; }
'''
block = A + '\n  ' + tokens + '\n' + gen + '\n  ' + B + '\n'
s = s.replace('</style>', block + '</style>', 1)
open(p, 'w').write(s)
print('ok', gen.count('\n'))
