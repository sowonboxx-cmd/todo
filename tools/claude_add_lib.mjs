#!/usr/bin/env node
// Outil pour Claude : ajoute une série à la Bibliothèque du dashboard via la boîte d'envoi (claude_inbox).
// Cherche la série chez les librairies indépendantes (ISBN, couvertures, dates, genre) puis la dépose.
//
//   CLAUDE_INBOX_TOKEN=… node tools/claude_add_lib.mjs "The Strange House" --owned 1-4 --read 3 [--format paper|digital|both] [--kind manga|bd|comics] [--wish 5] [--dry]
//
// --owned 1-4 : tomes possédés (ou « 1,2,5 »), --read 3 : lus jusqu'au tome 3, --wish 5 : tomes à acheter,
// --genre "Fantastique" : genre à la place de celui du site, --dry : affiche seulement ce qui serait envoyé. La clé n'est jamais dans le dépôt (variable d'environnement).

const SUPA = 'https://pjjpsvohzeueoivtbenp.supabase.co';
const KEY = 'sb_publishable_xjpR5VbYJssJTcSSiSma_w_cfyEqJll';
const BASE = 'https://www.librairiesindependantes.com';
const UA = 'UltimateDashboard/1.0 (bibliotheque perso)';
const MONTHS = { janvier: '01', 'février': '02', mars: '03', avril: '04', mai: '05', juin: '06', juillet: '07', 'août': '08', septembre: '09', octobre: '10', novembre: '11', 'décembre': '12' };

const args = process.argv.slice(2);
const title = args.find(a => !a.startsWith('--') && !/^--/.test(args[args.indexOf(a) - 1] || ''));
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };
const range = v => { if (!v || v === true) return []; return String(v).split(',').flatMap(p => { const [a, b] = p.split('-').map(Number); return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a]; }); };
if (!title) { console.error('Titre manquant'); process.exit(1); }

const decode = (s = '') => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&rsquo;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, ' ').trim();
const tag = (h, t) => decode((h.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || '');
const norm = x => (x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`´]/g, "'").replace(/[^a-z0-9']+/g, ' ').trim();
const split = t => { const m = t.match(/^(.*?)(?:\s*[-–—:,]\s*|\s+)(?:tome|t\.?|vol\.?|volume)\s*(\d+(?:[.,]\d+)?)\b.*$/i); return m ? { series: m[1].trim(), number: +m[2].replace(',', '.') } : { series: t, number: null }; };
const cap = x => (x || '').toLowerCase().replace(/(^|[\s\-'’.])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
const get = async u => { const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR' } }); if (!r.ok) throw new Error(`HTTP ${r.status} ${u}`); return r.text(); };

async function search(q) {
  const out = [], seen = new Set();
  for (let p = 1; p <= 3; p++) {
    const html = await get(`${BASE}/product/search/?query=${encodeURIComponent(q)}${p > 1 ? `&page-number=${p}` : ''}`);
    let m, n = 0; const re = /<a href="\/product\/(\d{13})\/" class="search-cell">([\s\S]*?)<\/a>/g;
    while ((m = re.exec(html))) { n++; if (seen.has(m[1])) continue; seen.add(m[1]); const t = tag(m[2], 'h4'); out.push({ ean: m[1], title: t, ...split(t), authors: tag(m[2], 'h5'), publisher: tag(m[2], 'h6') }); }
    if (n < 8) break;
  }
  return out;
}
async function detail(ean) {
  const h = await get(`${BASE}/product/${ean}/`);
  const dd = l => decode((h.match(new RegExp(`<dt>${l}</dt>\\s*<dd>([\\s\\S]*?)</dd>`)) || [])[1] || '');
  const dm = dd('Date de publication').toLowerCase().match(/(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/);
  return {
    ean, genres: [...h.matchAll(/<li><a href="\/product\/category\/\d+\/">([^<]+)<\/a><\/li>/g)].map(x => decode(x[1])),
    date: dm && MONTHS[dm[2]] ? `${dm[3]}-${MONTHS[dm[2]]}-${dm[1].padStart(2, '0')}` : null,
    cover: (h.match(/data-src="([^"]+-cover-full\.[a-z]+)"/) || [])[1] || null, publisher: dd('Éditeur'), series: dd('Série'), collection: dd('Collection') || null,
    summary: decode(((h.match(/<blockquote>([\s\S]*?)<\/blockquote>/) || [])[1] || '').replace(/<br\s*\/?>/gi, '\n')) || null,
  };
}

const all = await search(title);
let mine = all.filter(x => norm(x.series) === norm(title));
if (!mine.length) { console.log('Aucune correspondance exacte. Résultats :\n' + all.slice(0, 12).map(x => `  ${x.title} · ${x.publisher} · ${x.ean}`).join('\n')); process.exit(2); }
const pub = opt('publisher'); if (pub) mine = mine.filter(x => norm(x.publisher) === norm(pub));
const byNum = new Map(); mine.forEach(x => { const k = x.number || 1; if (!byNum.has(k)) byNum.set(k, x); });
const list = [...byNum.entries()].sort((a, b) => a[0] - b[0]);
const det = await Promise.all(list.map(([, x]) => detail(x.ean).catch(() => ({}))));
const genres = det.find(d => d.genres?.length)?.genres || [];
const g = genres.filter(x => !x.includes(',')).join(' | '); // la 1re catégorie est commune à tout
const kind = opt('kind') || (/manga/i.test(g) ? 'manga' : /comics/i.test(g) ? 'comics' : 'bd');
const genre = opt('genre') || genres.filter(x => !/^(bandes dessinées, comics, mangas|manga|comics|bandes dessinées|bandes dessinées de genre)$/i.test(x)).slice(-1)[0] || null;
const owned = range(opt('owned')), wish = range(opt('wish')), readTo = +opt('read') || 0;
const fmt = opt('format') || 'paper';
const first = list[0][1];
const payload = {
  series: { title: list[0][1].series, kind, authors: first.authors, publisher: cap(det[0]?.publisher || first.publisher), genre, total_volumes: list.length > 1 || list[0][0] > 1 ? Math.max(...list.map(([n]) => n)) : 1, cover_url: det[0]?.cover || null, edition: det[0]?.collection || null, summary: det[0]?.summary || null, format: fmt, follow: true, status: list.length === 1 && !list[0][1].number ? 'Récit complet' : null },
  volumes: list.map(([n, x], i) => ({ number: n, isbn: x.ean, cover_url: det[i]?.cover || null, release_date: det[i]?.date || null, summary: det[i]?.summary || null, owned: owned.includes(n) || null, read: (owned.includes(n) && n <= readTo) || null, wish: wish.includes(n) || null, format: owned.includes(n) ? fmt : null })),
};
Object.keys(payload.series).forEach(k => payload.series[k] == null && delete payload.series[k]);
payload.volumes.forEach(v => Object.keys(v).forEach(k => v[k] == null && delete v[k]));
console.log(`${payload.series.title} · ${payload.series.publisher} · ${kind}${genre ? ' / ' + genre : ''} · ${list.length} tome(s)`);
payload.volumes.forEach(v => console.log(`  T.${v.number} ${v.release_date || '?'} ${v.owned ? 'possédé' : ''}${v.read ? ' lu' : ''}${v.wish ? ' à acheter' : ''}${v.cover_url ? '' : ' (sans couverture)'}`));
if (opt('dry')) process.exit(0);
const token = process.env.CLAUDE_INBOX_TOKEN; if (!token) { console.error('CLAUDE_INBOX_TOKEN manquant'); process.exit(1); }
const r = await fetch(`${SUPA}/rest/v1/claude_inbox`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ kind: 'lib', token, payload }) });
console.log(r.status === 201 ? 'Déposé dans la boîte d’envoi.' : `Erreur ${r.status} ${await r.text()}`);
