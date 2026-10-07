-- Dashboard de Redes Sociais: schema PostgreSQL
-- Princípio: métricas quantitativas só entram via jobs de sincronização (OAuth).
-- A role da aplicação web tem apenas SELECT nas tabelas de métricas (ver GRANTs no final).

CREATE TYPE platform_t AS ENUM ('instagram', 'facebook', 'linkedin', 'tiktok', 'youtube');
CREATE TYPE content_type_t AS ENUM ('image', 'video', 'reel', 'carousel', 'story', 'text', 'link', 'short', 'other');
CREATE TYPE sync_status_t AS ENUM ('running', 'success', 'partial', 'failed');

-- Contas conectadas por OAuth. Tokens criptografados na aplicação (ex.: AES-GCM) antes de gravar.
CREATE TABLE social_accounts (
  id               BIGSERIAL PRIMARY KEY,
  platform         platform_t NOT NULL,
  external_id      TEXT NOT NULL,            -- IG user id, page id, org URN, open_id, channel id
  display_name     TEXT NOT NULL,
  access_token_enc BYTEA NOT NULL,
  refresh_token_enc BYTEA,
  token_expires_at TIMESTAMPTZ,
  scopes           TEXT[] NOT NULL DEFAULT '{}',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  connected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform, external_id)
);

-- Métricas diárias da conta (uma linha por conta/dia). Colunas NULL = a plataforma não fornece.
CREATE TABLE account_daily_metrics (
  account_id     BIGINT NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  metric_date    DATE   NOT NULL,
  followers      INTEGER,                    -- total de seguidores ao fim do dia
  followers_gained INTEGER,
  reach          INTEGER,
  impressions    INTEGER,
  engagements    INTEGER,
  profile_visits INTEGER,
  video_views    INTEGER,
  raw            JSONB,                      -- resposta original da API (auditoria/reprocesso)
  collected_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, metric_date)
);

-- Conteúdos publicados.
CREATE TABLE posts (
  id            BIGSERIAL PRIMARY KEY,
  account_id    BIGINT NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  external_id   TEXT NOT NULL,
  published_at  TIMESTAMPTZ NOT NULL,
  content_type  content_type_t NOT NULL DEFAULT 'other',
  title_or_caption TEXT,
  permalink     TEXT,
  thumbnail_url TEXT,
  UNIQUE (account_id, external_id)
);
CREATE INDEX posts_published_idx ON posts (published_at);

-- Snapshots de métricas por conteúdo (o job grava o valor mais recente a cada coleta).
CREATE TABLE post_metrics (
  post_id      BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  collected_on DATE   NOT NULL,
  reach        INTEGER,
  impressions  INTEGER,
  likes        INTEGER,
  comments     INTEGER,
  shares       INTEGER,
  saves        INTEGER,
  clicks       INTEGER,
  video_views  INTEGER,
  engagements  INTEGER NOT NULL DEFAULT 0,   -- soma normalizada das interações
  raw          JSONB,
  PRIMARY KEY (post_id, collected_on)
);

-- Último snapshot de cada post.
CREATE VIEW post_metrics_latest AS
SELECT DISTINCT ON (post_id) *
FROM post_metrics
ORDER BY post_id, collected_on DESC;

-- Consolidado mensal por plataforma. Taxa de engajamento = engajamentos / alcance.
-- Seguidores: último valor do mês.
CREATE VIEW monthly_platform_summary AS
SELECT
  date_trunc('month', d.metric_date)::date AS month,
  a.platform,
  SUM(d.reach)       AS reach,
  SUM(d.impressions) AS impressions,
  SUM(d.engagements) AS engagements,
  ROUND(100.0 * SUM(d.engagements) / NULLIF(SUM(d.reach), 0), 2) AS engagement_rate_pct,
  (ARRAY_AGG(d.followers ORDER BY d.metric_date DESC) FILTER (WHERE d.followers IS NOT NULL))[1] AS followers_end
FROM account_daily_metrics d
JOIN social_accounts a ON a.id = d.account_id
GROUP BY 1, 2;

-- Ranking de conteúdos do mês (filtrar por mês e LIMIT 5 na consulta).
CREATE VIEW monthly_post_ranking AS
SELECT
  date_trunc('month', p.published_at)::date AS month,
  a.platform,
  p.id AS post_id,
  p.title_or_caption, p.permalink, p.content_type, p.published_at,
  m.reach, m.impressions, m.engagements,
  ROUND(100.0 * m.engagements / NULLIF(m.reach, 0), 2) AS engagement_rate_pct
FROM posts p
JOIN social_accounts a ON a.id = p.account_id
JOIN post_metrics_latest m ON m.post_id = p.id;

-- Módulo qualitativo: único campo de entrada manual do sistema (texto, não métricas).
CREATE TABLE monthly_notes (
  month        DATE PRIMARY KEY CHECK (month = date_trunc('month', month)::date),
  learnings    TEXT NOT NULL DEFAULT '',     -- Aprendizados do Mês
  action_plan  TEXT NOT NULL DEFAULT '',     -- Plano de Ação
  updated_by   TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Log dos jobs de coleta (observabilidade e retry).
CREATE TABLE sync_runs (
  id          BIGSERIAL PRIMARY KEY,
  account_id  BIGINT REFERENCES social_accounts(id) ON DELETE SET NULL,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status      sync_status_t NOT NULL DEFAULT 'running',
  rows_written INTEGER NOT NULL DEFAULT 0,
  error       TEXT
);

-- Permissões: a app web só lê métricas; só o worker de sincronização escreve.
-- CREATE ROLE app_web LOGIN;  CREATE ROLE sync_worker LOGIN;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_web;
-- GRANT INSERT, UPDATE, DELETE ON monthly_notes TO app_web;
-- GRANT INSERT, UPDATE, SELECT ON social_accounts, account_daily_metrics, posts, post_metrics, sync_runs TO sync_worker;
