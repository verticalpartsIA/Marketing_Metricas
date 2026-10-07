# Dashboard de Redes Sociais · Vertical Parts

Dashboard de **Marketing Analytics** para acompanhar, mês a mês, o desempenho da marca em cinco redes sociais (Instagram, LinkedIn, Facebook, TikTok e YouTube). Reúne KPIs consolidados, gráficos comparativos, base de conteúdos editável, análise qualitativa e plano de ação, com exportação para **Excel** e **PDF**.

É uma aplicação **100% front-end em um único arquivo** (`index.html`): sem build, sem servidor e sem dependências para instalar. Os dados ficam salvos no próprio navegador.

---

## Sumário

1. [Visão geral](#visão-geral)
2. [Como executar](#como-executar)
3. [Estrutura da interface](#estrutura-da-interface)
4. [Modelo de dados](#modelo-de-dados)
5. [Métricas e fórmulas](#métricas-e-fórmulas)
6. [Fluxo de trabalho mensal](#fluxo-de-trabalho-mensal)
7. [Exportação](#exportação)
8. [Integrações com APIs](#integrações-com-apis)
9. [Persistência (localStorage)](#persistência-localstorage)
10. [Tecnologias](#tecnologias)
11. [Identidade visual e tema](#identidade-visual-e-tema)
12. [Estrutura do código](#estrutura-do-código)
13. [Limitações conhecidas e segurança](#limitações-conhecidas-e-segurança)
14. [Roadmap sugerido](#roadmap-sugerido)

---

## Visão geral

| Item | Descrição |
|---|---|
| **Nome** | Dashboard de Redes Sociais · Vertical Parts |
| **Idioma / locale** | Português do Brasil (`pt-BR`), números formatados com `Intl.NumberFormat('pt-BR')` |
| **Plataformas** | Instagram, LinkedIn, Facebook, TikTok, YouTube |
| **Granularidade** | Mensal (cada mês tem sua própria base de conteúdos, análise e plano) |
| **Entrada de dados** | Manual (tabelas editáveis) · coleta via API prevista, ainda simulada |
| **Saídas** | Painéis interativos, planilha `.xlsx` formatada e relatório imprimível/PDF |
| **Armazenamento** | `localStorage` do navegador |

**O que ele resolve:** substitui planilhas soltas por um painel único onde o time cadastra os posts do mês, vê os resultados consolidados com variação em relação ao mês anterior, registra aprendizados e define as ações do mês seguinte.

---

## Como executar

Não há instalação.

1. Salve o arquivo como `index.html`.
2. Abra no navegador (duplo clique) **ou** sirva por um servidor estático:

```bash
# opção 1: Python
python3 -m http.server 8080

# opção 2: Node
npx serve .
```

3. Acesse `http://localhost:8080`.

**Requisitos**

- Navegador moderno (Chrome, Edge, Firefox ou Safari atuais).
- **Conexão com a internet** para carregar duas bibliotecas externas: a fonte *Poppins* (Google Fonts) e o *ExcelJS* (cdnjs). Sem internet o painel funciona, mas a exportação para Excel e a fonte customizada não.
- *Pop-ups* liberados para o site, pois o relatório PDF abre em uma nova janela.

---

## Estrutura da interface

### Cabeçalho (fixo no topo)

- **Seletor de mês**: alterna entre os períodos disponíveis.
- **Botão `+`**: abre o modal para criar um novo mês (mês + ano de 2026 a 2100).
- **Alternar tema**: claro / escuro.
- **Excel**: baixa a planilha do mês atual.
- **Relatório PDF**: abre o relatório do mês em nova janela e dispara a impressão.

### Abas

| Aba | Conteúdo |
|---|---|
| **Dashboards & Analytics** | Visão consolidada de todas as plataformas |
| **Instagram / LinkedIn / Facebook / TikTok / YouTube** | KPIs da plataforma + base de conteúdos editável |
| **Integrações** | Credenciais de API, automação e log de sincronização |
| **Análise Mensal** | 6 perguntas qualitativas + tabela de desempenho por formato |
| **Plano de Ação** | Ações do próximo mês com hipótese, KPI e status |

### Aba "Dashboards & Analytics"

- **Performance Consolidada** (5 KPIs): Alcance Total, Engajamentos, Novos Seguidores, Posts Publicados e CTR Médio, cada um com variação percentual vs. mês anterior.
- **Alcance por Plataforma**: gráfico de barras com tooltip no hover.
- **Distribuição de Engajamento**: gráfico de rosca (donut) com legenda.
- **Taxa de Engajamento**: barras horizontais comparando as plataformas.
- **Top 5 Conteúdos**: os cinco posts com maior engajamento total entre todas as plataformas (tooltip mostra plataforma, formato e pilar).
- **Heatmap de Desempenho**: cruzamento *formato × plataforma*, com intensidade de cor proporcional ao engajamento e tooltip com nº de posts, média e total.
- **Minipainéis**: Novos Seguidores, Total de Posts e CTR Médio por plataforma (com total e variação).

### Abas de plataforma

Cada uma traz **4 KPIs do mês** e a **Base de Conteúdos**, uma tabela em que cada célula é editável diretamente (`contenteditable`). Use **+ Adicionar Linha** para incluir um post e o botão **×** para remover.

| Plataforma | KPIs exibidos | Campos de métrica por post |
|---|---|---|
| **Instagram** | Alcance, Engajamentos, Taxa de Engajamento, Novos Seguidores | Alcance, Impressões, Visualizações, Curtidas, Comentários, Compartilhamentos, Salvamentos, Visitas, Cliques, Novos Seg. |
| **LinkedIn** | Impressões, Engajamentos, Taxa de Engajamento, Novos Seguidores | Impressões, Membros Alcançados, Reações, Comentários, Reposts, Cliques, Novos Seg. |
| **Facebook** | Alcance, Engajamentos, Taxa de Engajamento, Novos Seguidores | Alcance, Impressões, Reações, Comentários, Compartilhamentos, Cliques, Novos Seg. |
| **TikTok** | Visualizações, Curtidas, Comentários, Novos Seguidores | Visualizações, Curtidas, Comentários, Compartilhamentos, Salvamentos, Novos Seg. |
| **YouTube** | Visualizações, Curtidas, Horas Assistidas, Novos Inscritos | Visualizações, Curtidas, Comentários, Compartilhamentos, Horas Assistidas, Novos Inscritos |

Todas as plataformas compartilham as colunas descritivas: **Data, Título/Assunto, Link, Formato, Pilar, Objetivo e Tipo**.

### Aba "Análise Mensal"

- **6 perguntas guiadas** (textarea com salvamento automático):
  1. O que funcionou muito bem?
  2. O que não funcionou como esperado?
  3. Qual padrão percebemos na audiência?
  4. Qual nova hipótese queremos testar?
  5. O que devemos REPETIR no próximo mês?
  6. O que devemos REDUZIR ou ABANDONAR?
- **Desempenho por Formato (Médias)**: tabela de apoio com Reel/Vídeo, Carrossel, Imagem, Story e Artigo (nº de posts, alcance médio, engajamento médio, taxa e cliques).

### Aba "Plano de Ação"

Tabela com: **Aprendizado Analisado, Ação Prática, Plataforma, Formato, Pilar, Hipótese, KPI e Status**. Use **+ Adicionar Ação** para incluir linhas.

### Listas de opções (dropdowns)

| Campo | Valores |
|---|---|
| Formato | Reel, Carrossel, Imagem, Artigo, Story, Vídeo Curto, Vídeo Longo, Live, Podcast |
| Pilar | Produto, Autoridade, Educação, Entretenimento, Comunidade, Vendas |
| Objetivo | Branding, Engajamento, Vendas, Tráfego, Autoridade, Comunidade |
| Tipo | Orgânico, Pago, Híbrido |
| Status (plano) | Planejado, Em andamento, Concluído, Cancelado, Pausado |
| Plataforma (plano) | Instagram, LinkedIn, Facebook, TikTok, YouTube |

---

## Modelo de dados

Cada mês é um objeto com três partes:

```jsonc
{
  "content": {                       // base de conteúdos por plataforma
    "instagram": [
      {
        "data": "05/08/2026", "titulo": "Lançamento nova linha",
        "link": "", "formato": "Reel", "pilar": "Produto",
        "objetivo": "Vendas", "tipo": "Org",
        "alcance": 45200, "impressoes": 58300, "visualizacoes": 42100,
        "curtidas": 3850, "comentarios": 287, "compartilhamentos": 412,
        "salvamentos": 890, "visitas": 2340, "cliques": 1250, "novosSeg": 342
      }
    ],
    "linkedin": [], "facebook": [], "tiktok": [], "youtube": []
  },
  "plan": [                          // plano de ação
    {
      "aprendizado": "...", "acao": "...", "plataforma": "Instagram",
      "formato": "Reel", "pilar": "Produto", "hipotese": "...",
      "kpi": "Taxa de engajamento", "status": "Em andamento"
    }
  ],
  "qual": { "0": "texto da pergunta 1", "1": "...", "5": "..." }   // índice = pergunta
}
```

**Identificador de mês:** `AAAA-MM` (ex.: `2026-08`); o rótulo exibido é `Agosto/26`.

**Dados de exemplo:** o arquivo já inclui dados de demonstração (`DEFAULT_DATA`) para **julho, agosto e setembro de 2026**, usados enquanto não houver dados salvos para o mês. O mês aberto por padrão é `2026-08`. Meses criados pelo usuário começam vazios.

---

## Métricas e fórmulas

Calculadas em `calcPlatformMetrics()`.

| Plataforma | "Alcance" usado | Engajamento |
|---|---|---|
| Instagram | `alcance` | curtidas + comentários + compartilhamentos + salvamentos |
| LinkedIn | `impressoes` | reações + comentários + reposts |
| Facebook | `alcance` | reações + comentários + compartilhamentos |
| TikTok | `visualizacoes` | curtidas + comentários + compartilhamentos |
| YouTube | `visualizacoes` | curtidas + comentários + compartilhamentos |

```
Taxa de Engajamento = Engajamento ÷ Alcance × 100
CTR                 = Cliques ÷ Alcance × 100
Variação (%)        = (Atual − Anterior) ÷ Anterior × 100
```

Observações importantes:

- **Novos seguidores** vêm de `novosSeg` (no YouTube, `novosInscritos`).
- **TikTok e YouTube não têm cliques** no modelo, então o CTR é 0 nessas plataformas.
- **Alcance consolidado mistura métricas diferentes** (alcance, impressões e visualizações). Use-o como indicador de volume, não como número de pessoas únicas.
- **Variação vs. mês anterior:** compara com o mês imediatamente anterior *na lista de meses cadastrados* (ordenada). Se não existir mês anterior ou o valor anterior for zero, aparece "—" em vez de percentual.
- Valores não numéricos ou vazios são tratados como `0`.

---

## Fluxo de trabalho mensal

1. **Criar o mês** pelo botão `+` (ou selecionar um existente).
2. **Cadastrar os posts** em cada aba de plataforma, preenchendo as métricas diretamente nas células.
3. **Conferir os KPIs** (atualizam em tempo real a cada edição) e o painel consolidado.
4. **Preencher a Análise Mensal** com os aprendizados do período.
5. **Montar o Plano de Ação** do mês seguinte, ligando cada ação a um aprendizado, hipótese e KPI.
6. **Exportar** o Excel e/ou o PDF para compartilhar com a liderança.

Todo o conteúdo é **salvo automaticamente** a cada alteração (um aviso "✓ Salvo automaticamente" aparece no canto da tela).

---

## Exportação

### Excel (`.xlsx`)

Gerado com **ExcelJS**, com identidade visual da marca (banner escuro, faixa amarela, linhas zebradas, logo embutido, painéis congelados).

- **Arquivo:** `dashboard_vertical_parts_AAAA-MM.xlsx`
- **Abas:** `Resumo` · `Instagram` · `LinkedIn` · `Facebook` · `TikTok` · `YouTube` · `Plano de Ação` · `Análise Qualitativa`
- Exporta **apenas o mês selecionado**.

### Relatório PDF

Abre uma nova janela com o relatório do mês formatado e aciona a impressão do navegador; escolha **"Salvar como PDF"** como destino.

- Inclui resumo consolidado, Top 5, seção por plataforma (KPIs + até **15 posts** por plataforma), plano de ação e análise qualitativa.
- O CSS de impressão remove tooltips e libera a rolagem das tabelas.

---

## Integrações com APIs

A aba **Integrações** prepara a coleta automática de métricas, mas **hoje é apenas a camada de interface**.

| Plataforma | API | Campos de credencial |
|---|---|---|
| Instagram | Meta Graph API (Instagram Business) | Access Token, Account ID, App ID (opcional) |
| LinkedIn | LinkedIn Marketing Developer Platform | Client ID, Client Secret, Access Token, Organization ID |
| Facebook | Meta Graph API (Pages) | Page Access Token, Page ID, App ID |
| TikTok | TikTok for Business API | Client Key, Client Secret, Access Token, Advertiser ID |
| YouTube | YouTube Data API v3 | API Key, Client ID, Client Secret, Channel ID |

Recursos da tela:

- **Selo de status** por plataforma: *Configurado* (algum campo preenchido) ou *Pendente*.
- **Testar Conexão**, **Sincronizar** e **Limpar** credenciais.
- **Coleta automática** por plataforma e **chave global de automação**.
- **Log de sincronização** com os 5 eventos mais recentes.
- Link para a documentação oficial de cada API.

> **Estado atual:** "Testar Conexão" e "Sincronizar" são **simulados** (atraso fictício de 1,5 s). O log registra "Aguardando implementação do backend" e nenhuma requisição real é feita. Os dados continuam sendo inseridos manualmente.

---

## Persistência (localStorage)

| Chave | Conteúdo |
|---|---|
| `vp_data_AAAA-MM` | Conteúdos, plano e análise de cada mês |
| `vp_months` | Lista de meses cadastrados |
| `vp_theme` | `light` ou `dark` |
| `vp_integrations` | Credenciais e configurações das integrações |
| `vp_auto_enabled` | Estado da automação global |

Consequências práticas:

- Os dados ficam **somente neste navegador e neste dispositivo**. Limpar os dados do site, usar aba anônima ou trocar de computador faz o histórico "sumir".
- **Não há sincronização entre usuários.** Cada pessoa vê apenas o que cadastrou.
- Para **zerar** os dados salvos: DevTools → *Application* → *Local Storage* → apagar as chaves `vp_*`.
- **Backup:** use a exportação para Excel periodicamente, pois não existe importação de volta.

---

## Tecnologias

| Tecnologia | Uso |
|---|---|
| HTML5 + CSS3 (variáveis, Grid, Flexbox) | Estrutura, layout responsivo e temas |
| JavaScript (vanilla, ES6+) | Toda a lógica, sem frameworks |
| [ExcelJS 4.4.0](https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js) | Geração do `.xlsx` |
| Google Fonts · Poppins (300–800) | Tipografia |
| SVG inline | Ícones e gráfico de rosca |
| `localStorage` | Persistência |

Os gráficos (barras, barras horizontais, rosca, heatmap) são desenhados com HTML/CSS/SVG puro, **sem biblioteca de gráficos**.

---

## Identidade visual e tema

Paleta baseada na marca Vertical Parts:

| Token | Cor | Uso |
|---|---|---|
| `--y` | `#FFCE00` | Amarelo da marca (destaques, botões, aba ativa) |
| `--y-dark` | `#E6B800` | Hover e variações do amarelo |
| `--d1` | `#1E1E1E` | Cabeçalho e textos sobre amarelo |
| `--up` | `#7FB3A0` | Variação positiva |
| `--down` | `#E8A0A0` | Variação negativa |

Cores por plataforma (gráficos e Excel): Instagram `#E8A0BF`, LinkedIn `#7FB3D5`, Facebook `#A8C8EC`, TikTok `#C9A0DC`, YouTube `#FF4D4D`.

O **tema escuro** é aplicado via atributo `data-theme="dark"` no `<html>`, redefinindo as variáveis CSS, e a escolha é lembrada entre sessões. O layout é **responsivo** (ajustes em 1024 px e 768 px) e as abas e o cabeçalho ficam fixos ao rolar.

---

## Estrutura do código

Tudo está em um único `index.html`, dividido em blocos:

```
index.html
├── <style>            Variáveis CSS, componentes, temas, @media print/responsivo
├── <header>           Logo (base64), título, seletor de mês, ações
├── <main>
│   ├── .tabs          Navegação por abas
│   └── .panel × 9     analytics, 5 plataformas, integrations, analysis, action
├── Modal "Adicionar Novo Mês"
└── <script>
    ├── INTEGRATIONS_CONFIG + renderIntegrations / handleIntegrationAction / addSyncLog
    ├── Sistema de tooltips (data-tooltip e textos truncados)
    ├── Tema (vp_theme) e navegação por abas
    ├── Helpers (nf, pc, esc, calcVariation, formatVariation)
    ├── META (listas de opções) e PLATFORM_COLS (colunas por plataforma)
    ├── Meses (availableMonths, getMonthLabel) e DEFAULT_DATA
    ├── Persistência (loadMonthData, saveCurrentMonth, saveMonths, getMonthData)
    ├── Métricas (calcPlatformMetrics, updatePlatformKPIs, updateAnalytics)
    ├── Tabelas (initContentTables, renderContentTable, addContentRow, plano, análise)
    ├── buildWorkbook()  → exportação Excel
    └── Handler do botão PDF → relatório imprimível
```

**Funções-chave**

| Função | Responsabilidade |
|---|---|
| `loadMonthData(month)` | Carrega do `localStorage` ou dos dados de exemplo |
| `calcPlatformMetrics(platform, data)` | Calcula alcance, engajamento, seguidores, cliques, taxa e CTR |
| `updatePlatformKPIs(platform)` | Atualiza os cards de KPI da aba da plataforma |
| `updateAnalytics()` | Redesenha todo o painel consolidado |
| `buildWorkbook()` | Monta o `.xlsx` com ExcelJS |

**Como adicionar uma nova plataforma:** (1) acrescentar as colunas em `PLATFORM_COLS`, (2) a cor em `PLATFORM_COLORS` e o nome em `META.platforms`, (3) a regra de alcance/engajamento em `calcPlatformMetrics`, (4) o KPI em `updatePlatformKPIs`, (5) a aba e o painel no HTML, (6) a entrada em `INTEGRATIONS_CONFIG`, e (7) os mapeamentos usados em `updateAnalytics`, no PDF e no Excel.

---

## Limitações conhecidas e segurança

**Segurança**

- ⚠️ **As credenciais de API ficam em texto puro no `localStorage`.** Qualquer pessoa com acesso ao navegador, ou um script malicioso, pode lê-las. Não insira tokens de produção enquanto não houver backend. Quando a integração real for implementada, os tokens devem ficar no servidor (cofre de segredos / variáveis de ambiente) e nunca no front-end.
- Os campos `Client Secret` usam `type="password"`, mas isso é só mascaramento visual.
- O conteúdo digitado é escapado (`esc()`) antes de ser renderizado nas tabelas e no relatório, o que reduz risco de injeção de HTML.

**Funcionais**

- Integrações **simuladas**: não coletam dados reais.
- **Sem importação** (CSV/Excel) e **sem backup automático**.
- **Dados locais por navegador**, sem multiusuário.
- A tabela **"Desempenho por Formato (Médias)"** da aba Análise Mensal é de preenchimento manual: não é calculada a partir dos posts e, pelo código atual, **não é salva** entre sessões. O **Heatmap** do painel principal, esse sim, é calculado automaticamente.
- O campo **Tipo** aceita os valores do dropdown (*Orgânico, Pago, Híbrido*), mas os dados de exemplo usam `Org`/`Pago`, então há uma pequena inconsistência de rótulo.
- Os dados de exemplo (jul–set/2026) são fictícios e devem ser removidos ou substituídos antes do uso real.
- A exportação do Excel e a fonte dependem de CDN (precisam de internet).
- O relatório PDF depende de *pop-ups* liberados e do diálogo de impressão do navegador.
- O CTR consolidado não considera TikTok e YouTube (sem cliques no modelo).

---

## Roadmap sugerido

- [ ] Backend para guardar dados e credenciais com segurança (multiusuário)
- [ ] Implementar a coleta real via Meta Graph, LinkedIn, TikTok e YouTube APIs, com renovação de tokens
- [ ] Importação de CSV/Excel e backup/restauração em JSON
- [ ] Calcular automaticamente a tabela de desempenho por formato
- [ ] Comparativo entre períodos (trimestre, ano) e gráficos de evolução histórica
- [ ] Metas por KPI com alertas de desvio
- [ ] Geração de PDF direta (sem depender do diálogo de impressão)
- [ ] Empacotar a biblioteca ExcelJS localmente para uso offline
- [ ] Dividir o arquivo em HTML, CSS e JS separados para facilitar a manutenção

---

© Vertical Parts · Dashboard de Marketing
