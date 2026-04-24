/* ═══════════════════════════════════════════════════════════════
   DataAves – GEAVES/UFRPE
   js/upload.js — upload, seleção de aba, normalização decimal e UI
   Depende de: SheetJS (xlsx.full.min.js), validation.js
   ═══════════════════════════════════════════════════════════════ */

/* ── STATE ─────────────────────────────────────────────────────── */
let workbook    = null;  // objeto XLSX.read()
let activeSheet = null;  // nome da aba selecionada
let parsedData  = null;  // array de objetos [{TR, REP, ...}, ...]
let decimalMode = null;  // 'point' | 'comma' | 'mixed' | 'none'

/* ── INICIALIZAÇÃO ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const dropzone  = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');

  /* Clique na dropzone abre o seletor de arquivo */
  dropzone.addEventListener('click', () => fileInput.click());

  /* Drag & Drop */
  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('dz-hover');
  });

  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dz-hover'));

  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dz-hover');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  /* Input clássico */
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });
});

/* ═══════════════════════════════════════════════════════════════
   HANDLE FILE
   Lê o .xlsx, valida extensão e lista as abas disponíveis
═══════════════════════════════════════════════════════════════ */
function handleFile(file) {
  const extOk = /\.(xlsx|xls)$/i.test(file.name);

  if (!extOk) {
    showFileInfo('❌ Arquivo inválido. Envie um arquivo .xlsx ou .xls.', 'error');
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      workbook = XLSX.read(e.target.result, { type: 'array' });
      showFileInfo(
        `✔ <strong>${file.name}</strong> carregado — ${(file.size / 1024).toFixed(1)} KB`,
        'ok'
      );
      populateSheetButtons(workbook.SheetNames);
      resetResults();
    } catch (err) {
      showFileInfo('❌ Não foi possível ler o arquivo. Verifique se não está corrompido.', 'error');
    }
  };

  reader.readAsArrayBuffer(file);
}

/* ── UI: exibe info do arquivo ─────────────────────────────────── */
function showFileInfo(html, type) {
  const el = document.getElementById('fileInfo');
  el.innerHTML = html;
  el.className = 'file-info ' + type;
}

/* ═══════════════════════════════════════════════════════════════
   SHEET BUTTONS
   Cria um botão (pill) para cada aba do arquivo Excel.
   O usuário clica para escolher qual aba verificar.
═══════════════════════════════════════════════════════════════ */
function populateSheetButtons(names) {
  document.getElementById('sheetCount').textContent = names.length;

  const container = document.getElementById('sheetButtons');
  container.innerHTML = '';

  names.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'sheet-pill';
    btn.textContent = name;
    btn.title = `Verificar aba: ${name}`;
    btn.onclick = () => selectSheet(name, btn);
    container.appendChild(btn);
  });

  document.getElementById('sheetSection').style.display   = 'block';
  document.getElementById('decimalSection').style.display = 'none';
  document.getElementById('btnValidate').classList.add('hidden');

  activeSheet = null;
  parsedData  = null;
}

/* ═══════════════════════════════════════════════════════════════
   SELECT SHEET
   Carrega a aba escolhida, normaliza decimais e prepara UI
═══════════════════════════════════════════════════════════════ */
function selectSheet(name, btnEl) {
  /* Destaca o botão ativo */
  document.querySelectorAll('.sheet-pill').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');
  activeSheet = name;

  /* Lê como array de arrays com raw=false (texto puro, sem conversão numérica automática) */
  const ws  = workbook.Sheets[name];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

  if (raw.length < 2) {
    showDecimalSection('none');
    parsedData = null;
    document.getElementById('btnValidate').classList.add('hidden');
    return;
  }

  /* Normaliza decimais e converte para array de objetos */
  const result = normalizeDecimals(raw);
  decimalMode  = result.mode;
  parsedData   = result.data;

  showDecimalSection(decimalMode);
  document.getElementById('btnValidate').classList.remove('hidden');
  document.getElementById('btnReset').classList.add('hidden');
  resetResults();
}

/* ═══════════════════════════════════════════════════════════════
   NORMALIZE DECIMALS
   Detecta o separador decimal predominante e converte tudo
   para ponto antes de parseFloat(). O arquivo original não
   é alterado — a conversão ocorre apenas na memória.
═══════════════════════════════════════════════════════════════ */
function normalizeDecimals(raw) {
  let commaCount = 0;
  let pointCount = 0;

  /* 1ª passagem — contagem de padrões */
  for (let r = 1; r < raw.length; r++) {
    for (let c = 0; c < raw[r].length; c++) {
      const cell = String(raw[r][c]).trim();
      if (cell === '' || cell.toUpperCase() === 'NA') continue;
      if (/^\d+,\d+$/.test(cell)) commaCount++;
      if (/^\d+\.\d+$/.test(cell)) pointCount++;
    }
  }

  /* Determina modo */
  let mode = 'none';
  if      (commaCount > 0 && pointCount === 0) mode = 'comma';
  else if (pointCount > 0 && commaCount === 0) mode = 'point';
  else if (commaCount > 0 && pointCount > 0)   mode = 'mixed';

  /* 2ª passagem — monta objetos com valores normalizados */
  const headers = raw[0].map(h => String(h).trim());
  const data    = [];

  for (let r = 1; r < raw.length; r++) {
    const row = raw[r];

    /* Ignora linhas completamente vazias */
    if (row.every(c => String(c).trim() === '')) continue;

    const obj = {};
    headers.forEach((h, i) => {
      const cell = String(row[i] ?? '').trim();

      if (cell.toUpperCase() === 'NA') {
        obj[h] = 'NA';
      } else if (cell === '') {
        obj[h] = '';               // vazio — será detectado pela R5
      } else {
        /* Substitui vírgula por ponto para parseFloat */
        const normalized = cell.replace(',', '.');
        const num = parseFloat(normalized);
        obj[h] = isNaN(num) ? cell : num;
      }
    });

    data.push(obj);
  }

  return { mode, data };
}

/* ── UI: exibe o status do separador decimal ───────────────────── */
function showDecimalSection(mode) {
  const MESSAGES = {
    comma: { icon: '🔄', cls: 'dec-warn', text: 'Vírgula detectada como separador decimal. Convertido automaticamente para ponto.' },
    point: { icon: '✔',  cls: 'dec-ok',   text: 'Ponto decimal detectado. Nenhuma conversão necessária.' },
    mixed: { icon: '⚠️', cls: 'dec-err',  text: 'Mistura de vírgula e ponto detectada! Verifique a planilha — pode haver erro de digitação.' },
    none:  { icon: 'ℹ️', cls: 'dec-info', text: 'Nenhum número decimal encontrado nesta aba.' },
  };

  const m  = MESSAGES[mode] || MESSAGES.none;
  const el = document.getElementById('decimalInfo');
  el.className = 'decimal-badge ' + m.cls;
  el.innerHTML = `<span>${m.icon}</span> ${m.text}`;

  document.getElementById('decimalSection').style.display = 'block';
}

/* ═══════════════════════════════════════════════════════════════
   RUN VALIDATION (chamado pelo botão "Verificar dados")
═══════════════════════════════════════════════════════════════ */
function runValidationAndRender() {
  if (!parsedData || parsedData.length === 0) return;

  const headers         = Object.keys(parsedData[0]);
  const { checks, errors } = runValidation(parsedData, decimalMode);

  /* Adiciona verificação do nome da aba */
  addSheetNameCheck(checks, errors, activeSheet);

  renderResults(checks, errors, headers);

  document.getElementById('btnReset').classList.remove('hidden');
}

/* ═══════════════════════════════════════════════════════════════
   RENDER RESULTS
═══════════════════════════════════════════════════════════════ */
function renderResults(checks, errors, headers) {
  document.getElementById('resultsEmpty').style.display   = 'none';
  document.getElementById('resultsContent').style.display = 'block';

  const allOk = errors.length === 0;

  /* Banner de sumário */
  const banner = document.getElementById('summaryBanner');
  if (allOk) {
    banner.className = 'summary-banner banner-ok';
    banner.innerHTML = `
      <span class="banner-icon">🎉</span>
      <div>
        <strong>Dados aprovados!</strong> Todas as ${checks.length} regras GEAVES foram satisfeitas.
        A planilha está pronta para análise.
      </div>`;
  } else {
    const failedCount = checks.filter(c => !c.ok).length;
    banner.className = 'summary-banner banner-err';
    banner.innerHTML = `
      <span class="banner-icon">⚠️</span>
      <div>
        <strong>${errors.length} problema(s) encontrado(s)</strong> em ${failedCount} regra(s).
        Corrija os itens abaixo antes de prosseguir.
      </div>`;
  }

  /* Dimensões e nome da aba */
  document.getElementById('previewSheetName').textContent = activeSheet;
  document.getElementById('previewDimensions').textContent =
    `${parsedData.length} linha(s) × ${headers.length} coluna(s)  ·  aba: "${activeSheet}"`;

  /* Preview da tabela */
  renderPreviewTable(headers);

  /* Checklist */
  document.getElementById('checklistItems').innerHTML = checks.map(c => `
    <div class="check-item ${c.ok ? 'check-ok' : 'check-fail'}">
      <span class="check-icon">${c.ok ? '✔' : '✘'}</span>
      <div>
        <span class="check-label">${c.label}</span>
        ${c.detail ? `<span class="check-detail">${c.detail}</span>` : ''}
      </div>
    </div>`).join('');

  /* Detalhes de erros */
  const errorBlock = document.getElementById('errorDetails');
  if (errors.length) {
    errorBlock.style.display = 'block';
    document.getElementById('errorList').innerHTML = errors.map(e => `
      <div class="error-item">
        <span class="error-rule">${e.rule}</span>
        <span class="error-msg">${e.message}</span>
      </div>`).join('');
  } else {
    errorBlock.style.display = 'none';
  }
}

/* ═══════════════════════════════════════════════════════════════
   PREVIEW TABLE (primeiras 8 linhas)
═══════════════════════════════════════════════════════════════ */
function renderPreviewTable(headers) {
  const MAX_ROWS = 8;
  const rows     = parsedData.slice(0, MAX_ROWS);

  let html = '<table><thead><tr>' +
    headers.map(h => `<th>${h}</th>`).join('') +
    '</tr></thead><tbody>';

  rows.forEach(row => {
    html += '<tr>' + headers.map(h => {
      const v = row[h];
      if (v === 'NA')                         return '<td class="cell-na">NA</td>';
      if (v === '' || v === null || v === undefined) return '<td class="cell-empty">⚠ vazio</td>';
      return `<td>${v}</td>`;
    }).join('') + '</tr>';
  });

  if (parsedData.length > MAX_ROWS) {
    html += `<tr><td colspan="${headers.length}"
      style="text-align:center;color:var(--mid);font-style:italic;padding:10px;">
      … mais ${parsedData.length - MAX_ROWS} linha(s) não exibidas
    </td></tr>`;
  }

  html += '</tbody></table>';
  document.getElementById('previewTableWrap').innerHTML = html;
}

/* ═══════════════════════════════════════════════════════════════
   RESET
═══════════════════════════════════════════════════════════════ */
function resetResults() {
  document.getElementById('resultsEmpty').style.display   = 'flex';
  document.getElementById('resultsContent').style.display = 'none';
}

function resetUpload() {
  workbook = activeSheet = parsedData = decimalMode = null;

  document.getElementById('fileInput').value            = '';
  document.getElementById('fileInfo').className         = 'file-info hidden';
  document.getElementById('sheetSection').style.display  = 'none';
  document.getElementById('decimalSection').style.display = 'none';
  document.getElementById('btnValidate').classList.add('hidden');
  document.getElementById('btnReset').classList.add('hidden');

  resetResults();
}
