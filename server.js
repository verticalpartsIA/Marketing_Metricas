import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as src from './source.js';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const NOTES = path.join(__dir, 'data', 'notes.json');
// Perguntas e listas espelham as abas de análise estratégica da planilha.
const QS = ['O que funcionou muito bem?', 'O que não funcionou como esperado?', 'Qual padrão percebemos na audiência?',
  'Qual nova hipótese queremos testar?', 'O que devemos REPETIR no próximo mês?', 'O que devemos REDUZIR ou ABANDONAR?'];
const FORMATS = ['Reel/Vídeo', 'Carrossel', 'Imagem', 'Story', 'Documento/PDF', 'Outro'];
const STATUS = ['Planejado', 'Em teste', 'Executado', 'Avaliar', 'Repetir'];

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dir, 'public')));
const h = (fn) => (q, r) => fn(q, r).catch((e) => r.status(500).json({ error: e.message }));
const readNotes = async () => { try { return JSON.parse(await fs.readFile(NOTES, 'utf8')); } catch { return {}; } };
const monthOf = async (v) => { const ms = await src.months(); return ms.some((m) => m.id === v) ? v : ms.at(-1)?.id; };
const norm = (n = {}) => ({ answers: QS.map((_, i) => String(n.answers?.[i] ?? '')),
  plan: (n.plan || []).map((r) => ({ acao: String(r.acao || ''), plataforma: String(r.plataforma || ''), formato: String(r.formato || ''), kpi: String(r.kpi || ''), status: String(r.status || '') })) });

app.get('/api/meta', (_q, r) => r.json({ mode: src.MODE, platforms: src.PLATFORMS, questions: QS, formats: FORMATS, status: STATUS }));
app.get('/api/months', h(async (_q, r) => r.json(await src.months())));
app.get('/api/summary', h(async (q, r) => r.json(await src.summary(await monthOf(q.query.month)))));
app.get('/api/followers', h(async (q, r) => r.json({ points: await src.followers(await monthOf(q.query.month), q.query.platform) })));
app.get('/api/top', h(async (q, r) => r.json(await src.top(await monthOf(q.query.month), q.query.by === 'reach' ? 'reach' : 'engagements'))));
app.get('/api/notes/:month', h(async (q, r) => r.json(norm((await readNotes())[await monthOf(q.params.month)]))));
app.put('/api/notes/:month', h(async (q, r) => {
  const all = await readNotes(); all[await monthOf(q.params.month)] = norm(q.body);
  await fs.mkdir(path.dirname(NOTES), { recursive: true }); await fs.writeFile(NOTES, JSON.stringify(all, null, 2)); r.json({ ok: true });
}));

app.get('/api/report.pdf', async (q, r) => {
  let gen;
  try { ({ generateMonthlyReport: gen } = await import('./generate-report.js')); }
  catch { return r.status(501).send('Puppeteer não instalado. Rode: npm install puppeteer'); }
  try {
    const id = await monthOf(q.query.month), m = (await src.months()).find((x) => x.id === id), s = await src.summary(id);
    const cur = (t) => t && ({ reach: t.reach, impressions: t.impressions, engagements: t.engagements, engagementRate: t.rate });
    const n = norm((await readNotes())[id]), logo = await fs.readFile(path.join(__dir, 'public/img/logo-branco.png'));
    const notes = {
      learnings: QS.map((x, i) => (n.answers[i] ? `${x} ${n.answers[i]}` : '')).filter(Boolean).join('\n'),
      actionPlan: n.plan.filter((x) => x.acao).map((x) => `${x.acao}${x.plataforma ? ` (${x.plataforma}${x.formato ? ', ' + x.formato : ''})` : ''}${x.kpi ? ' | KPI: ' + x.kpi : ''}${x.status ? ' | ' + x.status : ''}`).join('\n'),
    };
    const pdf = await gen({
      monthLabel: m.label, logoDataUri: 'data:image/png;base64,' + logo.toString('base64'), current: cur(s.total), previous: cur(s.previous),
      byPlatform: s.platforms.map((p) => ({ platform: p.name, reach: p.reach, impressions: p.impressions, engagements: p.engagements, engagementRate: p.rate, followersEnd: p.followers })),
      followersSeries: (await src.followers(id)).map((v, i) => ({ date: `${id}-${String(i + 1).padStart(2, '0')}`, followers: Math.round(v) })),
      top5: (await src.top(id)).map((t, i) => ({ rank: i + 1, platform: t.platform, title: t.title, reach: t.reach, engagements: t.engagements, engagementRate: t.rate })),
      notes,
    });
    r.type('application/pdf').attachment(`relatorio-${id}.pdf`).send(Buffer.from(pdf));
  } catch (e) { r.status(500).send('Falha ao gerar o PDF: ' + e.message); }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Dashboard em http://localhost:${port} (${src.MODE})`));
