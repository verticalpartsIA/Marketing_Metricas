// Worker de coleta (rodar por cron: `npm run sync`). Único caminho de entrada das métricas quantitativas.
// Contrato: cada coletor em sync/<plataforma>.js exporta `default async (account, since) => ({ daily: [...], posts: [...] })`
//   daily: { date, followers, followers_gained, reach, impressions, engagements, profile_visits, video_views, raw }
//   posts: { external_id, published_at, content_type, title_or_caption, permalink, metrics: { reach, impressions, likes, comments, shares, saves, clicks, video_views, engagements } }
// Tokens ficam em social_accounts.*_enc (criptografados); descriptografe no coletor antes de chamar a API.
import pg from 'pg';
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const sinceDefault = () => new Date(Date.now() - 35 * 864e5).toISOString().slice(0, 10);

async function save(acc, { daily = [], posts = [] }) {
  let n = 0;
  for (const d of daily) {
    await db.query(`INSERT INTO account_daily_metrics (account_id, metric_date, followers, followers_gained, reach, impressions, engagements, profile_visits, video_views, raw)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (account_id, metric_date) DO UPDATE SET followers=EXCLUDED.followers, followers_gained=EXCLUDED.followers_gained,
      reach=EXCLUDED.reach, impressions=EXCLUDED.impressions, engagements=EXCLUDED.engagements, profile_visits=EXCLUDED.profile_visits, video_views=EXCLUDED.video_views, raw=EXCLUDED.raw, collected_at=now()`,
      [acc.id, d.date, d.followers, d.followers_gained, d.reach, d.impressions, d.engagements, d.profile_visits, d.video_views, d.raw ?? null]); n++;
  }
  for (const p of posts) {
    const { rows: [row] } = await db.query(`INSERT INTO posts (account_id, external_id, published_at, content_type, title_or_caption, permalink)
      VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (account_id, external_id) DO UPDATE SET title_or_caption=EXCLUDED.title_or_caption RETURNING id`,
      [acc.id, p.external_id, p.published_at, p.content_type || 'other', p.title_or_caption, p.permalink]);
    const m = p.metrics || {};
    await db.query(`INSERT INTO post_metrics (post_id, collected_on, reach, impressions, likes, comments, shares, saves, clicks, video_views, engagements)
      VALUES ($1, CURRENT_DATE, $2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (post_id, collected_on) DO UPDATE SET reach=EXCLUDED.reach, impressions=EXCLUDED.impressions,
      likes=EXCLUDED.likes, comments=EXCLUDED.comments, shares=EXCLUDED.shares, saves=EXCLUDED.saves, clicks=EXCLUDED.clicks, video_views=EXCLUDED.video_views, engagements=EXCLUDED.engagements`,
      [row.id, m.reach, m.impressions, m.likes, m.comments, m.shares, m.saves, m.clicks, m.video_views, m.engagements ?? 0]); n++;
  }
  return n;
}

for (const acc of (await db.query('SELECT * FROM social_accounts WHERE is_active')).rows) {
  const { rows: [run] } = await db.query('INSERT INTO sync_runs (account_id) VALUES ($1) RETURNING id', [acc.id]);
  try {
    const collector = (await import(`./${acc.platform}.js`).catch(() => null))?.default;
    if (!collector) throw new Error(`coletor de ${acc.platform} ainda não implementado`);
    const rows = await save(acc, await collector(acc, sinceDefault()));
    await db.query(`UPDATE sync_runs SET status='success', finished_at=now(), rows_written=$2 WHERE id=$1`, [run.id, rows]);
  } catch (e) {
    await db.query(`UPDATE sync_runs SET status='failed', finished_at=now(), error=$2 WHERE id=$1`, [run.id, e.message]);
    console.error(acc.platform, e.message);
  }
}
await db.end();
