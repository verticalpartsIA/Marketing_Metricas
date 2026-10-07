// Fonte de dados. Hoje: dados de EXEMPLO. Para produção, troque estas funções por consultas
// às views do db/schema.sql (monthly_platform_summary, monthly_post_ranking, account_daily_metrics).
export const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'YouTube'];
export const MONTHS = [
  { id: '2026-07', label: 'Jul/26', len: 31, off: 0 },
  { id: '2026-08', label: 'Ago/26', len: 31, off: 31 },
  { id: '2026-09', label: 'Set/26', len: 30, off: 62 },
];
const base = [12400, 8200, 5600, 3100, 2300], rate = [14, 4, 9, 11, 3];
const reach = [[182000,195400,214800],[64000,61200,66500],[41000,47800,52300],[88000,102500,97400],[29000,31500,35200]];
const ipf = [1.4,1.3,1.5,1.2,1.1], erate = [.052,.031,.046,.068,.039], wob = [1,1.04,.98];
const fol = (p, d) => base[p] + rate[p] * d + Math.sin(d * .9 + p) * rate[p] * .6;
const idx = (id) => Math.max(0, MONTHS.findIndex((m) => m.id === id));

function one(mi) {
  const m = MONTHS[mi], end = m.off + m.len - 1;
  const platforms = PLATFORMS.map((name, p) => {
    const r = reach[p][mi], e = r * erate[p] * wob[mi];
    return { name, reach: r, impressions: r * ipf[p], engagements: e, rate: (e / r) * 100,
      followers: fol(p, end), gain: fol(p, end) - fol(p, Math.max(m.off - 1, 0)) };
  });
  const s = (k) => platforms.reduce((a, x) => a + x[k], 0);
  return { platforms, total: { reach: s('reach'), impressions: s('impressions'), engagements: s('engagements'),
    rate: (s('engagements') / s('reach')) * 100, followers: s('followers') } };
}
export function summary(id) { const mi = idx(id); return { ...one(mi), previous: mi ? one(mi - 1).total : null }; }

export function followers(id, platform) {
  const mi = idx(id), m = MONTHS[mi], pi = PLATFORMS.indexOf(platform);
  return Array.from({ length: m.len }, (_, d) =>
    pi < 0 ? PLATFORMS.reduce((a, _p, p) => a + fol(p, m.off + d), 0) : fol(pi, m.off + d));
}

const C = [['Instagram','Reel: como identificar desgaste em degraus',1.00,'Reel'],['LinkedIn','Peças originais x paralelas: o que muda',.72,'Carrossel'],['TikTok','Bastidores do estoque de peças',1.15,'Vídeo'],['Instagram','Manutenção preventiva em 5 passos',.88,'Carrossel'],['YouTube','Modernização de escada rolante, passo a passo',.63,'Vídeo'],['Facebook','Dica rápida: ruídos no corrimão',.41,'Imagem'],['LinkedIn','Linha de roletes: novidades',.57,'Imagem'],['Instagram','Dia do técnico: homenagem à equipe',.79,'Imagem']];
export function top(id, by = 'engagements') {
  const mi = idx(id), f = .85 + mi * .12;
  return C.map(([platform, title, k, format]) => {
    const p = PLATFORMS.indexOf(platform), r = reach[p][mi] * .06 * k * f, e = r * erate[p] * (1.4 - k * .3);
    return { platform, title, format, reach: r, engagements: e, rate: (e / r) * 100 };
  }).sort((a, b) => b[by] - a[by]).slice(0, 5);
}
