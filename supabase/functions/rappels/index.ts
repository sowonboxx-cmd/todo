// Fonction Supabase « rappels » : notifications des tâches de l'Ultimate Dashboard.
// - s'installe toute seule (tables, clés, tâche planifiée chaque minute) : rien à lancer dans le SQL Editor ;
// - garde les abonnements des appareils (iPhone, Mac…) ;
// - chaque minute, envoie les rappels arrivés à l'heure.
// Rien de personnel ici : les clés sont créées et rangées dans la base au premier lancement.
import webpush from 'npm:web-push@3.6.7';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const TZ = 'Europe/Paris';

let _sql: any = null;
async function db() {
  if (_sql) return _sql;
  const { default: postgres } = await import('https://deno.land/x/postgresjs@v3.4.4/mod.js');
  _sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 1, prepare: false });
  return _sql;
}

// ---------- installation (sans danger : « if not exists », ne touche à aucune donnée existante) ----------
async function setup(fnUrl: string) {
  const sql = await db();
  await sql.unsafe(`create table if not exists public.push_conf (k text primary key, v text not null)`);
  await sql.unsafe(`alter table public.push_conf enable row level security`);
  await sql.unsafe(`create table if not exists public.push_subs (endpoint text primary key, sub jsonb not null, ua text, created_at timestamptz not null default now(), last_ok timestamptz)`);
  await sql.unsafe(`alter table public.push_subs enable row level security`);
  await sql.unsafe(`alter table public.todos add column if not exists reminder_sent text`);
  // clés de l'expéditeur (une seule fois)
  const conf = await getConf();
  if (!conf.vapid_public) {
    const k = webpush.generateVAPIDKeys();
    await sql`insert into public.push_conf (k, v) values ('vapid_public', ${k.publicKey}), ('vapid_private', ${k.privateKey}) on conflict (k) do nothing`;
  }
  if (!conf.tick) await sql`insert into public.push_conf (k, v) values ('tick', ${crypto.randomUUID() + crypto.randomUUID()}) on conflict (k) do nothing`;
  const c = await getConf();
  // tâche planifiée : chaque minute, la base appelle cette fonction
  await sql.unsafe(`create extension if not exists pg_cron`);
  await sql.unsafe(`create extension if not exists pg_net`);
  const body = JSON.stringify({ tick: c.tick }).replace(/'/g, "''");
  const auth = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '').replace(/'/g, "''");
  const headers = JSON.stringify({ 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) }).replace(/'/g, "''");
  await sql.unsafe(`select cron.schedule('dashboard-rappels', '* * * * *', $cron$ select net.http_post(url := '${fnUrl.replace(/'/g, "''")}', body := '${body}'::jsonb, headers := '${headers}'::jsonb) $cron$)`);
  await sql.unsafe(`notify pgrst, 'reload schema'`);
  return c;
}
async function getConf(): Promise<Record<string, string>> {
  const sql = await db();
  try { const rows = await sql`select k, v from public.push_conf`; return Object.fromEntries(rows.map((r: any) => [r.k, r.v])); }
  catch (_) { return {}; }
}

// ---------- seul le titulaire du dashboard (connecté) peut abonner un appareil ----------
async function isUser(req: Request) {
  const a = req.headers.get('Authorization') || '';
  const key = Deno.env.get('SUPABASE_ANON_KEY') || req.headers.get('apikey') || '';
  if (!/^Bearer\s+ey/.test(a)) return false;
  const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, { headers: { Authorization: a, apikey: key } });
  return r.ok;
}

async function send(sub: any, payload: unknown, conf: Record<string, string>) {
  webpush.setVapidDetails('mailto:rappels@baka.willskyice.com', conf.vapid_public, conf.vapid_private);
  return webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 3600, urgency: 'high' });
}
async function sendAll(payload: unknown, conf: Record<string, string>) {
  const sql = await db();
  const subs = await sql`select endpoint, sub from public.push_subs`;
  let ok = 0;
  for (const s of subs) {
    try { await send(s.sub, payload, conf); ok++; await sql`update public.push_subs set last_ok = now() where endpoint = ${s.endpoint}`; }
    catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await sql`delete from public.push_subs where endpoint = ${s.endpoint}`; } // appareil désabonné
  }
  return { subs: subs.length, ok };
}

const OFFSET: Record<string, string> = { 'On time': '0 minutes', '5 minutes early': '5 minutes', '30 minutes early': '30 minutes', '1 hour early': '1 hour', '1 day early': '1 day' };
const WHEN: Record<string, string> = { 'On time': 'Maintenant', '5 minutes early': 'Dans 5 minutes', '30 minutes early': 'Dans 30 minutes', '1 hour early': 'Dans 1 heure', '1 day early': 'Demain' };

// ---------- chaque minute : les rappels arrivés à l'heure ----------
async function tick() {
  const sql = await db();
  const conf = await getConf();
  if (!conf.vapid_public) return { sent: 0 };
  const due = await sql.unsafe(`
    with t as (
      select id, title, reminder, due_date, due_time, reminder_sent,
        due_date::text || '|' || coalesce(left(due_time::text, 5), '') || '|' || reminder as k,
        ((due_date + coalesce(nullif(left(due_time::text, 5), '')::time, time '09:00')) at time zone '${TZ}') as fire_at
      from public.todos
      where reminder is not null and reminder <> '' and due_date is not null
        and coalesce(is_done, false) = false and coalesce(is_archived, false) = false
    )
    select id, title, reminder, due_time, k, fire_at from t
    where reminder_sent is distinct from k
      and fire_at - (case reminder ${Object.entries(OFFSET).map(([r, o]) => `when '${r}' then interval '${o}'`).join(' ')} else interval '0 minutes' end) <= now()
      and fire_at > now() - interval '12 hours'
    limit 20`);
  let sent = 0;
  for (const t of due) {
    const hh = t.due_time ? String(t.due_time).slice(0, 5).replace(':', ' h ') : '';
    const body = [WHEN[t.reminder] || '', hh ? 'à ' + hh : ''].filter(Boolean).join(' ') || 'Rappel';
    const r = await sendAll({ title: t.title || 'Tâche', body, todo: t.id, tag: 'todo-' + t.id }, conf);
    await sql`update public.todos set reminder_sent = ${t.k} where id = ${t.id}`;
    sent += r.ok;
  }
  return { due: due.length, sent };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    const fnUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/rappels`;

    // appel de la tâche planifiée
    if (body.tick) {
      const conf = await getConf();
      if (!conf.tick || body.tick !== conf.tick) return json({ error: 'refusé' }, 403);
      return json(await tick());
    }

    if (!(await isUser(req))) return json({ error: 'connexion requise' }, 401);

    if (body.key) { // clé publique (installe tout au premier appel)
      let conf = await getConf();
      if (!conf.vapid_public || body.setup) conf = await setup(fnUrl);
      return json({ key: conf.vapid_public });
    }
    if (body.subscribe?.endpoint) {
      const sql = await db();
      const s = body.subscribe;
      await sql`insert into public.push_subs (endpoint, sub, ua) values (${s.endpoint}, ${sql.json(s)}, ${String(body.ua || '').slice(0, 200)})
        on conflict (endpoint) do update set sub = excluded.sub, ua = excluded.ua`;
      return json({ ok: true });
    }
    if (body.unsubscribe) {
      const sql = await db();
      await sql`delete from public.push_subs where endpoint = ${String(body.unsubscribe)}`;
      return json({ ok: true });
    }
    if (body.test) {
      const conf = await getConf();
      return json(await sendAll({ title: 'Notifications activées', body: 'Vos rappels arriveront ici.', tag: 'test' }, conf));
    }
    if (body.status) {
      const sql = await db();
      const subs = await sql`select ua, created_at, last_ok from public.push_subs order by created_at`;
      let cron: any[] = [];
      try { cron = await sql`select status_code, left(content::text, 200) as content, created from net._http_response order by created desc limit 5`; } catch (_) { /* ignore */ }
      return json({ subs, cron });
    }
    return json({ error: 'action inconnue' }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 200);
  }
});
