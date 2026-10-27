/* Ícones leves de atividade, sem baixar imagens ou alterar logos das empresas. */
(() => {
  "use strict";
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const rules = [
    [/autopec|auto pec|mecanic|automotiv|borrachar|pneu|pecas de carro/, "🔧", "Oficina e autopeças"],
    [/biciclet|ciclismo|bicicletaria/, "🚲", "Bicicletaria"],
    [/padaria|panific|padeir|\bpao\b|\bpaes\b/, "🍞", "Padaria"],
    [/confeitar|bolos?|tortas?|cupcake/, "🧁", "Confeitaria"],
    [/doces?|bombon|chocolate|brigadeiro|balas/, "🍬", "Doces"],
    [/costur|alfaiat|bordado|ajuste de roupa/, "🧵", "Costura"],
    [/roupas?|vestuario|moda|brecho|boutique|camiseta/, "👕", "Roupas e moda"],
    [/calcado|sapato|tenis|sapataria/, "👟", "Calçados"],
    [/barbear|barbeiro/, "💈", "Barbearia"],
    [/cabeleir|salao|cabelo/, "✂️", "Cabeleireiro"],
    [/manicure|pedicure|unhas|esmalteria/, "💅", "Manicure"],
    [/estetic|cosmetic|maquiagem|perfumaria|beleza/, "💄", "Beleza e cosméticos"],
    [/pizza/, "🍕", "Pizzaria"],
    [/hamburg|lanchonete|lanches|salgad/, "🍔", "Lanches e salgados"],
    [/restaurante|marmit|refeic|comida|cozinha/, "🍽️", "Refeições"],
    [/cafeteria|cafe/, "☕", "Cafeteria"],
    [/sorvet|acai|geladinho/, "🍦", "Sorvetes e açaí"],
    [/acougue|carnes|churrasco/, "🥩", "Açougue"],
    [/hortifruti|frutaria|verdura|legumes|sacolao/, "🥬", "Hortifrúti"],
    [/mercado|mercearia|supermercado|minimercado/, "🛒", "Mercado"],
    [/pet shop|petshop|veterinar|racao|banho e tosa/, "🐾", "Animais e pet shop"],
    [/farmacia|drogaria/, "💊", "Farmácia"],
    [/saude|clinica|hospital|\bubs\b|enferm/, "🩺", "Saúde"],
    [/dentista|odontolog/, "🦷", "Odontologia"],
    [/escola|creche|ensino|educacao|aulas|professor/, "📚", "Educação"],
    [/informatica|computador|notebook|eletronic|celular|telefone/, "💻", "Tecnologia e assistência"],
    [/eletric|instalac/, "⚡", "Serviços elétricos"],
    [/construc|pedreiro|ferragen|reforma|material de obra/, "🧱", "Construção e reparos"],
    [/encanador|hidraulic/, "🚰", "Serviços hidráulicos"],
    [/marcenar|carpint|moveis/, "🪑", "Móveis e marcenaria"],
    [/jardin|floric|plantas|flores/, "🌿", "Jardins e flores"],
    [/limpeza|diarista|faxina|lavanderia/, "🧹", "Limpeza"],
    [/artesan|decorac/, "🎨", "Artesanato e decoração"],
    [/academia|fitness|treino|personal/, "🏋️", "Esporte e bem-estar"],
    [/transporte|onibus|terminal/, "🚌", "Transporte"],
    [/entrega|motoboy|frete|mudanca/, "🚚", "Entregas e fretes"],
    [/igreja|religios/, "⛪", "Espaço religioso"],
    [/praca|parque|comunitar|associacao/, "🌳", "Espaço da comunidade"],
    [/papelaria|livraria/, "📒", "Papelaria e livraria"],
    [/bebida|distribuidora|adega/, "🥤", "Bebidas"],
  ];
  function classify(record = {}) {
    // A atividade declarada prevalece sobre palavras no nome ou nos produtos.
    for (const value of [record.category, record.name || record.title, record.products, record.sector]) {
      const match = rules.find(([pattern]) => pattern.test(normalize(value)));
      if (match) return {symbol: match[1], label: match[2]};
    }
    return {symbol: "🏪", label: "Comércio ou serviço local"};
  }
  function html(record) {
    const icon = classify(record);
    // Ambos os valores vêm somente da tabela fixa acima, nunca de HTML do cadastro.
    return `<span class="activity-icon" role="img" aria-label="${icon.label}" title="${icon.label}">${icon.symbol}</span>`;
  }
  function element(record) {
    const icon = classify(record), span = document.createElement("span");
    span.className = "activity-icon";
    span.setAttribute("role", "img");
    span.setAttribute("aria-label", icon.label);
    span.title = icon.label;
    span.textContent = icon.symbol;
    return span;
  }
  const colors = ["#4285f4", "#ea4335", "#fbbc05", "#34a853"];
  function colorRows(container) {
    if (!container || container.clientWidth === 0) return;
    container.dataset.colorRows = "true";
    const template = getComputedStyle(container).gridTemplateColumns;
    const columns = template && template !== "none" ? template.split(/\s+/).length : 1;
    [...container.children].forEach((row, index) => {
      const color = colors[Math.floor(index / columns) % colors.length];
      row.style.setProperty("--row-accent", color);
      row.style.setProperty("--row-tint", color + "38");
    });
  }
  let frame;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => document.querySelectorAll("[data-color-rows]").forEach(colorRows));
  });
  window.BusinessIcons = {classify, html, element, colorRows};
})();
