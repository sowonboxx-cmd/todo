"""Génère les règles du mode sombre (palette Noir) à partir du CSS clair de index.html."""
import re, sys, colorsys
src = open(sys.argv[1]).read()
css = src[src.index('<style>') + 7: src.index('</style>')]
css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)

BG, CARD, SOFT, CHIP, CHK, LINE = (0,0,0), (28,28,30), (36,36,38), (44,44,46), (58,58,60), (42,42,44)
INK, INK2, MUT = (242,242,243), (210,210,214), (154,154,160)
EXACT_BG = {'f3f1ec': BG, 'f4f3f0': BG, 'eef1ec': BG, 'f2f1ed': BG, 'f5f4f0': BG, 'ffffff': CARD, 'fff': CARD,
            'f5f5f3': SOFT, 'f1f1ef': SOFT, 'f7f7f5': SOFT, 'fafaf8': SOFT, 'f8f8f6': SOFT, 'ebebe8': CHIP, 'e9e7e1': (28,28,30),
            'e6e5e0': CHK, 'efeeea': LINE, 'e2e2df': (58,58,60), 'ecece9': CHIP}
SAT = {'c8342b': (255,107,94), '2f9e5b': (76,194,122), 'b26a00': (242,163,58), 'e8b339': (240,196,90), 'ff7d01': (255,149,0)}

def hx(c): return '#%02x%02x%02x' % tuple(max(0, min(255, round(v))) for v in c)
def parse(tok):
    t = tok.lower()
    if t.startswith('#'):
        h = t[1:]
        if len(h) in (3, 4): h = ''.join(ch*2 for ch in h[:3]) + (h[3]*2 if len(h) == 4 else '')
        if len(h) not in (6, 8): return None
        a = int(h[6:8], 16)/255 if len(h) == 8 else 1
        return (int(h[0:2],16), int(h[2:4],16), int(h[4:6],16), a, h[:6])
    m = re.match(r'rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)', t)
    if m:
        a = m.group(4); a = 1 if a is None else (float(a[:-1])/100 if a.endswith('%') else float(a))
        r,g,b = (float(m.group(i)) for i in (1,2,3)); return (r,g,b,a,'%02x%02x%02x' % (int(r),int(g),int(b)))
    if t == 'white': return (255,255,255,1,'ffffff')
    if t == 'black': return (0,0,0,1,'000000')
    return None
def lum(c): return (0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]) / 255
def sat(c): return max(c[:3]) - min(c[:3])
def fmt(rgb, a): return hx(rgb) if a >= 0.999 else 'rgba(%d,%d,%d,%s)' % (*[round(v) for v in rgb], ('%.3f' % a).rstrip('0').rstrip('.'))

def map_bg(c):
    r,g,b,a,h = c
    if h in SAT: return fmt(SAT[h], a)
    if h in EXACT_BG and a >= .999: return fmt(EXACT_BG[h], 1)
    L = lum(c)
    if sat(c) < 30:
        if a < .999:  # voiles : blanc → noir ; teintes noires légères (survol, sélection) → blanches ; fonds d'assombrissement gardés
            if L > .6: return fmt((28,28,30), max(a, .6))
            return fmt((255,255,255), a) if a < .25 else None
        if L > .97: return hx(CARD)
        if L > .93: return hx(SOFT)
        if L > .86: return hx(CHIP)
        if L > .7: return hx(CHK)
        if L < .2: return hx(INK)   # boutons noirs → clairs
        return None
    if L > .8:  # pastels → teinte sombre
        return fmt(tuple(28 + (v - 28) * .2 for v in (r,g,b)), a)
    return None
def map_fg(c):
    r,g,b,a,h = c
    if h in SAT: return fmt(SAT[h], a)
    L = lum(c)
    if sat(c) < 30:
        if L < .2: return fmt(INK, a)
        if L < .45: return fmt(INK2, a)
        if L < .62: return fmt(MUT, a)
        return None
    if L < .35:  # couleurs foncées saturées → plus claires
        hh, l, s = colorsys.rgb_to_hls(r/255, g/255, b/255)
        rr, gg, bb = colorsys.hls_to_rgb(hh, min(.72, l + .35), s)
        return fmt((rr*255, gg*255, bb*255), a)
    return None
def map_border(c):
    r,g,b,a,h = c
    if sat(c) < 30 and lum(c) > .7: return fmt(LINE, a)
    return None

# panneaux sombres à garder sombres (on ne les inverse pas en clair)
KEEP_DARK = re.compile(r'\.lb-mc\b|\.cz-th\b|\.cz-x\b|xcard-media|\.v-bulk\b|\.v-undo\b|\.docs-toolbar|\.lb-cvhint')
DARK_TOK = {'--v-bg': '#000000', '--v-card': '#1C1C1E', '--v-ink': '#F2F2F3', '--v-ink2': '#E6E6E8', '--v-muted': '#A1A1A6', '--v-faint': '#8A8A90',
            '--v-line': '#2A2A2C', '--v-soft': '#242426', '--v-soft2': '#242426', '--v-chip': '#2C2C2E', '--v-seg': '#1C1C1E', '--v-check': '#3A3A3C',
            '--v-red': '#FF6B5E', '--v-orange': '#F2A33A', '--v-green': '#4CC27A', '--v-gold': '#F0C45A'}
COLOR_RE = re.compile(r'#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\bwhite\b|\bblack\b')
def conv(prop, val, white_text_dark_bg):
    p = prop.strip().lower()
    if p in ('background', 'background-color', 'background-image'): f = map_bg
    elif p in ('color', 'fill', 'stroke', 'caret-color', '-webkit-text-fill-color'): f = map_fg
    elif p.startswith('border') or p in ('outline', 'outline-color'): f = map_border
    else: return None
    if 'var(' in val and not COLOR_RE.search(val): return None
    if 'url(' in val: return None
    changed = False
    def rep(m):
        nonlocal changed
        c = parse(m.group(0))
        if not c: return m.group(0)
        if f is map_fg and c[4] == 'ffffff' and white_text_dark_bg: changed = True; return '#111111'
        n = f(c)
        if n is None: return m.group(0)
        changed = True; return n
    out = COLOR_RE.sub(rep, val)
    return out if changed else None

out = []
def walk(block, wrap):
    i = 0
    while i < len(block):
        j = block.find('{', i)
        if j < 0: break
        head = block[i:j].strip()
        depth, k = 1, j + 1
        while depth and k < len(block):
            if block[k] == '{': depth += 1
            elif block[k] == '}': depth -= 1
            k += 1
        body = block[j+1:k-1]
        if head.startswith('@media') or head.startswith('@supports'):
            if 'prefers-color-scheme' not in head and 'print' not in head: walk(body, wrap + [head])
        elif head.startswith('@'): pass
        elif 'data-theme="dark"' in head: pass
        else:
            decls = [d for d in body.split(';') if ':' in d]
            props = {}
            for d in decls:
                p, v = d.split(':', 1); props[p.strip().lower()] = v.strip()
            bgv = props.get('background', props.get('background-color', ''))
            keep = bool(KEEP_DARK.search(head))
            dark_bg = not keep and any((c := parse(m)) and sat(c) < 30 and lum(c) < .2 and c[3] > .5 for m in COLOR_RE.findall(bgv))
            news = []
            for p, v in props.items():
                if p in DARK_TOK: news.append(f'{p}: {DARK_TOK[p]}'); continue
                if p.startswith('--'): continue
                imp = '!important' in v
                if (':after' in head or ':before' in head) and 'gradient' in v: continue
                if ('::after' in head or '::before' in head or ':after' in head or ':before' in head) and p.startswith('background') and re.search(r'#fff\b|#ffffff|white', v, re.I): continue
                if keep and p in ('color', 'fill', 'stroke'): continue
                n = conv(p, v.replace('!important', '').strip(), dark_bg)
                if keep and n and p.startswith('background'): n = re.sub(r'#f2f2f3', '#2c2c2e', n)
                if n: news.append(f'{p}: {n}{" !important" if imp else ""}')
            if news:
                sels = ', '.join('html[data-theme="dark"] ' + s.strip() if not s.strip().startswith(('html', ':root')) else s.strip().replace('html', 'html[data-theme="dark"]', 1).replace(':root', 'html[data-theme="dark"]', 1) for s in head.split(','))
                rule = f'{sels} {{ {"; ".join(news)}; }}'
                for w in reversed(wrap): rule = f'{w} {{ {rule} }}'
                out.append(rule)
        i = k
walk(css, [])
print('\n'.join(out))
