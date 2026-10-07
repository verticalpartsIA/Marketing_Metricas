// Geração do relatório mensal em PDF (Node.js + Puppeteer).
// npm i puppeteer
//
// Uso (ex.: rota Next.js / Express):
//   const pdf = await generateMonthlyReport(payload);
//   res.setHeader('Content-Type', 'application/pdf'); res.send(pdf);
//
// Páginas: 1 Capa · 2 Sumário · 3 Resultado Consolidado · 4 Evolução de Seguidores
//          · 5 TOP 5 Conteúdos · 6 Aprendizados e Plano de Ação.
// Cada seção ocupa uma página, então os números do sumário são fixos.
import puppeteer from 'puppeteer';

// Troque pelos valores do Manual de Identidade Visual.
const BRAND = { primary: '#FFCE00', dark: '#1E1E1E', dark2: '#282828', text: '#1E1E1E', muted: '#6B6B6B', grid: '#E2E2E2', soft: '#F5F5F5' };

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const int = (n) => new Intl.NumberFormat('pt-BR').format(n ?? 0);
const pct = (n) => `${Number(n ?? 0).toFixed(2).replace('.', ',')}%`;
const delta = (cur, prev) => {
  if (!prev) return '';
  const d = ((cur - prev) / prev) * 100;
  return `<span class="delta ${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : ''}${d.toFixed(1).replace('.', ',')}% vs. mês anterior</span>`;
};

// Gráfico de linha em SVG puro (sem JS no PDF, saída estável).
function lineChartSvg(points, w = 680, h = 260) {
  if (points.length < 2) return '<p class="muted">Sem dados suficientes para o gráfico.</p>';
  const pad = { l: 56, r: 12, t: 12, b: 28 };
  const ys = points.map((p) => p.followers);
  const min = Math.min(...ys), max = Math.max(...ys), span = max - min || 1;
  const x = (i) => pad.l + (i / (points.length - 1)) * (w - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - min) / span) * (h - pad.t - pad.b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.followers).toFixed(1)}`).join(' ');
  const ticks = [min, min + span / 2, max].map((v) => `
    <line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="${BRAND.grid}"/>
    <text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="${BRAND.muted}">${int(Math.round(v))}</text>`).join('');
  const label = (i) => points[i].date.slice(8, 10) + '/' + points[i].date.slice(5, 7);
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Evolução de seguidores">
    ${ticks}
    <path d="${path}" fill="none" stroke="${BRAND.primary}" stroke-width="2.5" stroke-linejoin="round"/>
    <text x="${x(0)}" y="${h - 6}" font-size="11" fill="${BRAND.muted}">${label(0)}</text>
    <text x="${x(points.length - 1)}" y="${h - 6}" font-size="11" fill="${BRAND.muted}" text-anchor="end">${label(points.length - 1)}</text>
  </svg>`;
}

/**
 * @param {object} p
 * @param {string} p.monthLabel        ex.: 'Setembro de 2026'
 * @param {string} p.logoDataUri       logo branco/amarelo (BRANCO_E_AMARELO_png.png) em data URI: a capa é escura
 * @param {{reach:number,impressions:number,engagements:number,engagementRate:number}} p.current
 * @param {typeof p.current} p.previous
 * @param {Array<{platform:string,reach:number,impressions:number,engagements:number,engagementRate:number,followersEnd:number}>} p.byPlatform
 * @param {Array<{date:string,followers:number}>} p.followersSeries   total consolidado por dia
 * @param {Array<{rank:number,platform:string,title:string,reach:number,engagements:number,engagementRate:number}>} p.top5
 * @param {{learnings:string,actionPlan:string}} p.notes
 */
export function buildReportHtml(p) {
  const card = (label, val, cur, prev) =>
    `<div class="card"><div class="k">${label}</div><div class="v">${val}</div>${delta(cur, prev)}</div>`;

  const platformRows = p.byPlatform.map((r) => `
    <tr><td>${esc(r.platform)}</td><td>${int(r.followersEnd)}</td><td>${int(r.reach)}</td>
    <td>${int(r.impressions)}</td><td>${int(r.engagements)}</td><td>${pct(r.engagementRate)}</td></tr>`).join('');

  const topRows = p.top5.slice(0, 5).map((r) => `
    <tr><td class="rank">${r.rank}</td><td>${esc(r.platform)}</td><td class="title">${esc(r.title)}</td>
    <td>${int(r.reach)}</td><td>${int(r.engagements)}</td><td>${pct(r.engagementRate)}</td></tr>`).join('');

  const paragraphs = (t) => esc(t).split(/\n+/).filter(Boolean).map((l) => `<p>${l}</p>`).join('') || '<p class="muted">Sem registro.</p>';

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Poppins', sans-serif; font-weight: 500; color: ${BRAND.text}; font-size: 12px; }
  .page { width: 210mm; height: 297mm; padding: 22mm 18mm 20mm; page-break-after: always; overflow: hidden; }
  .page:last-child { page-break-after: auto; }
  h1, h2, strong, th { font-weight: 700; }
  h2 { font-size: 20px; margin: 0 0 18px; }
  h3 { font-weight: 700; font-size: 14px; margin: 22px 0 8px; }
  .muted { color: ${BRAND.muted}; }
  .cover { display: flex; flex-direction: column; justify-content: space-between; background: ${BRAND.dark}; color: #fff; }
  .cover .bar { width: 80mm; height: 14mm; background: ${BRAND.primary}; }
  .cover img { height: 56px; align-self: flex-start; }
  .cover h1 { font-size: 40px; line-height: 1.15; margin: 0 0 12px; }
  .cover p { font-size: 18px; margin: 0; opacity: .9; }
  .toc { list-style: none; padding: 0; margin: 0; }
  .toc li { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid ${BRAND.grid}; font-size: 14px; }
  .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .card { background: ${BRAND.soft}; border-radius: 10px; padding: 16px; }
  .card .k { color: ${BRAND.muted}; font-size: 12px; }
  .card .v { font-weight: 700; font-size: 26px; margin: 4px 0; }
  .delta { font-size: 11px; } .up { color: #15803D; } .down { color: #B91C1C; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 9px 8px; border-bottom: 1px solid ${BRAND.grid}; vertical-align: top; }
  th { font-size: 11px; color: ${BRAND.muted}; }
  td.rank { font-weight: 700; color: ${BRAND.dark}; width: 28px; }
  td.title { width: 38%; }
  .note { background: ${BRAND.soft}; border-radius: 10px; padding: 4px 16px; }
  .note p { line-height: 1.6; }
</style></head><body>

<section class="page cover">
  ${p.logoDataUri ? `<img src="${p.logoDataUri}" alt="Logo">` : '<span></span>'}
  <div><h1>Relatório de Redes Sociais</h1><p>${esc(p.monthLabel)}</p><div class="bar" style="margin-top:14px"></div></div>
  <p style="font-size:12px">Gerado automaticamente a partir das APIs oficiais das plataformas.</p>
</section>

<section class="page">
  <h2>Sumário</h2>
  <ul class="toc">
    <li><span>Resultado Consolidado</span><span>3</span></li>
    <li><span>Evolução de Seguidores</span><span>4</span></li>
    <li><span>TOP 5 Conteúdos</span><span>5</span></li>
    <li><span>Aprendizados e Plano de Ação</span><span>6</span></li>
  </ul>
</section>

<section class="page">
  <h2>Resultado Consolidado</h2>
  <div class="cards">
    ${card('Alcance', int(p.current.reach), p.current.reach, p.previous?.reach)}
    ${card('Impressões', int(p.current.impressions), p.current.impressions, p.previous?.impressions)}
    ${card('Engajamento', int(p.current.engagements), p.current.engagements, p.previous?.engagements)}
    ${card('Taxa de engajamento', pct(p.current.engagementRate), p.current.engagementRate, p.previous?.engagementRate)}
  </div>
  <h3>Por plataforma</h3>
  <table><thead><tr><th>Plataforma</th><th>Seguidores</th><th>Alcance</th><th>Impressões</th><th>Engajamento</th><th>Taxa</th></tr></thead>
  <tbody>${platformRows}</tbody></table>
</section>

<section class="page">
  <h2>Evolução de Seguidores</h2>
  ${lineChartSvg(p.followersSeries)}
</section>

<section class="page">
  <h2>TOP 5 Conteúdos</h2>
  <table><thead><tr><th>#</th><th>Plataforma</th><th>Conteúdo</th><th>Alcance</th><th>Engaj.</th><th>Taxa</th></tr></thead>
  <tbody>${topRows}</tbody></table>
</section>

<section class="page">
  <h2>Aprendizados e Plano de Ação</h2>
  <h3>Aprendizados do mês</h3><div class="note">${paragraphs(p.notes?.learnings)}</div>
  <h3>Plano de ação</h3><div class="note">${paragraphs(p.notes?.actionPlan)}</div>
</section>

</body></html>`;
}

export async function generateMonthlyReport(payload) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(buildReportHtml(payload), { waitUntil: 'networkidle0' });
    await page.evaluateHandle('document.fonts.ready'); // garante Poppins carregada
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });
  } finally {
    await browser.close();
  }
}
