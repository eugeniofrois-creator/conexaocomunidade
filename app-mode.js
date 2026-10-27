(() => {
  const app =
    /; wv\)|ComunidadeConectadaApp/.test(navigator.userAgent) ||
    matchMedia("(display-mode: standalone)").matches ||
    sessionStorage.getItem("cc-app") === "1";
  if (!app) return;
  sessionStorage.setItem("cc-app", "1");
  document.body.classList.add("mobile-app-page");
  const path = location.pathname;
  if (path === "/conexaocomunidade/teste.html" && !new URLSearchParams(location.search).has("area")) {
    location.replace("/conexaocomunidade/comunidade.html?app=1");
    return;
  }
  for (const a of document.querySelectorAll("a")) {
    if (a.textContent.includes("Voltar ao perfil")) a.href = "/conexaocomunidade/comunidade.html?app=1&view=account";
    else if (a.textContent.includes("Voltar ao site") || a.textContent.includes("Voltar ao mapa")) {
      a.href = "/conexaocomunidade/comunidade.html?app=1";
      a.textContent = "← Voltar ao aplicativo";
    }
  }
})();
