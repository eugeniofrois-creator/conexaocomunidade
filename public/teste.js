"use strict";
const $ = (id) => document.getElementById(id);
const connected =
  location.protocol === "https:" ||
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1";
let suggestionOpen = false;
let catalogueLimit = 24;
let companyAccess = false;
let adminAccess = false;
let companies = [],
  companyId = null,
  companyRevision = null,
  logo = null,
  facade = null,
  gallery = [],
  services = [],
  configured = false,
  origin = null,
  busy = false,
  dirty = false,
  currentView = "client",
  accessRequired = false,
  loading = false;
const form = $("company-form");
const hasPending = () => dirty;
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const img = (id) => "/api/company-image?id=" + encodeURIComponent(id);
const normalize = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bpaes\b/g, "pao")
    .replace(/\bcostureir[ao]s?\b/g, "costura");
function tell(text, error = false) {
  $("message").textContent = text;
  $("message").classList.toggle("error", error);
}
function switchView(view) {
  if (view === "business-panel" && !companyAccess) {
    view = "business";
  }
  if (!document.getElementById(view)?.classList.contains("view")) return;
  if (view === "business-panel" && adminAccess && !companyId) form.hidden = true;
  currentView = view;
  const viewUrl = new URL(location.href);
  viewUrl.searchParams.set("area", view);
  history.replaceState(null, "", viewUrl);
  document.body.dataset.backgroundView = view === "client" ? "cliente" : view === "about" ? "sobre" : view === "business-panel" ? "painel" : "empresa";
  document.querySelectorAll(".view").forEach((e) => (e.hidden = e.id !== view));
  BusinessIcons.colorRows($("catalogue"));
  document
    .querySelectorAll("nav button[data-view]")
    .forEach((e) => e.classList.toggle("active", e.dataset.view === view));
}
document
  .querySelectorAll("[data-view]")
  .forEach((b) => b.addEventListener("click", () => switchView(b.dataset.view)));
async function api(path, method = "GET", data) {
  if (!connected) throw Error("Abra a versão conectada para salvar com proteção no servidor.");
  const options = { method, cache: "no-store" };
  if (data !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(data);
  }
  const r = await fetch(path, options);
  return readApiResponse(r).catch((e) => {
    if (e.status === 401) {
      $("connected-profile").hidden = true;
      companyAccess = false;
      $("admin-report-notice").hidden = true;
      $("business-account-nav").hidden = true;
      if (currentView === "business-panel") switchView("business");
      accessRequired = true;
      companies = [];
      renderCatalogue();
      renderOwned();
      if ($("details").open) $("details").close();
      $("access-notice").hidden = false;
      $("signin").textContent = "Entrar";
      $("signin").href = "/entrar.html";
      $("signin").onclick = null;
    }
    throw e;
  });
}
function directoryInfo(data) {
  $("directory-info").textContent = data.directory?.count
    ? `${data.directory.count} registros do levantamento de ${data.directory.sourceDate}. Fonte: Mapa do Empreendedor/ICOM. Estes negócios ainda não têm contas confirmadas no projeto.`
    : "";
  const selectedSector = $("sector-filter").value;
  $("sector-filter").innerHTML =
    '<option value="">Todos os setores</option>' +
    [...new Set(companies.map((c) => c.sector).filter(Boolean))]
      .sort()
      .map((s) => `<option value="${escape(s)}">${escape(s)}</option>`)
      .join("");
  $("sector-filter").value = selectedSector;
  const extra = data.complementary || [];
  $("complementary-addresses").hidden = !extra.length;
  $("complementary-list").innerHTML = extra
    .map(
      (c) =>
        `<article><h3>${escape(c.name)}</h3><p>${escape(c.address)}</p><p>${escape(c.contact)}</p><p>${escape(c.notes)}</p><a href="${escape(c.source)}" target="_blank" rel="noreferrer">Consultar fonte</a></article>`,
    )
    .join("");
}
$("more-companies").onclick = () => {
  catalogueLimit += 24;
  renderCatalogue();
};
for (const id of ["district-filter", "sector-filter"])
  $(id).onchange = () => {
    catalogueLimit = 24;
    renderCatalogue();
  };
function km(c) {
  if (!origin || c.lat === null || c.lng === null) return null;
  const rad = (v) => (v * Math.PI) / 180;
  const a =
    Math.sin(rad(c.lat - origin.lat) / 2) ** 2 +
    Math.cos(rad(origin.lat)) * Math.cos(rad(c.lat)) * Math.sin(rad(c.lng - origin.lng) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)));
}
function distance(c) {
  const d = km(c);
  return d === null
    ? "Sem coordenadas para calcular a distância"
    : (d < 1
        ? Math.round(d * 1000) + " m"
        : d.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km") + " em linha reta";
}
function filtered() {
  const terms = normalize($("search").value).trim().split(/\s+/);
  const list = companies.filter(
    (c) =>
      c.published !== false &&
      (!$("district-filter").value || c.district === $("district-filter").value) &&
      (!$("sector-filter").value || c.sector === $("sector-filter").value) &&
      terms.every((t) =>
        normalize(
          [
            c.name,
            c.slogan,
            c.category,
            c.products,
            ...(c.services || []).map((s) => s.name),
            c.description,
            c.address,
          ].join(" "),
        ).includes(t),
      ),
  );
  return origin ? list.sort((a, b) => (km(a) ?? Infinity) - (km(b) ?? Infinity)) : list;
}
function renderCatalogue() {
  suggestions();
  const list = filtered();
  $("more-companies").hidden = list.length <= catalogueLimit;
  $("count").textContent = list.length + " registro" + (list.length === 1 ? "" : "s");
  $("empty").hidden = !!list.length;
  if (!list.length && $("search").value) {
    $("empty").querySelector("h2").textContent = "Nenhuma empresa encontrada.";
    $("empty").querySelector("p").textContent =
      "A busca considera os produtos informados pelas empresas. Experimente outro termo.";
  } else if (!list.length) {
    $("empty").querySelector("h2").textContent = "O catálogo começa com as empresas.";
    $("empty").querySelector("p").textContent =
      "Fotos, produtos, logo e slogan serão adicionados por quem cadastrar cada negócio. Não colocamos conteúdo comercial de exemplo.";
  }
  $("catalogue").innerHTML = list
    .slice(0, catalogueLimit)
    .map(
      (c) =>
        `<button class="company-card" data-id="${escape(c.id)}">${c.facade || c.gallery?.[0] ? `<img src="${escape(img(c.facade || c.gallery[0]))}" alt="Imagem enviada pela empresa ${escape(c.name)}" loading="lazy">` : ""}<div class="company-heading">${c.logo ? `<img class="company-logo" src="${escape(img(c.logo))}" alt="Logo de ${escape(c.name)}">` : `<span class="company-logo">${escape(c.name[0] || "")}</span>`}<div><h2 class="activity-name"><span>${escape(c.name)}</span>${BusinessIcons.html(c)}</h2><div class="category">${escape(c.category)}</div></div></div>${c.slogan ? `<p class="slogan">${escape(c.slogan)}</p>` : ""}${c.products ? `<p class="products">${escape(c.products)}</p>` : ""}<p class="card-address"><b>Endereço:</b> ${escape(c.address?.trim() || "Endereço não informado.")}</p>${origin ? `<p class="distance">${escape(distance(c))}</p>` : ""}${c.sourceType === "survey" ? '<span class="footnote">Levantamento público · confirmação pendente</span>' : ""}<span class="category">Ver detalhes</span></button>`,
    )
    .join("");
  BusinessIcons.colorRows($("catalogue"));
  $("catalogue")
    .querySelectorAll("[data-id]")
    .forEach((b) => (b.onclick = () => showDetails(companies.find((c) => c.id === b.dataset.id))));
}
function renderOwned() {
  const own = companies.filter((c) => c.mine);
  $("owned").innerHTML = own.length
    ? own
        .map(
          (c) =>
            `<button type="button" data-id="${escape(c.id)}" class="${c.id === companyId ? "selected" : ""}">${escape(c.name)}<small> · ${c.published ? "no catálogo" : "rascunho"}</small></button>`,
        )
        .join("")
    : `<p class="footnote">${adminAccess ? "Nenhuma empresa registrada no sistema ainda." : "Você ainda não cadastrou uma empresa."}</p>`;
  $("owned")
    .querySelectorAll("[data-id]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          if (busy) return;
          if (dirty && !confirm("Trocar de empresa e descartar os campos ainda não salvos?"))
            return;
          editCompany(companies.find((c) => c.id === b.dataset.id));
        }),
    );
}
function photoActions(id, kind) {
  return `<div class="photo-actions"><button type="button" data-replace="${escape(id)}" data-kind="${kind}" class="secondary">Substituir foto</button><button type="button" data-delete-photo="${escape(id)}" class="danger">Excluir foto</button></div>`;
}
function media() {
  $("additional-images").hidden = !configured;
  $("images-locked").hidden = configured;
  $("facade-preview").innerHTML = facade
    ? `<img class="facade-preview-image" src="${escape(img(facade))}" alt="Fachada enviada pela empresa">${photoActions(facade, "facade")}`
    : "";
  $("logo-preview").innerHTML = logo
    ? `<img class="logo-preview-image" src="${escape(img(logo))}" alt="Logo enviada">${photoActions(logo, "logo")}`
    : "";
  $("gallery-preview").innerHTML = gallery
    .map(
      (id, i) =>
        `<div><img src="${escape(img(id))}" alt="Foto da empresa ${i + 1}" loading="lazy">${photoActions(id, "gallery")}</div>`,
    )
    .join("");
  $("photo-count").textContent = gallery.length + (facade ? 1 : 0) + " de 10 fotos · logo separada";
  form.querySelectorAll("[data-replace]").forEach(
    (b) =>
      (b.onclick = () => {
        if (busy) return;
        replacement = { id: b.dataset.replace, kind: b.dataset.kind };
        $("replace-file").click();
      }),
  );
  form
    .querySelectorAll("[data-delete-photo]")
    .forEach((b) => (b.onclick = () => removePhoto(b.dataset.deletePhoto)));
}
let replacement = null;
function applyImages(result) {
  companyRevision = result.revision;
  logo = result.images.logo;
  facade = result.images.facade;
  gallery = [...result.images.gallery];
  const own = companies.find((c) => c.id === companyId);
  if (own) Object.assign(own, result.images, { revision: result.revision });
  media();
  renderCatalogue();
}
async function removePhoto(id) {
  if (busy || !companyId) return;
  if (
    !confirm(
      "Excluir esta foto da empresa? Ela será removida do catálogo e do armazenamento ativo.",
    )
  )
    return;
  setBusy(true);
  try {
    applyImages(
      await api("/api/company-image", "DELETE", {
        company: companyId,
        id,
        revision: companyRevision,
      }),
    );
    tell("Foto excluída. Os demais campos do cadastro foram preservados.");
  } catch (e) {
    tell(e.message, true);
  } finally {
    setBusy(false);
  }
}
$("replace-file").onchange = (e) => {
  const file = e.target.files[0],
    target = replacement;
  replacement = null;
  e.target.value = "";
  if (file && target) upload(file, target.kind, target.id);
};
function editCompany(c) {
  form.hidden = adminAccess && !c;
  document.querySelector(".business-layout").classList.toggle("admin-list-only", adminAccess && !c);
  companyId = c?.id || null;
  companyRevision = c?.revision || null;
  logo = c?.logo || null;
  facade = c?.facade || null;
  services = (c?.services || []).map((s) => ({ ...s }));
  configured = !!c?.configured;
  gallery = [...(c?.gallery || [])];
  form.reset();
  for (const key of [
    "name",
    "provider",
    "slogan",
    "category",
    "products",
    "description",
    "address",
    "hours",
    "contact",
    "privateNote",
    "lat",
    "lng",
  ])
    form.elements.namedItem(key).value = c?.[key] ?? "";
  form.elements.namedItem("listingType").value = c?.listingType || "business";
  form.elements.namedItem("published").checked = !!c?.published;
  $("form-title").textContent = c ? "Editar empresa" : "Cadastre sua empresa";
  $("company-token").textContent = c
    ? "Identificador de referência: " + c.id
    : "O identificador será gerado ao salvar.";
  $("delete-company").hidden = !c;
  dirty = false;
  media();
  serviceEditor();
  renderOwned();
}
async function load() {
  if (loading) return false;
  loading = true;
  try {
    const data = await api("/api/companies");
    accessRequired = false;
    adminAccess = ["owner", "company-admin"].includes(data.user?.role);
    $("new-company").hidden = adminAccess;
    const panelHeading = $("business-panel").querySelector(".page-heading");
    panelHeading.querySelector(".eyebrow").textContent = adminAccess
      ? "ADMINISTRAÇÃO"
      : "SUA EMPRESA, SUA IDENTIDADE";
    panelHeading.querySelector("h1").textContent = adminAccess
      ? "Gerenciar empresas"
      : "Apresente seu negócio.";
    panelHeading.querySelector("p:last-child").textContent = adminAccess
      ? "Selecione uma empresa registrada para revisar seus dados, remover imagens ou excluir o cadastro."
      : "Você escolhe as informações e imagens que os clientes verão.";
    const sidebar = $("owned").closest("aside");
    sidebar.querySelector("h2").textContent = adminAccess
      ? "Empresas registradas"
      : "Minha conta · Empresas";
    sidebar.querySelector(".footnote").textContent = adminAccess
      ? "A administração tem acesso aos cadastros de todas as empresas. Clique em uma empresa para gerenciar."
      : "Esta área reúne os cadastros da sua conta.";
    if (adminAccess && !companyId) editCompany(null);
    companyAccess = ["company", "company-admin", "owner"].includes(data.user?.role);
    $("business-account-nav").hidden = !companyAccess;
    $("business-account-nav").textContent = ["owner", "company-admin"].includes(data.user?.role)
      ? "Gerenciar empresas"
      : "Minha empresa";
    $("business-entry").href = companyAccess ? "/teste.html?area=business" : "/cadastro.html";
    $("business-entry").textContent = companyAccess
      ? "Acessar minha empresa"
      : "Cadastrar minha empresa";
    $("access-notice").hidden = true;
    companies = data.companies;
    if (["owner", "company-admin"].includes(data.user?.role)) showAdminNotice();
    directoryInfo(data);
    renderCatalogue();
    renderOwned();
    if (!data.user) {
      $("connected-profile").hidden = true;
      $("admin-report-notice").hidden = true;
      $("signin").textContent = "Entrar · Empresa";
      $("signin").href = "/entrar.html?next=business";
      $("signin").onclick = null;
      if (currentView === "business-panel") switchView("business");
      return true;
    }
    $("connected-profile").hidden = false;
    $("profile-name").textContent = data.user.name;
    $("profile-avatar").textContent = data.user.name.trim()[0]?.toUpperCase() || "E";
    $("profile-role").textContent = ["company-admin", "owner"].includes(data.user.role)
      ? "ADM · acesso completo"
      : data.user.role === "coordination" ? "Coordenação · escola" : "Empresa · conectada";
    $("signin").textContent = "Sair";
    $("signin").href =
      data.user.auth === "local" ? "/entrar.html" : "/signout-with-chatgpt?return_to=%2Fteste.html";
    $("signin").onclick =
      data.user.auth === "local"
        ? async (e) => {
            e.preventDefault();
            if (hasPending() && !confirm("Sair e descartar os campos ainda não salvos?")) return;
            await api("/api/auth", "POST", { action: "logout" });
            dirty = false;
            location.href = "/entrar.html";
          }
        : null;
    return true;
  } catch (e) {
    tell(e.message, true);
    return false;
  } finally {
    loading = false;
  }
}
async function ensureCompany() {
  if (companyId) return companyId;
  if (adminAccess) throw Error("Selecione uma empresa registrada para gerenciar.");
  const created = await api("/api/companies", "POST", { action: "create" });
  companyId = created.id;
  companyRevision = created.revision;
  $("company-token").textContent = "Identificador de referência: " + companyId;
  $("delete-company").hidden = false;
  return companyId;
}
function dataFromForm() {
  const data = { listingType: form.elements.namedItem("listingType").value };
  for (const key of [
    "name",
    "provider",
    "slogan",
    "category",
    "products",
    "description",
    "address",
    "hours",
    "contact",
    "privateNote",
  ])
    data[key] = form.elements.namedItem(key).value.trim();
  for (const key of ["lat", "lng"]) {
    const text = form.elements.namedItem(key).value;
    data[key] = text === "" ? null : Number(text);
  }
  return {
    ...data,
    logo,
    facade,
    services: services.map((s) => ({ ...s })),
    gallery: [...gallery],
    published: form.elements.namedItem("published").checked,
  };
}
function setBusy(value) {
  busy = value;
  form.querySelectorAll("button,input,textarea,select").forEach((b) => (b.disabled = value));
  $("save-company").textContent = value ? "Salvando…" : "Salvar empresa";
}
form.addEventListener("input", () => (dirty = true));
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (busy) return;
  const point = dataFromForm();
  if ((point.lat === null) !== (point.lng === null)) {
    tell("Informe latitude e longitude juntas, ou deixe as duas vazias.", true);
    return;
  }
  setBusy(true);
  try {
    const id = await ensureCompany();
    const saved = await api("/api/companies", "POST", {
      id,
      revision: companyRevision,
      data: dataFromForm(),
    });
    companyRevision = saved.revision;
    configured = true;
    media();
    setBusy(true);
    dirty = false;
    tell("Empresa salva. Seus dados foram armazenados com criptografia.");
    await load();
  } catch (e) {
    tell(e.message, true);
  } finally {
    setBusy(false);
  }
});
$("new-company").onclick = () => {
  if (adminAccess) return;
  if (busy) return;
  if (dirty && !confirm("Descartar os campos ainda não salvos?")) return;
  editCompany(null);
};
async function upload(file, kind, replace = null) {
  if (!file || busy) return;
  if (kind !== "logo" && !configured) {
    tell("Salve o cadastro da empresa antes de adicionar suas fotos.", true);
    return;
  }
  if (
    !replace &&
    ((kind === "gallery" && gallery.length + (facade ? 1 : 0) >= 10) ||
      (kind === "facade" && !facade && gallery.length >= 10))
  ) {
    tell("Use no máximo 10 fotos por empresa, incluindo a fachada.", true);
    return;
  }
  if (file.size > 5000000) {
    tell("Use uma imagem de até 5 MB.", true);
    return;
  }
  setBusy(true);
  try {
    const id = await ensureCompany();
    const fd = new FormData();
    fd.append("company", id);
    fd.append("image", file);
    fd.append("kind", kind);
    fd.append("revision", companyRevision);
    if (replace) fd.append("replace", replace);
    const r = await fetch("/api/company-image", { method: "POST", body: fd });
    const result = await readApiResponse(r);
    applyImages(result);
    setBusy(true);
    tell(
      result.approval === "pending"
        ? "Imagem salva e aguardando aprovação da administração."
        : "Imagem aprovada e salva.",
    );
  } catch (e) {
    tell(e.message, true);
  } finally {
    setBusy(false);
  }
}
$("facade-file").onchange = (e) => {
  upload(e.target.files[0], "facade");
  e.target.value = "";
};
$("logo-file").onchange = (e) => {
  upload(e.target.files[0], "logo");
  e.target.value = "";
};
$("gallery-file").onchange = (e) => {
  upload(e.target.files[0], "gallery");
  e.target.value = "";
};
$("delete-company").onclick = async () => {
  if (!companyId || busy) return;
  if (!confirm("Excluir esta empresa e todas as imagens de teste enviadas para ela?")) return;
  setBusy(true);
  try {
    await api("/api/companies", "DELETE", { id: companyId, revision: companyRevision });
    editCompany(null);
    await load();
    tell("Empresa e imagens excluídas do armazenamento ativo.");
  } catch (e) {
    tell(e.message, true);
  } finally {
    setBusy(false);
  }
};
$("export-company").onclick = () => {
  if (busy) return;
  if (dirty) {
    tell("Salve suas alterações antes de exportar os dados.", true);
    return;
  }
  const own = companies.find((c) => c.id === companyId && c.mine);
  if (!own) {
    tell("Salve e selecione sua empresa antes de exportar.", true);
    return;
  }
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(own, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "dados-da-minha-empresa.private.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  tell(
    "Exportação feita. O arquivo contém dados legíveis, incluindo a observação privada. Imagens são referências, sem os arquivos.",
  );
};
function geo(success) {
  if (!navigator.geolocation) {
    tell("Localização indisponível neste navegador.", true);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (p) => success({ lat: p.coords.latitude, lng: p.coords.longitude }),
    () =>
      tell(
        "Localização não autorizada ou indisponível. Ative a permissão de localização e tente novamente.",
        true,
      ),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
  );
}
$("business-location").onclick = () =>
  geo((p) => {
    if (busy) return;
    form.elements.namedItem("lat").value = p.lat.toFixed(6);
    form.elements.namedItem("lng").value = p.lng.toFixed(6);
    dirty = true;
    tell("Confira se as coordenadas correspondem ao local da empresa.");
  });
$("near").onclick = () =>
  geo((p) => {
    origin = p;
    $("location-status").textContent = "Mais perto primeiro · distância em linha reta";
    $("clear-location").hidden = false;
    renderCatalogue();
  });
$("clear-location").onclick = () => {
  origin = null;
  $("clear-location").hidden = true;
  $("location-status").textContent = "Informe sua localização para ordenar por proximidade.";
  renderCatalogue();
};
$("search").oninput = () => {
  suggestionOpen = true;
  catalogueLimit = 24;
  renderCatalogue();
};
function routeUrl(c, mode = "driving") {
  const destination = c.lat != null && c.lng != null ? c.lat + "," + c.lng : c.address;
  if (!destination) return null;
  const params = new URLSearchParams({ api: "1", destination, travelmode: mode });
  if (origin) params.set("origin", origin.lat + "," + origin.lng);
  return "https://www.google.com/maps/dir/?" + params;
}
function showDetails(c) {
  if (!c) return;
  const point =
    c.lat != null && c.lng != null
      ? `<iframe class="map" title="Localização de ${escape(c.name)}" src="https://www.openstreetmap.org/export/embed.html?bbox=${[Math.max(-180, c.lng - 0.012), Math.max(-90, c.lat - 0.008), Math.min(180, c.lng + 0.012), Math.min(90, c.lat + 0.008)].join("%2C")}&amp;layer=mapnik&amp;marker=${c.lat}%2C${c.lng}"></iframe>`
      : "";
  const route = routeUrl(c);
  const phone = String(c.contact || "").replace(/[^0-9+]/g, "");
  const servicesTable = (c.services || []).length
    ? `<div class="service-table-wrap"><table class="service-table"><caption>Serviços e produtos</caption><thead><tr><th scope="col">O que oferece</th><th scope="col">Referência</th></tr></thead><tbody>${c.services.map((s) => `<tr><td>${escape(s.name)}</td><td>${escape(s.unit)}</td></tr>`).join("")}</tbody></table></div>`
    : "";
  $("details-content").innerHTML =
    `<article class="detail">${c.facade ? `<img class="storefront-photo" src="${escape(img(c.facade))}" alt="Fachada de ${escape(c.name)}">` : ""}${c.logo ? `<img class="detail-logo" src="${escape(img(c.logo))}" alt="Logo enviada pela empresa">` : ""}<h2>${escape(c.name)}</h2>${c.sourceType === "survey" ? `<p class="notice">Levantamento público de ${escape(c.sourceDate)}. Ainda não confirmado pelo responsável neste projeto.</p><p>Bairro: ${escape(c.district)}</p><p>Atendimento: ${escape(c.attendance)}</p><p>${escape(c.notes)}</p><a href="${escape(c.source)}" target="_blank" rel="noreferrer">Consultar fonte do levantamento</a>` : ""}<p>${escape(c.category)}</p>${c.provider ? `<p>Responsável: ${escape(c.provider)}</p>` : ""}<p>${escape(c.slogan)}</p><p>${escape(c.description)}</p><h3>O que vende ou oferece</h3><p>${escape(c.products || "")}</p>${servicesTable}<h3>Endereço</h3><p class="card-address">${escape(c.address?.trim() || "Endereço não informado.")}</p>${c.hours ? `<p>Horário: ${escape(c.hours)}</p>` : ""}${c.contact ? `<p>Telefone: ${escape(c.contact)}</p>${/^\+?[0-9]{8,15}$/.test(phone) ? `<a class="secondary" href="tel:${phone}">Ligar para o comércio</a>` : ""}` : ""}${origin ? `<p class="distance">${escape(distance(c))}</p>` : ""}<h3>Como chegar</h3><route-guide data-title="${escape(c.name)}" data-address="${escape(c.address)}" data-lat="${c.lat ?? ""}" data-lng="${c.lng ?? ""}"></route-guide>${route ? `<label>Como você vai?<select id="route-mode"><option value="driving">Carro</option><option value="walking">A pé</option><option value="bicycling">Bicicleta</option><option value="transit">Transporte público</option></select></label><a id="google-route" class="primary route-link" href="${escape(route)}" target="_blank" rel="noopener noreferrer">Abrir rota no Google Maps</a><p class="footnote">O Google Maps mostra o trajeto, a distância pelas ruas e a estimativa de tempo disponíveis. Ao abrir a rota, o destino e, se informada, sua localização serão enviados ao Google. Confira se o destino corresponde ao comércio.</p>` : "<p>O comércio ainda não informou endereço ou coordenadas.</p>"}${point}<h3>Fotos do comércio</h3><div class="detail-gallery">${(c.gallery || []).map((id) => `<img src="${escape(img(id))}" alt="Foto enviada pela empresa">`).join("")}</div></article>`;
  if ($("route-mode"))
    $("route-mode").onchange = (e) => {
      $("google-route").href = routeUrl(c, e.target.value);
    };
  $("details").showModal();
}
function suggestions() {
  const box = $("search-suggestions");
  const query = $("search").value.trim();
  box.hidden = !suggestionOpen || !query;
  $("search").setAttribute("aria-expanded", String(!box.hidden));
  if (box.hidden) return;
  const list = filtered().slice(0, 8);
  box.innerHTML =
    `<div class="suggestion-heading"><b>${origin ? "Locais sugeridos · mais perto primeiro" : "Locais sugeridos"}</b>${!origin ? '<button type="button" class="text-button" id="suggest-location">Ativar localização para ver distâncias</button>' : ""}</div>` +
    (list.length
      ? list
          .map(
            (c) =>
              `<button type="button" class="place-option" data-place="${escape(c.id)}"><span><b class="activity-name"><span>${escape(c.name)}</span>${BusinessIcons.html(c)}</b><small>${escape(c.category)}${c.district ? " · " + escape(c.district) : ""}</small><small>${escape(c.address || "Endereço não informado")}</small></span><strong class="suggestion-distance">${origin ? escape(distance(c)) : "Distância: ative o GPS"}</strong></button>`,
          )
          .join("")
      : '<p role="status">Nenhum local encontrado. Experimente outro nome, produto ou serviço.</p>');
  box.querySelectorAll("[data-place]").forEach(
    (b) =>
      (b.onclick = () => {
        suggestionOpen = false;
        box.hidden = true;
        $("search").setAttribute("aria-expanded", "false");
        showDetails(companies.find((c) => c.id === b.dataset.place));
      }),
  );
  if ($("suggest-location")) $("suggest-location").onclick = () => $("near").click();
}
$("search").onfocus = () => {
  suggestionOpen = true;
  suggestions();
};
$("search").onkeydown = (e) => {
  if (e.key === "Escape") {
    suggestionOpen = false;
    suggestions();
  }
  if (e.key === "ArrowDown") {
    const first = $("search-suggestions").querySelector("[data-place]");
    if (first) {
      e.preventDefault();
      first.focus();
    }
  }
};
$("search-suggestions").onkeydown = (e) => {
  const buttons = [...$("search-suggestions").querySelectorAll("[data-place]")],
    i = buttons.indexOf(document.activeElement);
  if (e.key === "Escape") {
    suggestionOpen = false;
    suggestions();
    $("search").focus();
    suggestionOpen = false;
    suggestions();
  }
  if (i >= 0 && ["ArrowDown", "ArrowUp"].includes(e.key)) {
    e.preventDefault();
    const next = i + (e.key === "ArrowDown" ? 1 : -1);
    if (next < 0) $("search").focus();
    else buttons[Math.min(next, buttons.length - 1)].focus();
  }
};
document.addEventListener("pointerdown", (e) => {
  if (!$("search-suggestions").contains(e.target) && !e.target.closest(".search-row")) {
    suggestionOpen = false;
    suggestions();
  }
});

function serviceEditor() {
  $("service-editor").innerHTML = services
    .map(
      (s, i) =>
        `<div class="service-row"><label>Serviço ou produto<input data-service="${i}" data-field="name" value="${escape(s.name)}" required minlength="2" maxlength="120"></label><label>Referência <small>opcional</small><input data-service="${i}" data-field="unit" maxlength="80" value="${escape(s.unit)}" placeholder="Ex.: unidade, cento, hora"></label><button type="button" data-remove-service="${i}" class="secondary">Remover</button></div>`,
    )
    .join("");
  $("service-editor")
    .querySelectorAll("[data-service]")
    .forEach(
      (input) =>
        (input.oninput = () => {
          services[Number(input.dataset.service)][input.dataset.field] = input.value;
          dirty = true;
        }),
    );
  $("service-editor")
    .querySelectorAll("[data-remove-service]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          if (busy) return;
          services.splice(Number(b.dataset.removeService), 1);
          dirty = true;
          serviceEditor();
        }),
    );
}
$("add-service").onclick = () => {
  if (busy) return;
  if (services.length >= 30) {
    tell("Use até 30 serviços ou produtos por empresa.", true);
    return;
  }
  services.push({ name: "", price: null, unit: "" });
  dirty = true;
  serviceEditor();
};
$("details").querySelector(".close").onclick = () => $("details").close();
window.addEventListener("beforeunload", (e) => {
  if (!hasPending() && !busy) return;
  e.preventDefault();
  e.returnValue = "";
});
$("offline").hidden = connected;
const requestedView = new URLSearchParams(location.search).get("area");
switchView(requestedView === "business-panel" ? "business" : requestedView || "client");
if (connected) {
  load().then((ok) => {
    if (ok) {
      const own = companies.find((c) => c.mine);
      if (own && !adminAccess) editCompany(own);
      if (adminAccess) editCompany(null);
      if (["business", "business-panel"].includes(requestedView) && currentView === "business" && companyAccess)
        switchView("business-panel");
    }
  });
  setInterval(() => {
    if (document.visibilityState === "visible" && currentView === "client" && !accessRequired)
      load();
  }, 20000);
} else renderCatalogue();

let installPrompt = null,
  waitingWorker = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
});
$("install-app").onclick = () => {
  const d = document.createElement("dialog");
  d.className = "panel";
  d.innerHTML =
    '<div class="android-install"><h2>Instalar aplicativo</h2><a href="/downloads/comunidade-conectada-teste.apk">Baixar APK de testes para Android</a><small>Android 6.0 ou superior, com Android System WebView atualizado. O aplicativo usa os mesmos dados do site e precisa de internet. Para instalar o APK de testes, o Android pode solicitar autorização para instalar por este navegador.</small><button class="primary pwa" type="button" hidden>Instalar pelo navegador</button><p>Também é possível instalar pelo menu do navegador. No iPhone, use Safari → Compartilhar → Adicionar à Tela de Início.</p><button type="button" class="secondary close-install">Fechar</button></div>';
  const pwa = d.querySelector(".pwa");
  pwa.hidden = !installPrompt;
  pwa.onclick = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      installPrompt = null;
    }
    d.close();
  };
  d.querySelector(".close-install").onclick = () => d.close();
  d.addEventListener("close", () => d.remove());
  document.body.append(d);
  d.showModal();
};
function applyVersion() {
  if (waitingWorker && !hasPending() && !busy) {
    navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), {
      once: true,
    });
    waitingWorker.postMessage({ type: "ACTIVATE" });
    waitingWorker = null;
  }
}
if (connected && "serviceWorker" in navigator)
  navigator.serviceWorker
    .register("/sw.js")
    .then((reg) => {
      if (reg.waiting) {
        waitingWorker = reg.waiting;
        applyVersion();
      }
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            waitingWorker = worker;
            if (hasPending() || busy)
              tell(
                "Nova versão disponível. Seu formulário será preservado; conclua o cadastro para atualizar.",
              );
            else applyVersion();
          }
        });
      });
    })
    .catch(() => {});
setInterval(applyVersion, 15000);

async function showAdminNotice() {
  try {
    const r = await fetch("/api/reports", { cache: "no-store" }),
      data = await readApiResponse(r);
    $("admin-report-notice").hidden = !data.unread;
    $("admin-report-notice").textContent =
      data.unread + " novo(s) relato(s) da comunidade. Abra a caixa de relatos para verificar.";
  } catch (e) {}
}
