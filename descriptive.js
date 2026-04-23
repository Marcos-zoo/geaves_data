/* ═══════════════════════════════════════════════════════════════
   DataAves – GEAVES/UFRPE
   js/descriptive.js — Estatística Descritiva
   Depende de: upload.js (variáveis globais parsedData, activeSheet)
   ═══════════════════════════════════════════════════════════════

   Fluxo:
     1. renderDescriptive() — ponto de entrada, chamado pela aba
     2. computeStats(values) — calcula n, média, mediana, DP, CV%, min, max
     3. buildTable(varName, statsByTR) — monta HTML da tabela por variável
     4. interpretCV(cv) — semáforo de homogeneidade
   ═══════════════════════════════════════════════════════════════ */

/* ── Colunas identificadoras — não são variáveis de resposta ─── */
const ID_COLS = ['TR', 'REP', 'PER'];

/* ═══════════════════════════════════════════════════════════════
   PONTO DE ENTRADA
   Chamado ao clicar na aba "Estatística" (tabs.js via switchTab)
   e também pelo botão "Calcular estatística" dentro da própria aba.
═══════════════════════════════════════════════════════════════ */
function renderDescriptive() {
  const container = document.getElementById('descContent');
  const empty     = document.getElementById('descEmpty');
  const banner    = document.getElementById('descBanner');

  /* Sem dados carregados */
  if (!parsedData || parsedData.length === 0) {
    empty.style.display     = 'flex';
    container.style.display = 'none';
    banner.style.display    = 'none';
    return;
  }

  empty.style.display     = 'none';
  container.style.display = 'block';

  const headers = Object.keys(parsedData[0]);
  const varCols = headers.filter(h => !ID_COLS.includes(h.toUpperCase()));
  const trKey   = headers.find(h => h.toUpperCase() === 'TR') || 'TR';
  const perKey  = headers.find(h => h.toUpperCase() === 'PER') || null;

  /* Detecta tratamentos e períodos únicos */
  const treatments = [...new Set(parsedData.map(r => r[trKey]))].sort((a, b) => a - b);
  const periods    = perKey
    ? [...new Set(parsedData.map(r => r[perKey]))].sort((a, b) => a - b)
    : [null];

  /* Banner de contexto */
  banner.style.display = 'block';
  banner.innerHTML = `
    <span class="desc-banner-icon">📐</span>
    <div>
      Aba <strong>"${activeSheet}"</strong> —
      <strong>${treatments.length}</strong> tratamento(s) ·
      <strong>${periods.filter(p => p !== null).length || '—'}</strong> período(s) ·
      <strong>${varCols.length}</strong> variável(is) de resposta ·
      <strong>${parsedData.length}</strong> linha(s)
    </div>`;

  /* Monta seção por variável de resposta */
  container.innerHTML = '';

  varCols.forEach(varName => {
    const section = document.createElement('div');
    section.className = 'desc-section';

    /* Cabeçalho da variável */
    section.innerHTML = `
      <div class="desc-var-header">
        <span class="desc-var-name">${varName}</span>
        <span class="desc-var-label">Estatística descritiva por tratamento${perKey ? ' e período' : ''}</span>
      </div>`;

    /* Para cada período, monta uma tabela */
    periods.forEach(per => {
      const perRows = perKey
        ? parsedData.filter(r => String(r[perKey]) === String(per))
        : parsedData;

      if (perKey && per !== null) {
        const perLabel = document.createElement('p');
        perLabel.className = 'desc-per-label';
        perLabel.textContent = `Período: ${per}`;
        section.appendChild(perLabel);
      }

      /* Estatísticas por tratamento para esta variável e período */
      const statsByTR = treatments.map(tr => {
        const rows   = perRows.filter(r => String(r[trKey]) === String(tr));
        const values = rows
          .map(r => r[varName])
          .filter(v => v !== 'NA' && v !== '' && v !== null && v !== undefined && typeof v === 'number');
        const naCount = rows.length - values.length;

        return { tr, stats: computeStats(values), naCount };
      });

      section.appendChild(buildTable(varName, statsByTR));
    });

    container.appendChild(section);
  });
}

/* ═══════════════════════════════════════════════════════════════
   COMPUTE STATS
   Calcula todas as estatísticas descritivas para um vetor numérico.
   Valores NA já foram filtrados antes de chamar esta função.
═══════════════════════════════════════════════════════════════ */
function computeStats(values) {
  const n = values.length;

  if (n === 0) {
    return { n: 0, mean: null, median: null, sd: null, cv: null, min: null, max: null, se: null };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum    = values.reduce((acc, v) => acc + v, 0);
  const mean   = sum / n;

  /* Mediana */
  const mid    = Math.floor(n / 2);
  const median = n % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;

  /* Desvio padrão amostral (n-1) */
  const variance = n > 1
    ? values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1)
    : 0;
  const sd = Math.sqrt(variance);

  /* Erro padrão da média */
  const se = n > 1 ? sd / Math.sqrt(n) : 0;

  /* Coeficiente de variação (%) */
  const cv = mean !== 0 ? (sd / Math.abs(mean)) * 100 : null;

  return {
    n,
    mean:   round(mean, 3),
    median: round(median, 3),
    sd:     round(sd, 3),
    se:     round(se, 3),
    cv:     cv !== null ? round(cv, 2) : null,
    min:    round(sorted[0], 3),
    max:    round(sorted[n - 1], 3),
  };
}

/* ═══════════════════════════════════════════════════════════════
   BUILD TABLE
   Monta o HTML da tabela de estatística descritiva para uma variável.
   Linhas = tratamentos | Colunas = n, Média, Mediana, DP, EP, CV%, Min, Max
═══════════════════════════════════════════════════════════════ */
function buildTable(varName, statsByTR) {
  const wrap = document.createElement('div');
  wrap.className = 'desc-table-wrap';

  let html = `
    <table class="desc-table">
      <thead>
        <tr>
          <th>Tratamento</th>
          <th>n</th>
          <th>Média</th>
          <th>Mediana</th>
          <th>DP</th>
          <th>EP</th>
          <th>CV (%)</th>
          <th>Mín</th>
          <th>Máx</th>
          <th>NA</th>
        </tr>
      </thead>
      <tbody>`;

  statsByTR.forEach(({ tr, stats, naCount }) => {
    const { n, mean, median, sd, se, cv, min, max } = stats;
    const cvClass = cv !== null ? interpretCV(cv).cls : '';
    const cvText  = cv !== null ? `<span class="cv-badge ${cvClass}">${cv.toFixed(2)}%</span>` : '—';

    html += `
      <tr>
        <td class="tr-cell">T${tr}</td>
        <td>${n}</td>
        <td>${n > 0 ? mean : '—'}</td>
        <td>${n > 0 ? median : '—'}</td>
        <td>${n > 0 ? sd : '—'}</td>
        <td>${n > 0 ? se : '—'}</td>
        <td>${cvText}</td>
        <td>${n > 0 ? min : '—'}</td>
        <td>${n > 0 ? max : '—'}</td>
        <td class="${naCount > 0 ? 'na-cell' : ''}">${naCount > 0 ? naCount : '0'}</td>
      </tr>`;
  });

  /* Linha de estatística GERAL (todos os tratamentos juntos) */
  const allValues = statsByTR.flatMap(({ stats }) =>
    stats.n > 0
      ? Array(stats.n).fill(null).map((_, i) => i) // placeholder — recalculamos abaixo
      : []
  );

  /* Recalcula global diretamente dos dados brutos */
  const globalValues = statsByTR.reduce((acc, { stats }) => {
    /* Não temos os valores originais aqui, mas temos n, mean, sd */
    /* Usamos método de combinação de grupos para mean global */
    return acc; // simplificado: linha GERAL calculada na próxima seção
  }, []);

  /* Linha GERAL usando média ponderada */
  const totalN = statsByTR.reduce((s, { stats }) => s + stats.n, 0);
  if (totalN > 0) {
    const globalMean = statsByTR.reduce((s, { stats }) =>
      s + (stats.n > 0 ? stats.mean * stats.n : 0), 0) / totalN;

    const globalMin = Math.min(...statsByTR.filter(x => x.stats.n > 0).map(x => x.stats.min));
    const globalMax = Math.max(...statsByTR.filter(x => x.stats.n > 0).map(x => x.stats.max));
    const totalNA   = statsByTR.reduce((s, { naCount }) => s + naCount, 0);

    /* DP combinado entre grupos (fórmula de pooling) */
    const pooledVar = statsByTR.reduce((s, { stats }) => {
      if (stats.n < 2) return s;
      return s + (stats.n - 1) * Math.pow(stats.sd, 2);
    }, 0) / Math.max(totalN - statsByTR.filter(x => x.stats.n > 0).length, 1);
    const pooledSD = Math.sqrt(pooledVar);
    const globalCV = globalMean !== 0 ? (pooledSD / Math.abs(globalMean)) * 100 : null;
    const cvClass  = globalCV !== null ? interpretCV(globalCV).cls : '';
    const cvText   = globalCV !== null
      ? `<span class="cv-badge ${cvClass}">${globalCV.toFixed(2)}%</span>`
      : '—';

    html += `
      <tr class="global-row">
        <td class="tr-cell">Geral</td>
        <td>${totalN}</td>
        <td>${round(globalMean, 3)}</td>
        <td>—</td>
        <td>${round(pooledSD, 3)}</td>
        <td>—</td>
        <td>${cvText}</td>
        <td>${round(globalMin, 3)}</td>
        <td>${round(globalMax, 3)}</td>
        <td class="${totalNA > 0 ? 'na-cell' : ''}">${totalNA}</td>
      </tr>`;
  }

  html += '</tbody></table>';
  wrap.innerHTML = html;
  return wrap;
}

/* ═══════════════════════════════════════════════════════════════
   INTERPRET CV
   Semáforo de homogeneidade baseado em Gomes (1990),
   referência clássica em experimentação agropecuária brasileira.

   CV < 10%  → baixo    (verde)
   10–20%    → médio    (amarelo)
   20–30%    → alto     (laranja)
   > 30%     → muito alto (vermelho)
═══════════════════════════════════════════════════════════════ */
function interpretCV(cv) {
  if (cv < 10)  return { cls: 'cv-low',     label: 'Baixo'      };
  if (cv < 20)  return { cls: 'cv-medium',  label: 'Médio'      };
  if (cv < 30)  return { cls: 'cv-high',    label: 'Alto'       };
                return { cls: 'cv-veryhigh',label: 'Muito alto' };
}

/* ── UTILITÁRIO ─────────────────────────────────────────────── */
function round(value, decimals) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return parseFloat(value.toFixed(decimals));
}
