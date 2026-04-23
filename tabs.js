/* ═══════════════════════════════════════════════════════════════
   DataAves – GEAVES/UFRPE
   js/tabs.js — controle de navegação entre abas
   ═══════════════════════════════════════════════════════════════ */

/**
 * Ativa a aba indicada por tabId e marca o botão correspondente.
 * @param {string} tabId  - ID do painel sem o prefixo "tab-" (ex: 'home', 'upload')
 * @param {HTMLElement} btnEl - botão clicado (para aplicar classe .active)
 */
function switchTab(tabId, btnEl) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  const panel = document.getElementById('tab-' + tabId);
  if (panel) panel.classList.add('active');
  if (btnEl) btnEl.classList.add('active');
}
