// Supabase Edge Function « livres » : recherche de livres chez les librairies indépendantes
// (librairiesindependantes.com) pour la Bibliothèque du dashboard.
//   POST { q: "the strange house", pages?: 1..3 }  → { items: [{ ean, title, series, number, authors, publisher, cover }] }
//   POST { eans: ["978…", …] }                      → { items: [{ ean, title, series, number, authors, publisher, date, genres, collection, cover, summary }] }
// Déploiement : Supabase → Edge Functions → Deploy a new function → Via Editor, nom « livres », coller ce fichier.

const BASE = 'https://www.librairiesindependantes.com';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const MONTHS: Record<string, string> = { janvier: '01', 'février': '02', fevrier: '02', mars: '03', avril: '04', mai: '05', juin: '06', juillet: '07', 'août': '08', aout: '08', septembre: '09', octobre: '10', novembre: '11', 'décembre': '12', decembre: '12' };

const decode = (s = '') => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&rsquo;/g, "'")
  .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, ' ').trim();
const tag = (html: string, t: string) => decode((html.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || '');
// « The Strange House - Tome 4 » → série + numéro
function splitTitle(title: string) {
  const m = title.match(/^(.*?)(?:\s*[-–—:,]\s*|\s+)(?:tome|t\.?|vol\.?|volume)\s*(\d+(?:[.,]\d+)?)\b.*$/i);
  return m ? { series: m[1].trim(), number: +m[2].replace(',', '.') } : { series: title, number: null };
}
function frDate(s: string) {
  const m = decode(s).toLowerCase().match(/(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/);
  if (!m || !MONTHS[m[2]]) return null;
  return `${m[3]}-${MONTHS[m[2]]}-${m[1].padStart(2, '0')}`;
}
async function get(url: string) {
  const r = await fetch(url, { headers: { 'User-Agent': 'UltimateDashboard/1.0 (bibliotheque perso)', 'Accept-Language': 'fr-FR,fr;q=0.9' } });
  // (un User-Agent de navigateur déclenche la page anti-robot du site)
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.text();
}
async function search(q: string, pages = 1) {
  const items: any[] = [];
  const seen = new Set();
  for (let p = 1; p <= Math.min(Math.max(pages, 1), 3); p++) {
    const html = await get(`${BASE}/product/search/?query=${encodeURIComponent(q)}${p > 1 ? `&page-number=${p}` : ''}`);
    const re = /<a href="\/product\/(\d{13})\/" class="search-cell">([\s\S]*?)<\/a>/g;
    let m, n = 0;
    while ((m = re.exec(html))) {
      n++;
      if (seen.has(m[1])) continue; seen.add(m[1]);
      const cell = m[2];
      const title = tag(cell, 'h4');
      const img = (cell.match(/<img src="([^"]+)"/) || [])[1] || '';
      items.push({ ean: m[1], title, ...splitTitle(title), authors: tag(cell, 'h5'), publisher: tag(cell, 'h6'), cover: img.replace(/-cover-(medium|small|large)\./, '-cover-full.') });
    }
    if (n < 8) break; // dernière page (8 résultats par page)
  }
  return items;
}
async function detail(ean: string) {
  const html = await get(`${BASE}/product/${ean}/`);
  const dd = (label: string) => decode((html.match(new RegExp(`<dt>${label}</dt>\\s*<dd>([\\s\\S]*?)</dd>`)) || [])[1] || '');
  const title = tag(html, 'h1');
  const genres = [...html.matchAll(/<li><a href="\/product\/category\/\d+\/">([^<]+)<\/a><\/li>/g)].map(x => decode(x[1]));
  const full = (html.match(/data-src="([^"]+-cover-full\.[a-z]+)"/) || [])[1] || (html.match(/<img src="(https:\/\/images\.centprod\.com[^"]+)"/) || [])[1] || '';
  const st = splitTitle(title);
  return {
    ean, title, series: dd('Série') || st.series, number: st.number,
    authors: tag(html, 'h2'), publisher: dd('Éditeur') || tag(html, 'h3'),
    date: frDate(dd('Date de publication')), collection: dd('Collection') || null, genres, cover: full,
    summary: decode((html.match(/<blockquote>([\s\S]*?)<\/blockquote>/) || [])[1]?.replace(/<br\s*\/?>/gi, '\n') || '') || null,
  };
}

// ---------- FuryoGang (furyogang.com) : séries manga furyō / yakuza, éditions FR et JP ----------
const FG = 'https://furyogang.com';
let fgIndex: any = null, fgAt = 0;
const fgNorm = (x = '') => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/g, ' ').trim();
async function fgSearch(q: string) {
  if (!fgIndex || Date.now() - fgAt > 3600e3) { fgIndex = JSON.parse(await get(`${FG}/api/biblio`)); fgAt = Date.now(); }
  const n = fgNorm(q); if (!n) return [];
  const words = n.split(' ');
  return (fgIndex.items || []).map((x: any) => {
    const hay = fgNorm([x.t, x.fr, x.jp, (x.au || []).join(' ')].join(' '));
    const t = fgNorm(x.fr || x.t);
    const score = t === n ? 3 : t.startsWith(n) ? 2 : words.every((w: string) => hay.includes(w)) ? 1 : 0;
    return { x, score };
  }).filter((r: any) => r.score).sort((a: any, b: any) => b.score - a.score).slice(0, 8).map((r: any) => r.x);
}
async function fgSerie(id: string) {
  let x = JSON.parse(await get(`${FG}/api/biblio?id=${encodeURIComponent(id)}`));
  // FuryoGang garde parfois en cache (une semaine) une réponse « introuvable » : on redemande en contournant le cache
  if (!x?.serie || x?.error) { try { const y = JSON.parse(await get(`${FG}/api/biblio?id=${encodeURIComponent(id)}&r=${Date.now()}`)); if (y?.serie) x = y; } catch (_) { /* tant pis */ } }
  // résumé : seulement pour les séries dont la fiche est en ligne sur FuryoGang
  const slug = x?.serie?.slug;
  if (slug) { try { const f = JSON.parse(await get(`${FG}/api/serie?s=${encodeURIComponent(slug)}`)); if (f?.serie?.resume) x.resume = f.serie.resume; if (f?.serie?.scen) x.scen = f.serie.scen; if (f?.serie?.dess) x.dess = f.serie.dess; } catch (_) { /* pas de fiche */ } }
  return x;
}

// ---------- Cuisine : métadonnées d'un lien (Instagram, YouTube, site de recettes) ----------
//   POST { meta: "https://www.instagram.com/reel/…" } → { items: [{ title, caption, author, image /* data:… */, src }] }
const H = (s = '') => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&quot;/g, '"').replace(/&#039;|&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const og = (html: string, k: string) => H((html.match(new RegExp(`<meta[^>]+(?:property|name)="${k}"[^>]+content="([^"]*)"`, 'i')) || html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${k}"`, 'i')) || [])[1] || '');
async function asDataUrl(url: string) {
  if (!url) return '';
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }); if (!r.ok) return '';
    const b = new Uint8Array(await r.arrayBuffer()); if (b.length > 4_000_000) return '';
    let bin = ''; for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000));
    return `data:${r.headers.get('content-type') || 'image/jpeg'};base64,${btoa(bin)}`;
  } catch (_) { return ''; }
}
// recette « structurée » (schema.org Recipe en JSON-LD) : presque tous les sites de cuisine la publient
function recipeLD(html: string, base: string) {
  const strip = (x: any) => H(String(x || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  const abs = (u: string) => { try { return new URL(u, base).href; } catch (_) { return ''; } };
  const img = (x: any): string => !x ? '' : typeof x === 'string' ? abs(x) : Array.isArray(x) ? img(x[0]) : abs(x.url || x.contentUrl || '');
  const isR = (o: any) => o && [].concat(o['@type'] || []).some((t: string) => /^(schema:)?Recipe$/i.test(t));
  const find = (o: any): any => { if (!o || typeof o !== 'object') return null; if (isR(o)) return o; for (const v of Array.isArray(o) ? o : [o['@graph'], o.mainEntity, ...Object.values(o)]) { const f = find(v); if (f) return f; } return null; };
  let r: any = null;
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { r = find(JSON.parse(m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, ''))); } catch (_) { r = null; }
    if (r) break;
  }
  if (!r) return null;
  const steps: { text: string, img: string }[] = [];
  const walk = (x: any) => {
    if (!x) return;
    if (typeof x === 'string') { strip(x).split(/\s*(?:\n|(?<=\.)\s+(?=\d+[.)]\s))\s*/).forEach(t => t && steps.push({ text: t.replace(/^\d+[.)]\s*/, ''), img: '' })); return; }
    if (Array.isArray(x)) { x.forEach(walk); return; }
    if (x.itemListElement) { walk(x.itemListElement); return; } // HowToSection
    const t = strip(x.text || x.name || x.description); if (t) steps.push({ text: t, img: img(x.image) });
  };
  walk(r.recipeInstructions);
  const mins = (d: string) => { const m = String(d || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?/); return m ? (+(m[1] || 0)) * 60 + (+(m[2] || 0)) : 0; };
  return {
    name: strip(r.name), image: img(r.image), yield: strip([].concat(r.recipeYield || [])[0]),
    minutes: mins(r.totalTime) || (mins(r.prepTime) + mins(r.cookTime)) || 0,
    ings: [].concat(r.recipeIngredient || r.ingredients || []).map(strip).filter(Boolean),
    steps: steps.filter(x => x.text).slice(0, 40),
  };
}
async function linkMeta(url: string) {
  const ig = url.match(/instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(p|reels?|tv)\/([A-Za-z0-9_-]+)/);
  if (ig) {
    const kind = ig[1].startsWith('reel') ? 'reel' : ig[1];
    const out: any = { src: 'ig', title: '', caption: '', author: '', image: '' };
    try { // page « embed » : légende complète + image
      const h = await (await fetch(`https://www.instagram.com/${kind}/${ig[2]}/embed/captioned/`)).text();
      const cap = (h.match(/<div class="Caption">([\s\S]*?)<div class="CaptionComments">/) || h.match(/<div class="Caption">([\s\S]*?)<\/div>/) || [])[1] || '';
      out.author = H((cap.match(/class="CaptionUsername"[^>]*>([^<]+)</) || [])[1] || '').trim();
      out.caption = H(cap.replace(/<a class="CaptionUsername"[\s\S]*?<\/a>/, '').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').replace(/\n /g, '\n').trim();
      out.imgUrl = H((h.match(/class="EmbeddedMediaImage"[^>]*src="([^"]+)"/) || [])[1] || '');
    } catch (_) { /* ignore */ }
    try { // page publique (aperçu de partage) : titre + image en meilleure qualité
      const h = await (await fetch(`https://www.instagram.com/${kind}/${ig[2]}/`, { headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' } })).text();
      out.ogTitle = og(h, 'og:title'); out.imgUrl = out.imgUrl || og(h, 'og:image'); // l'image « embed » d'abord : celle de partage (og:image) a un bouton play incrusté sur les reels
      if (!out.caption) out.caption = (og(h, 'og:description').match(/: "([\s\S]*)"\s*$/) || [])[1] || '';
    } catch (_) { /* ignore */ }
    out.image = await asDataUrl(out.imgUrl); delete out.imgUrl; out.clean = 1; // clean : image sans play incrusté
    out.title = (out.caption.split('\n').map((l: string) => l.trim()).find((l: string) => l && !/^[#@]/.test(l)) || '').replace(/[#@]\S+/g, '').trim().slice(0, 80);
    return out;
  }
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) {
    const o = await (await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + yt[1])}`)).json().catch(() => ({}));
    return { src: 'yt', title: o.title || '', author: o.author_name || '', caption: '', image: await asDataUrl(`https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`) };
  }
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15', 'Accept': 'text/html,image/*,*/*' } });
  if (/^image\//.test(res.headers.get('content-type') || '')) { await res.body?.cancel(); return { src: 'web', title: '', author: '', caption: '', image: await asDataUrl(url) }; } // lien direct vers une image
  const h = await res.text();
  const rc = recipeLD(h, res.url || url);
  if (rc) { // images des étapes (12 au plus), copiées pour ne pas dépendre du site
    const ims = await Promise.all(rc.steps.map((st, i) => i < 30 && st.img ? asDataUrl(st.img) : Promise.resolve('')));
    let n = 0; rc.steps.forEach((st: any, i) => { st.img = ims[i] && n++ < 12 ? ims[i] : ''; });
  }
  return { src: 'web', title: rc?.name || og(h, 'og:title') || tag(h, 'title'), author: og(h, 'og:site_name'), caption: og(h, 'og:description') || og(h, 'description'), image: await asDataUrl(og(h, 'og:image') || rc?.image || ''), recipe: rc };
}

// Mise à jour du schéma Cuisine, faite par la fonction elle-même (rien à lancer à la main dans le SQL Editor).
// Uniquement des « add column if not exists » : sans danger, ne touche à aucune donnée.
const CUISINE_V2 = [
  'alter table public.cuisine_recipes add column if not exists cover_url text',
  'alter table public.cuisine_recipes add column if not exists description text',
  'alter table public.cuisine_recipe_items add column if not exists qty text',
  "alter table public.cuisine_recipes add column if not exists media jsonb not null default '{}'::jsonb",
  "notify pgrst, 'reload schema'",
];
async function migrateCuisine() {
  const url = Deno.env.get('SUPABASE_DB_URL');
  if (!url) return { ok: false, error: 'SUPABASE_DB_URL absent' };
  const { default: postgres } = await import('https://deno.land/x/postgresjs@v3.4.4/mod.js');
  const sql = postgres(url, { max: 1, prepare: false });
  try { for (const q of CUISINE_V2) await sql.unsafe(q); return { ok: true }; }
  catch (e) { return { ok: false, error: String((e as Error)?.message || e) }; }
  finally { await sql.end({ timeout: 2 }).catch(() => {}); }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : Object.fromEntries(new URL(req.url).searchParams);
    let items: any[] = [];
    if (body.migrate === 'cuisine_v2') return new Response(JSON.stringify({ items: [await migrateCuisine()] }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    if (body.meta) return new Response(JSON.stringify({ items: [await linkMeta(String(body.meta))] }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    if (body.fg) return new Response(JSON.stringify({ items: await fgSearch(String(body.fg)) }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    if (body.fgId) return new Response(JSON.stringify({ items: [await fgSerie(String(body.fgId))] }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    if (Array.isArray(body.eans) && body.eans.length) {
      const eans = body.eans.filter((e: string) => /^\d{13}$/.test(e)).slice(0, 40);
      const out = await Promise.allSettled(eans.map(detail));
      items = out.filter(r => r.status === 'fulfilled').map((r: any) => r.value);
    } else if (body.q) {
      const q = String(body.q).trim();
      items = /^97[89]\d{10}$/.test(q.replace(/[^0-9]/g, '')) ? [await detail(q.replace(/[^0-9]/g, ''))] : await search(q, +body.pages || 1);
    }
    return new Response(JSON.stringify({ items }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ items: [], error: String((e as Error).message || e) }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
