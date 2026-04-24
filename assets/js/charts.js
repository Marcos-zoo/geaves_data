// assets/js/charts.js
import { globalState, ID_COLS } from './state.js';

let chartType   = 'bar';    // 'bar' | 'line' | 'box' | 'violin'
let chartLayout = 'grid';   // 'grid' | 'single'
let errorType   = 'sd';     // 'sd' | 'se'
let perMode     = 'treatments'; // 'treatments' | 'periods'
let currentIdx  = 0;
let chartVars   = [];

const COLORS = ['#8B1A1A','#C8540A','#E8900A','#5A3E1B','#A0522D', '#D2691E','#6B3A1F','#CD853F','#B8860B','#8B4513'];

export function renderCharts() {
  const empty = document.getElementById('chartsEmpty');
  const main  = document.getElementById('chartsMain');
  
  if (!globalState.parsedData || !globalState.parsedData.length) {
    empty.style.display = 'flex'; main.style.display = 'none'; return;
  }
  
  empty.style.display = 'none'; main.style.display = 'block';

  const headers = Object.keys(globalState.parsedData[0]);
  chartVars = headers.filter(h => ID_COLS.indexOf(h.toUpperCase()) === -1);

  const perKey = headers.find(h => h.toUpperCase()==='PER');
  document.getElementById('perModeGroup').style.display = perKey ? 'flex' : 'none';

  refreshCharts();
}

function refreshCharts() {
  if (!globalState.parsedData || !chartVars.length) return;
  const grid = document.getElementById('chartsGrid');
  const nav  = document.getElementById('chartsNav');
  grid.innerHTML = '';

  const headers = Object.keys(globalState.parsedData[0]);
  const trKey   = headers.find(h => h.toUpperCase()==='TR') || 'TR';
  const perKey  = headers.find(h => h.toUpperCase()==='PER') || null;

  let tSet={}, treatments=[];
  globalState.parsedData.forEach(r => { if(!tSet[r[trKey]]){tSet[r[trKey]]=true;treatments.push(r[trKey]);} });
  treatments.sort((a,b) => a-b);

  let periods = [null];
  if (perKey) {
    let pSet={}; periods=[];
    globalState.parsedData.forEach(r => { if(!pSet[r[perKey]]){pSet[r[perKey]]=true;periods.push(r[perKey]);} });
    periods.sort((a,b) => a-b);
  }

  const varsToRender = chartLayout === 'single' ? [chartVars[currentIdx]] : chartVars;

  if (chartLayout === 'single') {
    grid.className = 'charts-grid single-mode';
    nav.style.display = 'flex';
    
    let optionsHtml = chartVars.map((v, i) => 
      `<option value="${i}" ${i === currentIdx ? 'selected' : ''}>${i + 1} / ${chartVars.length} — ${v}</option>`
    ).join('');

    document.getElementById('navInfo').innerHTML = `
      <select onchange="jumpToChart(this.value)" style="padding: 6px 12px; border-radius: 6px; border: 1.5px solid rgba(139,26,26,0.2); font-family: 'Source Sans 3', sans-serif; font-size: 0.95rem; font-weight: 600; color: var(--rust); background: #fdf9f5; cursor: pointer; outline: none; min-width: 200px; text-align: center;">
        ${optionsHtml}
      </select>
    `;
  } else {
    grid.className = 'charts-grid';
    nav.style.display = 'none';
  }

  varsToRender.forEach(varName => {
    const card = document.createElement('div');
    card.className = 'chart-card';
    const divId  = 'chart_' + varName.replace(/[^a-zA-Z0-9]/g,'_');
    const yMinId = 'ymin_' + divId;
    const yMaxId = 'ymax_' + divId;

    card.innerHTML = `
      <div class="chart-card-title">
        <span>${varName}</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <label style="font-size:0.68rem;opacity:0.85;">Y:</label>
          <input type="number" id="${yMinId}" placeholder="mín" class="card-axis-input" oninput="applyCardAxis('${divId}','${yMinId}','${yMaxId}')">
          <span style="font-size:0.75rem;opacity:0.7;">–</span>
          <input type="number" id="${yMaxId}" placeholder="máx" class="card-axis-input" oninput="applyCardAxis('${divId}','${yMinId}','${yMaxId}')">
          <button class="chart-dl-btn" onclick="downloadChart('${divId}','${varName}')">⬇ PNG</button>
        </div>
      </div>
      <div class="chart-card-body">
        <div id="${divId}" style="width:100%;height:${chartLayout==='single'?'500':'320'}px;"></div>
      </div>`;

    grid.appendChild(card);

    // ── GERAÇÃO DAS LINHAS (TRACES) ──
    let traces = [];
    if (chartType === 'box') {
      traces = buildDistributionTraces(varName, trKey, perKey, treatments, periods, 'box');
    } else if (chartType === 'violin') {
      traces = buildDistributionTraces(varName, trKey, perKey, treatments, periods, 'violin');
    } else if (perKey && perMode === 'periods') {
      traces = buildPeriodTraces(varName, trKey, perKey, treatments, periods);
    } else {
      traces = buildTreatmentTraces(varName, trKey, perKey, treatments, periods);
    }

    // ── CÁLCULO INTELIGENTE DE MÍNIMOS E MÁXIMOS (O Segredo dos 20%) ──
    let tMin = Infinity, tMax = -Infinity;
    traces.forEach(t => {
      if (!t.y) return;
      t.y.forEach((yVal, i) => {
        if (yVal === null) return;
        let yLow = yVal, yHigh = yVal;
        
        // Se tiver barra de erro, calcula o topo da barra para não cortar
        if (t.error_y && t.error_y.array && t.error_y.array[i]) {
            yHigh += t.error_y.array[i];
            if (chartType !== 'bar') yLow -= t.error_y.array[i];
        }
        
        if (yLow < tMin) tMin = yLow;
        if (yHigh > tMax) tMax = yHigh;
      });
    });
    
    // Tratamento de falhas (se todos os dados forem vazios ou iguais)
    if (tMin === Infinity) { tMin = 0; tMax = 1; }
    if (tMin === tMax) { tMin -= 1; tMax += 1; }

    // ── CRIAÇÃO DO LAYOUT COM O NOVO CÁLCULO ──
    let layout = buildPlotLayout(varName, treatments, periods, tMin, tMax);

    window.Plotly.newPlot(divId, traces, layout, {
      responsive: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d','select2d','autoScale2d']
    });

    // Mantém as caixinhas sincronizadas visualmente
    const globalMinVal = document.getElementById('yMin').value;
    const globalMaxVal = document.getElementById('yMax').value;
    if (globalMinVal !== "") document.getElementById(yMinId).value = globalMinVal;
    if (globalMaxVal !== "") document.getElementById(yMaxId).value = globalMaxVal;
  });
}


function getChartStats(values) {
  const n = values.length;
  if(!n) return {n:0, mean:null, sd:null, se:null};
  const sum = values.reduce((a,v)=>a+v,0);
  const mean = sum/n;
  const variance = n>1 ? values.reduce((a,v)=>a+Math.pow(v-mean,2),0)/(n-1) : 0;
  const sd = Math.sqrt(variance);
  return { n, mean, sd, se: n>1 ? sd/Math.sqrt(n) : 0 };
}

function buildTreatmentTraces(varName, trKey, perKey, treatments, periods) {
  const traces = [];
  const xLabels = treatments.map(String);
  const seriesList = perKey ? periods : [null];

  seriesList.forEach((per, pIdx) => {
    const rows = perKey ? globalState.parsedData.filter(r => String(r[perKey])===String(per)) : globalState.parsedData;
    let means=[], errors=[], ns=[];
    
    treatments.forEach(tr => {
      const vals = rows.filter(r => String(r[trKey])===String(tr)).map(r => r[varName]).filter(v => typeof v==='number');
      const st = getChartStats(vals);
      means.push(st.n ? st.mean : null);
      errors.push(st.n ? (errorType==='sd' ? st.sd : st.se) : null);
      ns.push(st.n);
    });

    const traceColor  = COLORS[pIdx % COLORS.length];
    const sName  = perKey ? 'Período ' + per : varName;
    const hoverT = xLabels.map((x,i) => `Trat: ${x}<br>Média: ${means[i]!==null?means[i].toFixed(4):'NA'}<br>${errorType==='sd'?'DP':'EP'}: ${errors[i]!==null?errors[i].toFixed(4):'NA'}<br>n: ${ns[i]}`);

    const barColor = perKey ? traceColor : treatments.map((_, i) => COLORS[i % COLORS.length]);
    const errColor = perKey ? traceColor : '#4A2A1A';

    if (chartType === 'bar') {
      traces.push({
        type: 'bar', name: sName, x: xLabels, y: means,
        error_y: { type:'data', array: errors, visible:true, color: errColor, thickness:2, width:8 },
        marker: { color: barColor, opacity: 0.88, line:{color:'rgba(0,0,0,0.15)',width:1} },
        hovertext: hoverT, hoverinfo: 'text',
        hoverlabel: { bgcolor: '#fff', bordercolor: traceColor, font:{color:'#2A1005'} }
      });
    } else {
      traces.push({
        type: 'scatter', mode: 'lines+markers', name: sName, x: xLabels, y: means,
        error_y: { type:'data', array: errors, visible:true, color: traceColor, thickness:2, width:8 },
        line: { color: traceColor, width:2.5 },
        marker: { color: traceColor, size:9, symbol:'circle', line:{color:'#fff',width:1.5} },
        hovertext: hoverT, hoverinfo: 'text'
      });
    }
  });
  if (traces.length) traces[0]._categoryarray = xLabels;
  return traces;
}

function buildPeriodTraces(varName, trKey, perKey, treatments, periods) {
  const traces = [];
  const xLabels = periods.map(String);

  treatments.forEach((tr, tIdx) => {
    const trRows = globalState.parsedData.filter(r => String(r[trKey])===String(tr));
    let means=[], errors=[], ns=[];

    periods.forEach(per => {
      const vals = trRows.filter(r => String(r[perKey])===String(per)).map(r => r[varName]).filter(v => typeof v==='number');
      const st = getChartStats(vals);
      means.push(st.n ? st.mean : null);
      errors.push(st.n ? (errorType==='sd' ? st.sd : st.se) : null);
      ns.push(st.n);
    });

    const color = COLORS[tIdx % COLORS.length];
    traces.push({
      type: chartType==='bar'?'bar':'scatter', mode: chartType==='bar'?'none':'lines+markers', name: 'Trat. '+tr,
      x: xLabels, y: means,
      error_y: {type:'data',array:errors,visible:true,color:color,thickness:2,width:6},
      marker: chartType==='bar' ? {color:color,opacity:0.85} : {color:color,size:8},
      line: chartType==='bar' ? undefined : {color:color,width:2.5}
    });
  });
  return traces;
}

function buildDistributionTraces(varName, trKey, perKey, treatments, periods, type) {
  const traces = [];
  const seriesList = perKey ? periods : [null];

  seriesList.forEach((per, pIdx) => {
    const rows = perKey ? globalState.parsedData.filter(r => String(r[perKey])===String(per)) : globalState.parsedData;

    treatments.forEach((tr, tIdx) => {
      const vals = rows.filter(r => String(r[trKey])===String(tr)).map(r => r[varName]).filter(v => typeof v==='number');
      if (!vals.length) return;

      const color = COLORS[(perKey ? pIdx : tIdx) % COLORS.length];
      const lbl   = perKey ? `T${tr} P${per}` : String(tr);

      let traceObj = {
        name: lbl, y: vals, x: vals.map(()=>lbl),
        marker: { color: color, size: 4, opacity: 0.7 },
        line: { color: color, width: 2 }
      };

      if (type === 'violin') {
        traceObj.type = 'violin';
        traceObj.box = { visible: true }; 
        traceObj.meanline = { visible: true };
        traceObj.points = 'all';
        traceObj.jitter = 0.3;
        traceObj.fillcolor = color.replace(')', ',0.15)').replace('rgb','rgba');
      } else {
        traceObj.type = 'box';
        traceObj.boxpoints = 'all';
        traceObj.jitter = 0.35;
        traceObj.fillcolor = color.replace(')', ',0.15)').replace('rgb','rgba');
      }

      traces.push(traceObj);
    });
  });
  return traces;
}

function buildPlotLayout(varName, treatments, periods, tMin, tMax) {
  const globalMinVal = document.getElementById('yMin').value;
  const globalMaxVal = document.getElementById('yMax').value;
  const isBoxOrViolin = chartType === 'box' || chartType === 'violin';
  const hasPer = document.getElementById('perModeGroup').style.display !== 'none';
  const xTitle = isBoxOrViolin ? '' : (perMode === 'periods' && hasPer ? 'Período' : 'Tratamento');

  const catArray = perMode === 'periods' && hasPer && periods ? periods.map(String) : treatments.map(String);

  // O SEGREDO DO 20%: Subtrai 20% do mínimo natural e soma 15% ao máximo
    let defaultMin = tMin - Math.abs(tMin) * 0.1;
    let defaultMax = tMax + Math.abs(tMax) * 0.05;

  // Se o usuário digitou só um, o outro continua sendo automático!
  let finalMin = (globalMinVal !== "" && !isNaN(parseFloat(globalMinVal))) ? parseFloat(globalMinVal) : defaultMin;
  let finalMax = (globalMaxVal !== "" && !isNaN(parseFloat(globalMaxVal))) ? parseFloat(globalMaxVal) : defaultMax;

  // Proteção: não deixar o mínimo ser maior que o máximo
  if (finalMin >= finalMax) finalMax = finalMin + 1;

  const layout = {
    margin: { l:56, r:20, t:18, b:60 },
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: '#fdf9f5',
    font: { family:'Source Sans 3, sans-serif', size:12, color:'#2A1005' },
    legend: { orientation:'h', y:-0.28, x:0.5, xanchor:'center' },
    xaxis: { type: 'category', categoryorder: 'array', categoryarray: catArray, title: { text: xTitle, standoff:10 } },
    yaxis: { title: { text: varName }, range: [finalMin, finalMax], autorange: false }
  };
  
  return layout;
}

// ══ EXPOSIÇÃO GLOBAL PARA OS BOTÕES DO HTML ══
window.setChartType = (type, btn) => {
  chartType = type;
  document.querySelectorAll('#chartTypeGroup .toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('errorBarGroup').style.display = (type === 'box' || type === 'violin') ? 'none' : 'flex';
  refreshCharts();
};

window.setLayout = (layout, btn) => {
  chartLayout = layout;
  document.querySelectorAll('#layoutGroup .toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentIdx = 0; refreshCharts();
};

window.setErrorType = (type, btn) => {
  errorType = type;
  document.querySelectorAll('#errorTypeGroup .toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  refreshCharts();
};

window.setPerMode = (mode, btn) => {
  perMode = mode;
  document.querySelectorAll('#perModeButtons .toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  refreshCharts();
};

window.jumpToChart = (idx) => {
  currentIdx = parseInt(idx, 10);
  refreshCharts();
};

window.navigateChart = (dir) => {
  currentIdx = Math.max(0, Math.min(chartVars.length - 1, currentIdx + dir));
  refreshCharts();
};

// ── AJUSTE INDEPENDENTE PARA OS CARTÕES INDIVIDUAIS ──
window.applyCardAxis = (divId, yMinId, yMaxId) => {
  const el = document.getElementById(divId);
  if (!el || !el.data) return;

  const yMinVal = document.getElementById(yMinId).value;
  const yMaxVal = document.getElementById(yMaxId).value;

  // Analisa os dados desenhados atualmente para saber a base caso o input esteja vazio
  let tMin = Infinity, tMax = -Infinity;
  el.data.forEach(t => {
      if (!t.y) return;
      t.y.forEach((yVal, i) => {
          if (yVal === null) return;
          let yLow = yVal, yHigh = yVal;
          if (t.error_y && t.error_y.array && t.error_y.array[i]) {
              yHigh += t.error_y.array[i];
              if (t.type !== 'bar') yLow -= t.error_y.array[i];
          }
          if (yLow < tMin) tMin = yLow;
          if (yHigh > tMax) tMax = yHigh;
      });
  });
  
  if (tMin === Infinity) { tMin = 0; tMax = 1; }
  if (tMin === tMax) { tMin -= 1; tMax += 1; }

 
  let defaultMin = tMin - Math.abs(tMin) * 0.30;
  let defaultMax = tMax + Math.abs(tMax) * 0.05;
  


  let finalMin = (yMinVal !== "" && !isNaN(parseFloat(yMinVal))) ? parseFloat(yMinVal) : defaultMin;
  let finalMax = (yMaxVal !== "" && !isNaN(parseFloat(yMaxVal))) ? parseFloat(yMaxVal) : defaultMax;

  if (finalMin >= finalMax) finalMax = finalMin + 1;

  window.Plotly.relayout(divId, {'yaxis.range': [finalMin, finalMax], 'yaxis.autorange': false});
};

window.propagateGlobalY = () => {
  const globalMin = document.getElementById('yMin').value;
  const globalMax = document.getElementById('yMax').value;

  chartVars.forEach(varName => {
    const divId = 'chart_' + varName.replace(/[^a-zA-Z0-9]/g,'_');
    const yMinEl = document.getElementById('ymin_'+divId);
    const yMaxEl = document.getElementById('ymax_'+divId);
    if (!yMinEl || !yMaxEl) return;
    
    yMinEl.value = globalMin;
    yMaxEl.value = globalMax;

    // Dispara a atualização para cada gráfico aceitando inputs independentes
    window.applyCardAxis(divId, 'ymin_'+divId, 'ymax_'+divId);
  });
};

window.downloadChart = (divId, varName) => {
  window.Plotly.downloadImage(document.getElementById(divId), { format:'png', filename: 'DataAves_'+varName, width:1200, height:700, scale:2 });
};

window.exportCurrentPNG = () => {
  const varName = chartLayout==='single' ? chartVars[currentIdx] : chartVars[0];
  window.downloadChart('chart_' + varName.replace(/[^a-zA-Z0-9]/g,'_'), varName);
};

window.exportAllPNG = () => {
  chartVars.forEach(varName => {
    const el = document.getElementById('chart_' + varName.replace(/[^a-zA-Z0-9]/g,'_'));
    if (el) window.Plotly.downloadImage(el, { format:'png', filename:'DataAves_'+varName, width:1200, height:700, scale:2 });
  });
};