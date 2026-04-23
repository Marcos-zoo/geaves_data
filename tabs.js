/* ═══════════════════════════════════════════════════════════════
   DataAves – GEAVES/UFRPE
   js/tabs.js — controle de navegação entre abas
   ═══════════════════════════════════════════════════════════════ */

/**
 * Ativa a aba indicada por tabId e marca o botão correspondente.
 * Ao entrar em certas abas, dispara a função de renderização
 * correspondente para atualizar o conteúdo com os dados atuais.
 *
 * @param {string}      tabId - ID do painel sem o prefixo "tab-"
 * @param {HTMLElement} btnEl - botão clicado (recebe classe .active)
 */
function switchTab(tabId, btnEl) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  const panel = document.getElementById('tab-' + tabId);
  if (panel) panel.classList.add('active');
  if (btnEl) btnEl.classList.add('active');

  /* ── Hooks por aba ─────────────────────────────────────────── */
  if (tabId === 'descriptive') {
    // Mostra a legenda do CV junto com o conteúdo
    const legend = document.getElementById('cvLegend');
    if (typeof renderDescriptive === 'function') {
      renderDescriptive();
      if (legend) legend.style.display = parsedData ? 'flex' : 'none';
    }
  }

  // Aba 4 — gráficos (a ser implementado)
  // if (tabId === 'charts') { ... }
}
