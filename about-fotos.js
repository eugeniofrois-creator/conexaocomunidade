(() => {
  async function update() {
    try {
      const d = await readApiResponse(await fetch("/api/about-images", { cache: "no-store" }));
      for (const r of d.slots) {
        const target = document.querySelector('[data-photo-slot="' + r.slot + '"]');
        if (!target) continue;
        if (r.image || r.defaultSrc) {
          const img = document.createElement("img");
          img.src = r.defaultSrc || "/api/about-images?id=" + r.image;
          img.alt = target.getAttribute("aria-label") || "Foto do projeto";
          target.replaceChildren(img);
        } else if (target.tagName !== "IMG") target.innerHTML = "<span>Foto</span>";
      }
    } catch {}
  }
  update();
  setInterval(() => {
    if (!document.hidden) update();
  }, 30000);
})();
