// assets/js/report.js
import { globalState } from './state.js';

export async function generateFullPDF() {
  const btn = document.getElementById('btnGeneratePdf');
  const originalText = btn ? btn.innerHTML : '';
  
  if (btn) {
    btn.innerHTML = '⏳ Processando Páginas...';
    btn.style.opacity = '0.6';
  }

  try {
    const element = document.createElement('div');
    element.style.padding = '10px';
    element.style.color = '#2A1005';
    element.style.fontFamily = 'Source Sans 3, sans-serif';

    // --- 1. CABEÇALHO (PÁGINA 1) ---
    element.innerHTML = `
      <div style="font-family: 'Source Sans 3', sans-serif; margin-bottom: 35px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="margin: 0; font-family: 'Playfair Display', serif; font-size: 2.4rem; color: #8B1A1A; letter-spacing: 0.5px;">DataAves</h1>
          <h2 style="margin: 5px 0 15px 0; font-size: 1.05rem; color: #C8540A; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">Relatório de Análise Exploratória</h2>
          <p style="margin: 0; font-size: 1rem; color: #2A1005;"><strong>GEAVES</strong> – Grupo de Estudos em Avicultura (UFRPE)</p>
          <p style="margin: 4px 0 0 0; font-size: 0.9rem; color: #6B3A1F; font-style: italic;">Desenvolvido por Dr. Marcos Santos</p>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background-color: #FDF6EC; border-top: 2px solid #8B1A1A; border-bottom: 2px solid #8B1A1A; border-radius: 4px;">
          <span style="font-size: 0.95rem; color: #2A1005;">
            <strong>Aba analisada:</strong> 
            <span style="background: #E8900A; color: #fff; padding: 3px 10px; border-radius: 12px; font-size: 0.85rem; font-weight: 700; margin-left: 5px;">${globalState.activeSheet}</span>
          </span>
          <span style="font-size: 0.95rem; color: #2A1005;">
            <strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>
    `;

    // --- 2. SEÇÃO DE ESTATÍSTICA (UMA VARIÁVEL POR PÁGINA) ---
    element.innerHTML += '<h2 style="border-left: 5px solid #E8900A; padding-left: 10px; color: #8B1A1A; margin-bottom: 20px;">1. Estatística Descritiva</h2>';
    
    // Buscamos cada bloco de variável gerado na aba estatística
    const statsSections = document.querySelectorAll('#descContent .desc-section');
    
    if (statsSections.length > 0) {
      statsSections.forEach((section, index) => {
        // Criamos um container para cada variável
        const varContainer = document.createElement('div');
        
        // A partir da segunda variável, forçamos a nova página
        if (index > 0) {
          varContainer.style.pageBreakBefore = 'always';
          varContainer.style.marginTop = '30px';
        }
        
        // Estilização para garantir que a tabela não quebre no meio
        varContainer.style.pageBreakInside = 'avoid';
        varContainer.innerHTML = `<div style="font-size: 0.72rem;">${section.innerHTML}</div>`;
        element.appendChild(varContainer);
      });
    } else {
      element.innerHTML += `<p style="color: #666; font-style: italic;">Dados estatísticos não gerados.</p>`;
    }

    // --- 3. SEÇÃO DE GRÁFICOS (UM GRÁFICO POR PÁGINA) ---
    // Forçamos uma nova página antes de começar a seção de gráficos
    const chartsHeader = document.createElement('div');
    chartsHeader.style.pageBreakBefore = 'always';
    chartsHeader.innerHTML = `
      <h2 style="text-align: center; font-size: 2.2rem; color: #8B1A1A; margin-top: 50px; margin-bottom: 40px; border-bottom: 4px solid #E8900A; padding-bottom: 10px; width: fit-content; margin-left: auto; margin-right: auto;">
        2. Análise Gráfica
      </h2>
    `;
    element.appendChild(chartsHeader);
    
    const chartDivs = document.querySelectorAll('.chart-card-body div[id^="chart_"]');
    
    if (chartDivs.length > 0) {
      for (let i = 0; i < chartDivs.length; i++) {
        // Pede ao Plotly para gerar a imagem
        const dataUrl = await window.Plotly.toImage(chartDivs[i], { 
          format: 'png', 
          width: 1000, 
          height: 600 
        });
        
        const chartWrapper = document.createElement('div');
        
        // Cada gráfico inicia em uma nova página
        chartWrapper.style.pageBreakBefore = 'always';
        chartWrapper.style.textAlign = 'center';
        chartWrapper.style.paddingTop = '20px';
        
        // Resgatamos o nome da variável para colocar um título em cima do gráfico no PDF
        const varName = chartDivs[i].id.replace('chart_', '').replace(/_/g, ' ');
        
        chartWrapper.innerHTML = `
          <h3 style="color: #6B3A1F; font-size: 1.1rem; margin-bottom: 15px; text-transform: uppercase;">Variável: ${varName}</h3>
          <img src="${dataUrl}" style="max-width: 100%; height: auto; border: 1px solid #eee; margin-bottom: 10px;" />
          <hr style="border: 0; border-top: 1px solid #f0f0f0; margin-top: 20px;">
        `;
        element.appendChild(chartWrapper);
      }
    } else {
      const aviso = document.createElement('p');
      aviso.style.color = '#666';
      aviso.style.fontStyle = 'italic';
      aviso.textContent = 'Nenhum gráfico visualizado para exportação.';
      element.appendChild(aviso);
    }

    // --- 4. CONFIGURAÇÃO FINAL DO PDF ---
    const opt = {
      margin: [15, 15, 15, 15], // Margens: topo, esquerda, fundo, direita
      filename: `Relatorio_DataAves_${globalState.activeSheet || 'GEAVES'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        letterRendering: true 
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    await window.html2pdf().set(opt).from(element).save();

  } catch (error) {
    console.error("Erro na geração do PDF:", error);
  } finally {
    if (btn) {
      btn.innerHTML = originalText;
      btn.style.opacity = '1';
    }
  }
}

window.generateFullPDF = generateFullPDF;