# Dashboard de Redes Sociais, Vertical Parts

## Como rodar
1. Instale o Node.js 18 ou superior.
2. Na pasta do projeto: `npm install` e depois `npm start`
3. Abra http://localhost:3000

O `npm install` baixa também o Puppeteer (usado só no botão **Exportar PDF**). Se preferir pular:
`npm install --omit=optional`. O dashboard funciona sem ele, mas o PDF retorna uma mensagem pedindo a instalação.

## O que já funciona
- Dashboard (Poppins 12, paleta e logos do Manual de Identidade Visual) servido por `server.js`
- API: `/api/months`, `/api/summary`, `/api/followers`, `/api/top`, `/api/notes/:mes`, `/api/report.pdf`
- Aprendizados e Plano de Ação gravados em `data/notes.json`
- Relatório PDF executivo (capa com logo, sumário, consolidado, seguidores, TOP 5, qualitativo)

## O que ainda é demonstração
As métricas vêm de `data.js` (dados de exemplo). Para produção:
1. Rode `db/schema.sql` no PostgreSQL.
2. Crie os jobs de coleta por OAuth (Meta, LinkedIn, TikTok, YouTube) que gravam em `account_daily_metrics` e `post_metrics`.
3. Troque as funções de `data.js` por consultas às views do schema. Nenhuma outra parte do código muda.

## Atualização: modo PostgreSQL e coleta
- `source.js`: usa o PostgreSQL quando `DATABASE_URL` está definido; sem ele, segue em modo demonstração (`data.js`).
- `sync/run.js`: worker de coleta (`npm run sync`, agendar por cron). Grava em `account_daily_metrics`, `posts` e `post_metrics` e registra em `sync_runs`.
- Faltam os coletores OAuth: crie `sync/instagram.js`, `facebook.js`, `linkedin.js`, `tiktok.js` e `youtube.js` seguindo o contrato descrito no topo de `sync/run.js`.
- Módulo qualitativo agora espelha a planilha: 6 perguntas de aprendizados + plano de ação (ação, plataforma, formato, KPI, status).
