/* ═══════════════════════════════════════════════════════════════
   DataAves – GEAVES/UFRPE
   js/validation.js — regras de validação dos dados
   ═══════════════════════════════════════════════════════════════

   Exporta: runValidation(parsedData, decimalMode)
   Retorna: { checks: [], errors: [] }

   Para adicionar uma nova regra:
     1. Crie um bloco "── RN" seguindo o padrão abaixo
     2. Faça push em checks[] e errors[] conforme necessário
     3. Não é necessário alterar upload.js ou index.html
   ═══════════════════════════════════════════════════════════════ */

/**
 * Executa todas as regras GEAVES sobre os dados já normalizados.
 *
 * @param {Object[]} parsedData  - Array de objetos {coluna: valor, ...}
 * @param {string}   decimalMode - 'point' | 'comma' | 'mixed' | 'none'
 * @returns {{ checks: Array, errors: Array }}
 */
function runValidation(parsedData, decimalMode) {
  if (!parsedData || parsedData.length === 0) {
    return { checks: [], errors: [] };
  }

  const headers = Object.keys(parsedData[0]);
  const checks  = [];  // { label, ok, detail }
  const errors  = [];  // { rule, message }

  /* ── Colunas identificadoras ────────────────────────────────── */
  const ID_COLS = ['TR', 'REP', 'PER'];

  /* ════════════════════════════════════════════════════════════
     R1 — Colunas obrigatórias TR e REP
  ════════════════════════════════════════════════════════════ */
  const hasTR  = headers.some(h => h.toUpperCase() === 'TR');
  const hasREP = headers.some(h => h.toUpperCase() === 'REP');
  const r1ok   = hasTR && hasREP;

  checks.push({
    label: 'Colunas obrigatórias TR e REP presentes',
    ok: r1ok,
    detail: !hasTR && !hasREP ? 'TR e REP ausentes.'
          : !hasTR            ? 'Coluna TR ausente.'
          : !hasREP           ? 'Coluna REP ausente.'
          : null
  });

  if (!r1ok) {
    errors.push({ rule: 'Colunas obrigatórias', message: 'TR e/ou REP não encontradas nos cabeçalhos.' });
  }

  /* ════════════════════════════════════════════════════════════
     R2 — Sem símbolos proibidos nos cabeçalhos
  ════════════════════════════════════════════════════════════ */
  const SYMBOL_RX = /[%$*°@#!?&()/\\]/;
  const badSymbol = headers.filter(h => SYMBOL_RX.test(h));

  checks.push({
    label: 'Cabeçalhos sem símbolos proibidos (%, $, *, °…)',
    ok: badSymbol.length === 0,
    detail: badSymbol.length ? `Colunas com símbolo: ${badSymbol.join(', ')}` : null
  });

  if (badSymbol.length) {
    errors.push({ rule: 'Símbolos proibidos', message: badSymbol.join(', ') });
  }

  /* ════════════════════════════════════════════════════════════
     R3 — Sem espaços ou acentos nos cabeçalhos
  ════════════════════════════════════════════════════════════ */
  const ACCENT_RX = /[áéíóúãõâêîôûàäëïöüçÁÉÍÓÚÃÕÂÊÎÔÛÀÄËÏÖÜÇ]/;
  const SPACE_RX  = / /;
  const badFormat = headers.filter(h => ACCENT_RX.test(h) || SPACE_RX.test(h));

  checks.push({
    label: 'Cabeçalhos sem espaços ou acentos',
    ok: badFormat.length === 0,
    detail: badFormat.length ? `Colunas problemáticas: ${badFormat.join(', ')}` : null
  });

  if (badFormat.length) {
    errors.push({ rule: 'Espaços / acentos', message: badFormat.join(', ') });
  }

  /* ════════════════════════════════════════════════════════════
     R4 — Sem siglas duplicadas
  ════════════════════════════════════════════════════════════ */
  const seen = {}, dupes = [];
  headers.forEach(h => {
    const key = h.toUpperCase();
    if (seen[key]) dupes.push(h);
    seen[key] = true;
  });

  checks.push({
    label: 'Sem siglas duplicadas',
    ok: dupes.length === 0,
    detail: dupes.length ? `Duplicatas: ${dupes.join(', ')}` : null
  });

  if (dupes.length) {
    errors.push({ rule: 'Siglas duplicadas', message: dupes.join(', ') });
  }

  /* ════════════════════════════════════════════════════════════
     R5 — Sem células vazias (devem ser NA)
  ════════════════════════════════════════════════════════════ */
  const emptyRows = [];
  parsedData.forEach((row, i) => {
    const emptyCols = headers.filter(h => {
      const v = row[h];
      return v === '' || v === null || v === undefined;
    });
    if (emptyCols.length) emptyRows.push({ row: i + 2, cols: emptyCols });
  });

  checks.push({
    label: 'Sem células vazias — parcelas perdidas devem ser NA',
    ok: emptyRows.length === 0,
    detail: emptyRows.length
      ? `${emptyRows.length} linha(s) com célula vazia: ` +
        emptyRows.slice(0, 5).map(r => `linha ${r.row}`).join(', ') +
        (emptyRows.length > 5 ? '…' : '')
      : null
  });

  emptyRows.forEach(r => {
    errors.push({
      rule: 'Célula vazia',
      message: `Linha ${r.row}: colunas [${r.cols.join(', ')}] — use NA.`
    });
  });

  /* ════════════════════════════════════════════════════════════
     R6 — Variáveis de resposta numéricas ou NA
  ════════════════════════════════════════════════════════════ */
  const varCols   = headers.filter(h => !ID_COLS.includes(h.toUpperCase()));
  const nonNumRows = [];

  parsedData.forEach((row, i) => {
    varCols.forEach(col => {
      const v = row[col];
      if (v === 'NA' || v === '' || v === null || v === undefined) return;
      if (typeof v !== 'number') {
        nonNumRows.push({ row: i + 2, col, val: v });
      }
    });
  });

  checks.push({
    label: 'Variáveis de resposta numéricas (ou NA)',
    ok: nonNumRows.length === 0,
    detail: nonNumRows.length
      ? `${nonNumRows.length} célula(s) não-numérica(s): ` +
        nonNumRows.slice(0, 4).map(r => `linha ${r.row} / "${r.col}"="${r.val}"`).join('; ') +
        (nonNumRows.length > 4 ? '…' : '')
      : null
  });

  nonNumRows.slice(0, 20).forEach(r => {
    errors.push({
      rule: 'Valor não-numérico',
      message: `Linha ${r.row}, coluna "${r.col}": "${r.val}"`
    });
  });

  /* ════════════════════════════════════════════════════════════
     R7 — Separador decimal consistente
  ════════════════════════════════════════════════════════════ */
  checks.push({
    label: 'Separador decimal consistente (sem mistura vírgula/ponto)',
    ok: decimalMode !== 'mixed',
    detail: decimalMode === 'mixed'
      ? 'Foram encontradas células com vírgula E ponto como separador decimal. Padronize a planilha.'
      : null
  });

  if (decimalMode === 'mixed') {
    errors.push({ rule: 'Decimal misto', message: 'Mistura de vírgula e ponto detectada.' });
  }

  /* ════════════════════════════════════════════════════════════
     R8 — Nomes de abas válidos (sem acento, sem espaço, curtos)
         Verificado no upload.js via sheetName; aqui registramos
         o resultado passado como parâmetro opcional.
  ════════════════════════════════════════════════════════════ */
  // Esta regra é alimentada externamente por upload.js
  // via addSheetNameCheck(checks, errors, sheetName)

  return { checks, errors };
}

/**
 * Verifica o nome da aba selecionada e acrescenta o resultado
 * nos arrays checks/errors que já foram criados por runValidation.
 * Chamada em upload.js antes de renderizar.
 *
 * @param {Array}  checks    - array de checks retornado por runValidation
 * @param {Array}  errors    - array de errors retornado por runValidation
 * @param {string} sheetName - nome da aba selecionada no Excel
 */
function addSheetNameCheck(checks, errors, sheetName) {
  const ACCENT_RX = /[áéíóúãõâêîôûàäëïöüçÁÉÍÓÚÃÕÂÊÎÔÛÀÄËÏÖÜÇ]/;
  const SPACE_RX  = / /;
  const tooLong   = sheetName.length > 20;
  const hasAccent = ACCENT_RX.test(sheetName);
  const hasSpace  = SPACE_RX.test(sheetName);
  const ok = !tooLong && !hasAccent && !hasSpace;

  let detail = null;
  if (!ok) {
    const reasons = [];
    if (hasAccent) reasons.push('contém acento');
    if (hasSpace)  reasons.push('contém espaço');
    if (tooLong)   reasons.push(`nome longo (${sheetName.length} chars, máx 20)`);
    detail = `Aba "${sheetName}": ${reasons.join(', ')}.`;
  }

  checks.push({
    label: 'Nome da aba sem acento, espaço ou tamanho excessivo',
    ok,
    detail
  });

  if (!ok) {
    errors.push({ rule: 'Nome de aba', message: detail });
  }
}
