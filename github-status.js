/* Feedback de limite para Pages, sem consultar a API para atualizar o relógio. */
export function installGithubStatus(transport) {
  let notice, timer;
  const disabled = new Map();
  const selectors = 'form button:not([type="button"]), #save-company, #delete-company, #new-company';
  const status = {blockedUntil: 0};
  window.ConexaoGithubStatus = status;
  function disableControls() {
    for (const button of document.querySelectorAll(selectors)) {
      if (!disabled.has(button)) disabled.set(button, button.disabled);
      if (!button.disabled) {disabled.set(button, false);button.disabled = true;}
    }
  }
  new MutationObserver(() => {if(transport.status().blockedUntil)disableControls();})
    .observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["disabled"]});
  function render() {
    clearTimeout(timer);
    Object.assign(status, transport.status());
    if (!notice) {
      notice = document.createElement('aside');
      notice.id = 'github-api-status';
      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');
      notice.style.cssText = 'position:sticky;top:0;z-index:2000;padding:14px 20px;background:#fff4d5;color:#493900;border-bottom:1px solid #d9b85e;overflow-wrap:anywhere';
      document.body.prepend(notice);
    }
    const blocked = status.blockedUntil > Date.now();
    notice.hidden = !blocked;
    if (blocked) {
      notice.textContent = 'O GitHub limitou as consultas. O catálogo público continua disponível; alterações recentes podem não aparecer. Nova tentativa após ' + new Date(status.blockedUntil).toLocaleTimeString('pt-BR') + '. Seus campos foram preservados.';
      disableControls();
      timer = setTimeout(render, Math.min(1000, status.blockedUntil - Date.now() + 10));
    } else {
      for (const [button, wasDisabled] of disabled) if (button.isConnected) button.disabled = wasDisabled;
      disabled.clear();
    }
  }
  transport.subscribe(() => setTimeout(render, 0));
  document.addEventListener('submit', event => {
    if (transport.status().blockedUntil) { event.preventDefault(); event.stopImmediatePropagation(); render(); }
  }, true);
}
