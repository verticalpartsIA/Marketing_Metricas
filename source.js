// Camada de dados: PostgreSQL quando DATABASE_URL existe; senão, dados de exemplo (data.js).
import * as demo from './data.js';
export const MODE = process.env.DATABASE_URL ? 'postgres' : 'demo';
export const PLATFORMS = demo.PLATFORMS;
const AB = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const FMT = { image: 'Imagem', video: 'Vídeo', reel: 'Reel', carousel: 'Carrossel', story: 'Story', text: 'Texto', link: 'Link', short: 'Short', other: 'Outro' };
let pool;
const q = async (sql, p = []) => {
  pool ??= new (await import('pg')).default.Pool({ connectionString: process.env.DATABASE_URL });
  return (await pool.query(sql, p)).rows;
};
const start = (id) => id + '-01';
const prevId = (id) => { const d = new Date(Date.UTC(+id.slice(0, 4), +id.slice(5) - 2, 1)); return d.toISOString().slice(0, 7); };

async function monthStats(id) {
  const rows = await q(`SELECT a.platform, SUM(d.reach) reach, SUM(d.impressions) impressions, SUM(d.engagements) engagements,
      SUM(d.followers_gained) gain, (ARRAY_AGG(d.followers ORDER BY d.metric_date DESC) FILTER (WHERE d.followers IS NOT NULL))[1] followers
    FROM account_daily_metrics d JOIN social_accounts a ON a.id = d.account_id
    WHERE d.metric_date >= $1::date AND d.metric_date < ($1::date + interval '1 month') GROUP BY a.platform`, [start(id)]);
  if (!rows.length) return null;
  const platforms = PLATFORMS.map((name) => {
    const r = rows.find((x) => x.platform === name.toLowerCase()) || {};
    const reach = +r.reach || 0, engagements = +r.engagements || 0;
    return { name, reach, impressions: +r.impressions || 0, engagements, rate: reach ? (engagements / reach) * 100 : 0, followers: +r.followers || 0, gain: +r.gain || 0 };
  });
  const s = (k) => platforms.reduce((a, x) => a + x[k], 0);
  return { platforms, total: { reach: s('reach'), impressions: s('impressions'), engagements: s('engagements'), rate: s('reach') ? (s('engagements') / s('reach')) * 100 : 0, followers: s('followers') } };
}

export async function months() {
  if (MODE === 'demo') return demo.MONTHS;
  const rows = await q(`SELECT DISTINCT to_char(date_trunc('month', metric_date), 'YYYY-MM') id FROM account_daily_metrics ORDER BY 1`);
  return rows.map(({ id }) => ({ id, label: `${AB[+id.slice(5) - 1]}/${id.slice(2, 4)}` }));
}
export async function summary(id) {
  if (MODE === 'demo') return demo.summary(id);
  const cur = (await monthStats(id)) || { platforms: [], total: { reach: 0, impressions: 0, engagements: 0, rate: 0, followers: 0 } };
  const prev = await monthStats(prevId(id));
  return { ...cur, previous: prev && prev.total };
}
export async function followers(id, platform) {
  if (MODE === 'demo') return demo.followers(id, platform);
  const rows = await q(`SELECT d.metric_date, SUM(d.followers) f FROM account_daily_metrics d JOIN social_accounts a ON a.id = d.account_id
    WHERE d.metric_date >= $1::date AND d.metric_date < ($1::date + interval '1 month') AND ($2 = 'all' OR a.platform::text = $2)
    GROUP BY 1 ORDER BY 1`, [start(id), String(platform || 'all').toLowerCase()]);
  return rows.map((r) => +r.f || 0);
}
export async function top(id, by = 'engagements') {
  if (MODE === 'demo') return demo.top(id, by);
  const col = by === 'reach' ? 'reach' : 'engagements';
  const rows = await q(`SELECT platform, title_or_caption, content_type, reach, engagements, engagement_rate_pct
    FROM monthly_post_ranking WHERE month = $1::date ORDER BY ${col} DESC NULLS LAST LIMIT 5`, [start(id)]);
  return rows.map((r) => ({ platform: PLATFORMS.find((p) => p.toLowerCase() === r.platform) || r.platform, title: r.title_or_caption || '(sem título)',
    format: FMT[r.content_type] || 'Outro', reach: +r.reach || 0, engagements: +r.engagements || 0, rate: +r.engagement_rate_pct || 0 }));
}
