(() => {
  const app =
    /; wv\)|ComunidadeConectadaApp/.test(navigator.userAgent) ||
    matchMedia("(display-mode: standalone)").matches ||
    sessionStorage.getItem("cc-app") === "1";
  if (!app) return;
  sessionStorage.setItem("cc-app", "1");
  document.body.classList.add("mobile-app-page");
  const path = location.pathname;
  if (path === "/teste.html" && !new URLSearchParams(location.search).has("area")) {
    location.replace("/comunidade.html?app=1");
    return;
  }
  for (const a of document.querySelectorAll("a")) {
    if (a.textContent.includes("Voltar ao perfil")) a.href = "/comunidade.html?app=1&view=account";
    else if (a.textContent.includes("Voltar ao site") || a.textContent.includes("Voltar ao mapa")) {
      a.href = "/comunidade.html?app=1";
      a.textContent = "← Voltar ao aplicativo";
    }
  }
})();
