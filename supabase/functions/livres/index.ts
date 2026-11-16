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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : Object.fromEntries(new URL(req.url).searchParams);
    let items: any[] = [];
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
