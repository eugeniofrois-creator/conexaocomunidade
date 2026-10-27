"use strict";
const slots = {
  "student-1": "Natanael Vieira Sousa",
  "student-2": "Vitor Hugo Pereira",
  "student-3": "Cauê Vinicius Teixeira da Silva",
  "teacher-1": "Diego Paulo Garcia",
  "teacher-2": "Silvania Matos de Lima",
  "teacher-3": "Willian de França",
  "teacher-4": "Gabriela da Silva Loh",
  "developer-1": "Eugênio",
  "developer-2": "João Paulo Broering",
  manager: "Leandro Pickler",
  coordination: "Daniela Amorim",
  team: "Toda a equipe",
  institution: "Parceria — aba Sobre",
};
const status = document.getElementById("status"),
  root = document.getElementById("images");
async function api(url, method = "GET", body) {
  return readApiResponse(
    await fetch(url, {
      method,
      cache: "no-store",
      ...(body instanceof FormData
        ? { body }
        : body
          ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
          : {}),
    }),
  );
}
async function act(work) {
  try {
    root.inert = true;
    await work();
    status.textContent = "Alteração salva.";
    await load();
  } catch (e) {
    status.textContent = e.message;
  } finally {
    root.inert = false;
  }
}
function button(parent, text, work) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "secondary";
  b.textContent = text;
  b.onclick = () => act(work);
  parent.append(b);
}
function upload(parent, label, work) {
  const l = document.createElement("label");
  l.textContent = label;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/webp";
  input.onchange = () => {
    if (input.files[0]) act(() => work(input.files[0]));
  };
  l.append(input);
  parent.append(l);
}
async function load() {
  const data = await api("/api/admin-images"),
    about = await api("/api/about-images");
  root.replaceChildren();
  for (const c of data.companies) {
    const panel = document.createElement("section");
    panel.className = "panel";
    const h = document.createElement("h2");
    h.textContent = c.name;
    panel.append(h);
    for (const a of c.images) {
      const card = document.createElement("article");
      card.className = "moderation-photo";
      const img = document.createElement("img");
      img.src = "/api/company-image?id=" + a.id;
      img.alt = "Foto da empresa";
      const p = document.createElement("p");
      p.textContent =
        a.kind +
        " · " +
        { approved: "Aprovada", pending: "Aguardando aprovação", rejected: "Não aprovada" }[
          a.approval
        ];
      card.append(img, p);
      for (const [text, approval] of [
        ["Aprovar", "approved"],
        ["Não aprovar", "rejected"],
      ])
        button(card, text, () =>
          api("/api/company-image", "PATCH", { id: a.id, revision: a.revision, approval }),
        );
      upload(card, "Substituir foto", (file) => {
        const f = new FormData();
        f.set("company", c.id);
        f.set("revision", c.revision);
        f.set("kind", a.kind);
        f.set("replace", a.id);
        f.set("image", file);
        return api("/api/company-image", "POST", f);
      });
      button(card, "Excluir", () => {
        if (confirm("Excluir esta imagem?"))
          return api("/api/company-image", "DELETE", {
            company: c.id,
            id: a.id,
            revision: c.revision,
          });
      });
      panel.append(card);
    }
    upload(panel, "Adicionar foto aprovada", (file) => {
      const f = new FormData();
      f.set("company", c.id);
      f.set("revision", c.revision);
      f.set("kind", "gallery");
      f.set("image", file);
      return api("/api/company-image", "POST", f);
    });
    root.append(panel);
  }
  const section = document.createElement("section");
  section.className = "panel";
  const h = document.createElement("h2");
  h.textContent = "Fotos da aba Sobre";
  section.append(h);
  for (const slot of data.aboutSlots) {
    const row = about.slots.find((r) => r.slot === slot);
    const card = document.createElement("article");
    card.className = "moderation-photo";
    const title = document.createElement("h3");
    title.textContent = slots[slot];
    card.append(title);
    if (row?.image || row?.defaultSrc) {
      const img = document.createElement("img");
      img.src = row.defaultSrc || "/api/about-images?id=" + row.image;
      img.alt = slots[slot];
      card.append(img);
    }
    upload(card, "Adicionar ou substituir foto", (file) => {
      const f = new FormData();
      f.set("slot", slot);
      f.set("revision", row?.revision || "");
      f.set("image", file);
      return api("/api/about-images", "POST", f);
    });
    if (row?.image || row?.defaultSrc)
      button(card, "Excluir foto", () => {
        if (confirm("Excluir esta foto?"))
          return api("/api/about-images", "DELETE", { slot, revision: row.revision });
      });
    section.append(card);
  }
  root.append(section);
}
load().catch((e) => (status.textContent = e.message));

document.getElementById("refresh-images").onclick = () => act(async () => {});
