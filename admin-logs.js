async function load() {
  const status = document.getElementById("status");
  try {
    const d = await readApiResponse(await fetch("/api/admin-activity", { cache: "no-store" }));
    const root = document.getElementById("events");
    root.replaceChildren();
    for (const e of d.events) {
      const row = document.createElement("article");
      row.className = "panel";
      const h = document.createElement("h2");
      h.textContent = e.type;
      const p = document.createElement("p");
      p.textContent = e.name + " · " + e.status;
      const time = document.createElement("small");
      time.textContent = e.time ? new Date(e.time).toLocaleString("pt-BR") : "Data não registrada no cadastro antigo";
      row.append(h, p, time);
      root.append(row);
    }
    status.textContent = d.events.length ? "" : "Nenhum registro disponível.";
  } catch (e) {
    status.textContent = e.message;
  }
}
document.getElementById("refresh").onclick = load;
load();
