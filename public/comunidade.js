"use strict";
const e = (id) => document.getElementById(id);
const appMode = document.body.classList.contains("app-shell");
if (appMode) {
  document.querySelector(".app-home-nav").hidden = false;
  document.title = "Conexão Comunidade · Aplicativo";
  document.querySelector("header .brand").href = "/comunidade.html?app=1&view=home";
}
let records = [],
  user = null,
  origin = null,
  map = null,
  markers = null,
  limit = 24,
  busy = false,
  selected = null,
  loaded = false,
  mapFitted = false,
  currentTab = "map",
  promptInstall = null;
let searchTimer;
const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bpaes\b/g, "pao")
    .replace(/costureir[ao]s?/g, "costura");
function km(r) {
  if (!origin || !Number.isFinite(r.lat) || !Number.isFinite(r.lng)) return Infinity;
  const rad = (x) => (x * Math.PI) / 180,
    dlat = rad(r.lat - origin.lat),
    dlng = rad(r.lng - origin.lng),
    a =
      Math.sin(dlat / 2) ** 2 +
      Math.cos(rad(origin.lat)) * Math.cos(rad(r.lat)) * Math.sin(dlng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function distance(r) {
  const n = km(r);
  return Number.isFinite(n)
    ? (n < 1 ? Math.round(n * 1000) + " m" : n.toFixed(1) + " km") + " em linha reta"
    : "Sem distância disponível";
}
function matches(r, q) {
  const t = norm([r.title, r.name, r.category, r.products, r.address].join(" "));
  return norm(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => t.includes(w));
}
function matchesPointType(r) {
  const selected = e("point-filter").value;
  const category = norm(r.category || "");
  if (!selected) return true;
  if (selected === "school") return /escola|educacao|creche/.test(category);
  if (selected === "health") return /saude|ubs|unidade de saude|farmacia/.test(category);
  if (selected === "transport") return /transporte|onibus|terminal|ponto de onibus/.test(category);
  return r.listingType === selected;
}
e("point-filter").onchange = () => {
  limit = 24;
  mapFitted = false;
  render();
};
function visible() {
  return records
    .filter(
      (r) =>
        (!e("district").value || r.district === e("district").value) &&
        matches(r, e("map-search").value) &&
        matchesPointType(r),
    )
    .sort((a, b) =>
      origin
        ? km(a) - km(b) || String(a.title).localeCompare(b.title)
        : String(a.title).localeCompare(b.title),
    );
}
function text(tag, value, parent) {
  const n = document.createElement(tag);
  n.textContent = value;
  parent.append(n);
  return n;
}
function link(parent, label, href) {
  const a = text("a", label, parent);
  a.href = href;
  a.className = "secondary";
  return a;
}
function status(s) {
  e("community-status").hidden = !s;
  e("community-status").textContent = s;
}
function tab(name) {
  if (!["map", "community", "account", ...(appMode ? ["home"] : [])].includes(name)) name = appMode ? "home" : "map";
  currentTab = name;
  document.body.dataset.appTab = name;
  const tabUrl = new URL(location.href);
  tabUrl.searchParams.set("view", name);
  if (appMode) tabUrl.searchParams.set("app", "1");
  history.replaceState(null, "", tabUrl);
  document.body.dataset.backgroundView = name === "map" ? "mapa" : name === "community" ? "comunidade" : "conta";
  for (const t of ["home", "map", "community", "account"]) e(t + "-view").hidden = t !== name;
  document.querySelectorAll("[data-tab]").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === name);
    b.setAttribute("aria-current", b.dataset.tab === name ? "page" : "false");
  });
  if (name === "map") {
    initMap();
    BusinessIcons.colorRows(e("places"));
    setTimeout(() => { map?.invalidateSize(); render(); }, 0);
  }
  if (name === "home") renderHome();
  if (name === "account") renderAccount();
  e("close-details").textContent = name === "home" ? "← Voltar ao início" : "← Voltar";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function renderAccount() {
  const root = e("account");
  root.replaceChildren();
  if (!user) {
    text("p", "Pesquise e envie relatos sem criar conta.", root);
    link(root, "Entrar na conta", "/entrar.html?next=app");
    link(root, "Cadastrar empresa", "/cadastro.html");
    return;
  }
  text("h2", user.name, root);
  const admin = ["owner", "company-admin"].includes(user.role);
  text("p", admin ? "ADM · acesso completo" : "Conta de empresa", root);
  const actions = text("div", "", root);
  actions.className = "actions";
  if (admin) {
    link(actions, "Registros de atividade", "/admin-logs.html");
    link(actions, "Gerenciar contas", "/contas.html");
    link(actions, "Aprovar e gerenciar imagens", "/admin-imagens.html");
    link(actions, "Ler relatos da comunidade", "/admin-relatos.html");
    link(actions, "Gerenciar empresas", "/teste.html?area=business");
  } else link(actions, "Minha empresa e fotos", "/teste.html?area=business");
  link(actions, "Perfil, senha e sair", "/entrar.html");
}
function show(r) {
  selected = r;
  const root = e("details-body");
  root.replaceChildren();
  text("h2", r.title || r.name, root);
  text("p", r.address || "Endereço não informado.", root);
  for (const id of new Set([r.photo, ...(r.gallery || [])].filter(Boolean))) {
    const img = document.createElement("img");
    img.src =
      (r.sourceType === "company" ? "/api/company-image?id=" : "/api/photo?id=") +
      encodeURIComponent(id);
    img.alt = "Foto de " + (r.title || r.name);
    img.loading = "lazy";
    root.append(img);
  }
  if (r.products) {
    text("h3", "Produtos e serviços", root);
    text("p", r.products, root);
  }
  if (r.description) text("p", r.description, root);
  if (r.hours) text("p", "Horários: " + r.hours, root);
  if (r.contact) text("p", "Contato: " + r.contact, root);
  if (origin) text("p", distance(r), root);
  const guide = document.createElement("route-guide");
  guide.dataset.title = r.title || r.name;
  guide.dataset.address = r.address || "";
  guide.dataset.lat = r.lat ?? "";
  guide.dataset.lng = r.lng ?? "";
  root.append(guide);
  if (Number.isFinite(r.lat) && Number.isFinite(r.lng)) {
    const b = text("button", "📍 Localizar no mapa", root);
    b.className = "secondary";
    b.onclick = () => {
      e("place-details").close();
      tab("map");
      map?.setView([r.lat, r.lng], 17);
    };
  }
  if (r.mine && r.sourceType === "company")
    link(root, "Gerenciar empresa e fotos", "/teste.html?area=business");
  if (!e("place-details").open) e("place-details").showModal();
}
function initMap() {
  if (map || !window.L) return;
  map = L.map(e("map"), { preferCanvas: true }).setView([-27.645, -48.669], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  })
    .on("tileerror", () => {
      e("map-info").textContent =
        "As ruas não carregaram. Confira a conexão; os locais continuam disponíveis na lista.";
    })
    .addTo(map);
  markers = L.layerGroup().addTo(map);
  map.on("moveend", drawMapPoints);
}
function drawMapPoints() {
  if (!map || !markers) return;
  markers.clearLayers();
  const groups = new Map();
  for (const r of visible()) {
    if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;
    const p = map.project([r.lat, r.lng], map.getZoom());
    const key = Math.floor(p.x / 56) + ":" + Math.floor(p.y / 56);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  for (const group of groups.values()) {
    const lat = group.reduce((n,r) => n + r.lat, 0) / group.length;
    const lng = group.reduce((n,r) => n + r.lng, 0) / group.length;
    const multiple = group.length > 1;
    const marker = L.marker([lat, lng], {icon: L.divIcon({className: multiple ? "map-cluster" : "map-single", html: multiple ? String(group.length) : '<div class="map-pin"></div>', iconSize: [36,36], iconAnchor: [18,18]})});
    const tooltip = document.createElement("span");
    tooltip.textContent = multiple ? group.length + " locais nesta área" : group[0].title || group[0].name;
    marker.bindTooltip(tooltip);
    marker.on("click", () => {
      if (!multiple) return show(group[0]);
      if (map.getZoom() < 19) map.setView([lat, lng], Math.min(19, map.getZoom() + 2));
      else {
        e("places").replaceChildren();
        for (const r of group) {
          const button = text("button", r.title || r.name, e("places"));
          button.className = "place-row";
          text("small", r.address || "Endereço não informado", button);
          button.onclick = () => show(r);
        }
        e("more").hidden = true;
        e("map-info").textContent = group.length + " locais neste ponto. Selecione um para conhecer.";
        setResultsOpen(true);
      }
    });
    marker.addTo(markers);
  }
  if (origin) L.circleMarker([origin.lat, origin.lng], {radius:8, color:"#fff", weight:3, fillColor:"#2479e3", fillOpacity:1}).bindTooltip("Sua localização").addTo(markers);
}
function setResultsOpen(open) {
  e("results-content").hidden = !open;
  e("toggle-results").setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("results-open", open);
}
e("toggle-results").onclick = () => setResultsOpen(e("results-content").hidden);
function render() {
  const list = visible();
  e("places").replaceChildren();
  for (const r of list.slice(0, limit)) {
    const row = document.createElement("button");
    row.className = "place-row";
    row.type = "button";
    const heading = text("b", "", row);
    heading.className = "activity-name";
    text("span", r.title || r.name, heading);
    heading.append(BusinessIcons.element(r));
    text("small", r.category || "", row);
    text("small", r.address || "Endereço não informado.", row);
    if (origin) text("strong", distance(r), row);
    row.onclick = () => show(r);
    e("places").append(row);
  }
  BusinessIcons.colorRows(e("places"));
  if (!list.length)
    text("p", loaded ? "Nenhum local encontrado." : "Carregando locais…", e("places"));
  e("more").hidden = list.length <= limit;
  if (currentTab === "map") initMap();
  const points = list.filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
  drawMapPoints();
  e("results-count").textContent = list.length;
  e("map-info").textContent =
    list.length + " locais encontrados · " + points.length + " pontos no mapa.";
  if (map && currentTab === "map" && points.length && !selected && !origin && loaded && !mapFitted) {
    mapFitted = true;
    map.fitBounds(L.latLngBounds(points.map((r) => [r.lat, r.lng])), {
      padding: [35, 35],
      maxZoom: 14,
    });
  }
  const metrics = e("metrics");
  metrics.replaceChildren();
  for (const [label, value] of [
    ["Empresas publicadas", records.filter((r) => r.sourceType === "company").length],
    ["Registros do levantamento", records.filter((r) => r.sourceType === "survey").length],
    [
      "Pontos no mapa",
      records.filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng)).length,
    ],
    ["Atividades", new Set(records.map((r) => r.category).filter(Boolean)).size],
  ]) {
    const box = text("article", "", metrics);
    text("b", String(value), box);
    text("span", label, box);
  }
  renderSuggestions(false);
  if (appMode) renderHome();
}
function appLocalCard(r, parent) {
  const button = text("button", "", parent);
  button.className = "app-local-card";
  const info = text("span", "", button);
  const heading = text("b", "", info);
  heading.className = "activity-name";
  text("span", r.title || r.name, heading);
  heading.append(BusinessIcons.element(r));
  text("small", r.category || "Comércio e serviços", info);
  text("small", r.address || "Endereço não informado", info);
  if (origin) text("small", distance(r), info);
  const arrow = text("span", "↗", button);
  arrow.setAttribute("aria-hidden", "true");
  button.onclick = () => { e("home-suggestions").hidden = true; e("home-search").setAttribute("aria-expanded", "false"); show(r); };
}
function renderHome() {
  if (!appMode) return;
  e("home-places").replaceChildren();
  const list = [...records].sort((a,b) => origin ? km(a)-km(b) || String(a.title || a.name).localeCompare(b.title || b.name) : String(a.title || a.name).localeCompare(b.title || b.name));
  for (const r of list.slice(0,6)) appLocalCard(r, e("home-places"));
  if (!list.length) text("p", loaded ? "Ainda não há locais disponíveis." : "Carregando locais…", e("home-places"));
  e("home-places-title").textContent = origin ? "Mais perto de você" : "Conheça os locais";
  e("home-location").textContent = origin ? "Localização ativada · distâncias em linha reta" : e("location-info").textContent.includes("GPS não permitido") ? "Localização não permitida. Você pode continuar explorando." : "Use sua localização para ordenar os locais";
}
function searchFromHome(query) {
  e("map-search").value = query;
  e("district").value = "";
  e("point-filter").value = "";
  limit = 24;
  selected = null;
  mapFitted = false;
  tab("map");
  render();
  setResultsOpen(true);
}
e("home-search-form").onsubmit = event => { event.preventDefault(); searchFromHome(e("home-search").value.trim()); };
e("home-search").oninput = () => {
  const q = e("home-search").value.trim();
  const root = e("home-suggestions");
  root.replaceChildren();
  root.hidden = !q;
  e("home-search").setAttribute("aria-expanded", String(!!q));
  if (!q) return;
  const list = records.filter(r => matches(r,q)).sort((a,b) => origin ? km(a)-km(b) : String(a.title || a.name).localeCompare(b.title || b.name)).slice(0,5);
  for (const r of list) appLocalCard(r,root);
  if (!list.length) text("p", loaded ? "Nenhum local encontrado. Tente outra atividade." : "Carregando locais…",root);
};
e("home-search").onkeydown = event => { if (event.key === "Escape") { e("home-suggestions").hidden = true; e("home-search").setAttribute("aria-expanded", "false"); } };
for (const button of document.querySelectorAll("[data-category]")) button.onclick = () => searchFromHome(button.dataset.category);
e("home-see-all").onclick = () => searchFromHome("");
e("home-map").onclick = () => tab("map");
e("home-near").onclick = () => { e("home-location").textContent = "Buscando sua localização…"; e("gps").click(); };
function renderSuggestions(open = true) {
  const root = e("suggestions"),
    q = e("map-search").value.trim();
  root.replaceChildren();
  root.hidden = !open || !q;
  e("map-search").setAttribute("aria-expanded", String(!root.hidden));
  if (root.hidden) return;
  for (const r of visible().slice(0, 8)) {
    const b = text("button", "", root);
    b.className = "suggestion";
    const heading = text("b", "", b);
    heading.className = "activity-name";
    text("span", r.title || r.name, heading);
    heading.append(BusinessIcons.element(r));
    text("small", r.address || "Endereço não informado.", b);
    text("small", origin ? distance(r) : "Ative o GPS para ver a distância.", b);
    b.onclick = () => {
      root.hidden = true;
      e("map-search").setAttribute("aria-expanded", "false");
      show(r);
    };
  }
  if (!root.children.length) text("p", "Nenhum local encontrado.", root);
}
async function load() {
  if (busy) return;
  busy = true;
  try {
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 15000);
    let d;
    try {
      d = await readApiResponse(
        await fetch("/api/community", { cache: "no-store", signal: controller.signal }),
      );
    } finally {
      clearTimeout(timeout);
    }
    records = d.records;
    user = d.user;
    loaded = true;
    status("");
    render();
    renderAccount();
  } catch (err) {
    status(
      "Não foi possível atualizar. " +
        (err.name === "AbortError" ? "Confira a conexão e tente novamente." : err.message),
    );
  } finally {
    busy = false;
  }
}
e("map-search").oninput = () => {
  limit = 24;
  selected = null;
  mapFitted = false;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { render(); renderSuggestions(); }, 160);
};
e("map-search").onfocus = () => renderSuggestions();
e("map-search").onkeydown = (ev) => {
  if (ev.key === "Escape") e("suggestions").hidden = true;
};
e("district").onchange = () => {
  limit = 24;
  selected = null;
  mapFitted = false;
  render();
};
e("more").onclick = () => {
  limit += 24;
  render();
};
e("browse").onclick = () => tab("map");
e("close-details").onclick = () => e("place-details").close();
document.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => tab(b.dataset.tab)));
document.addEventListener("pointerdown", (ev) => {
  if (!e("suggestions").contains(ev.target) && ev.target !== e("map-search"))
    e("suggestions").hidden = true;
});
e("gps").onclick = () => {
  if (!navigator.geolocation) {
    status("GPS indisponível. Você pode pesquisar normalmente.");
    return;
  }
  e("gps").disabled = true;
  e("location-info").textContent = "Permitindo e obtendo o GPS…";
  navigator.geolocation.getCurrentPosition(
    (p) => {
      e("gps").disabled = false;
      origin = { lat: p.coords.latitude, lng: p.coords.longitude };
      e("location-info").textContent =
        "Locais do mais próximo ao mais distante · distância em linha reta.";
      e("clear-gps").hidden = false;
      selected = null;
      render();
      map?.setView([origin.lat, origin.lng], 14);
    },
    (err) => {
      e("gps").disabled = false;
      e("location-info").textContent =
        err.code === 1 ? "GPS não permitido." : "Não foi possível localizar. Tente novamente.";
      if (appMode) { renderHome(); e("home-location").textContent = e("location-info").textContent; }
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
  );
};
e("clear-gps").onclick = () => {
  origin = null;
  selected = null;
  e("clear-gps").hidden = true;
  e("location-info").textContent = "Ative o GPS para ver distâncias.";
  render();
};
if (
  new URLSearchParams(location.search).get("app") === "1" ||
  /; wv\)/.test(navigator.userAgent)
)
  sessionStorage.setItem("cc-app", "1");
tab(new URLSearchParams(location.search).get("view") || (appMode ? "home" : "map"));
load();
setInterval(() => {
  if (!document.hidden && !e("place-details").open) load();
}, 30000);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
