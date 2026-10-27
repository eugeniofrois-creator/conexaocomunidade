/* Guia de partida: GPS pontual e voz opcional, sem simular navegação por ruas. */
(() => {
  if (customElements.get("route-guide")) return;
  class RouteGuide extends HTMLElement {
    connectedCallback() {
      this.requestId = 0;
      this.muted = true;
      this.origin = null;
      this.ready = false;
      const root = this.shadowRoot || this.attachShadow({ mode: "open" });
      root.innerHTML = `<style>:host{display:block;margin:18px 0;font:16px/1.5 Arial,Helvetica,sans-serif;color:#183332}*{box-sizing:border-box}.box{padding:18px;border:1px solid #cbded4;border-radius:12px;background:#edf5f2}h3{margin:0 0 10px;font-size:18px}p{margin:10px 0;overflow-wrap:anywhere}label{display:block;font-size:14px;font-weight:600}select{display:block;width:100%;font:inherit;padding:11px;border:1px solid #cbded4;border-radius:8px;background:white;margin:6px 0 12px}.actions{display:flex;flex-wrap:wrap;gap:10px}button,a{font:inherit;min-height:44px;padding:10px 14px;border-radius:8px;cursor:pointer;touch-action:manipulation}button{border:1px solid #126654;background:white;color:#126654}button.start,a{background:#126654;color:white;border:1px solid #126654;text-decoration:none;text-align:center}button:disabled{opacity:.6;cursor:wait}button:focus-visible,a:focus-visible,select:focus-visible{outline:3px solid #e9a53a;outline-offset:3px}.hint{font-size:14px;color:#506b61}.status{font-size:15px}a[hidden]{display:none}@media(max-width:480px){.actions>*{flex:1 1 180px}.box{padding:16px}}</style><section class="box"><h3>Iniciar trajeto</h3><label>Como você vai?<select aria-label="Modo de transporte"><option value="driving">Carro</option><option value="walking">A pé</option><option value="bicycling">Bicicleta</option><option value="transit">Transporte público</option></select></label><div class="actions"><button type="button" class="start">Usar GPS e preparar trajeto</button><button type="button" class="voice" aria-pressed="false" aria-label="Ativar guia por voz">🔇 Ativar guia por voz</button></div><p class="status" role="status" aria-live="polite">Escolha o transporte e inicie quando estiver pronto. O guia por voz é opcional.</p><a class="navigate" hidden target="_blank" rel="noopener noreferrer">Continuar no Google Maps</a><p class="hint">O guia ajuda a iniciar o trajeto. As instruções de cada curva e o controle de voz da navegação ficam no Google Maps. Ao continuar, destino e localização autorizada são enviados ao Google.</p></section>`;
      this.status = root.querySelector(".status");
      this.start = root.querySelector(".start");
      this.voice = root.querySelector(".voice");
      this.link = root.querySelector(".navigate");
      this.mode = root.querySelector("select");
      this.start.onclick = () => this.prepare();
      this.voice.onclick = () => this.toggleVoice();
      this.mode.onchange = () => {
        this.updateLink();
      };
      this.link.onclick = () => {
        this.cancelVoice();
      };
      this.nativeReady = () => {
        this.voice.disabled = false;
        this.voice.textContent = "🔇 Ativar guia por voz";
      };
      window.addEventListener("cc-android-ready", this.nativeReady);
      this.visibility = () => {
        if (document.hidden) this.cancelVoice();
      };
      document.addEventListener("visibilitychange", this.visibility);
      if (
        !window.__CC_ANDROID__ &&
        (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window))
      ) {
        this.voice.disabled = true;
        this.voice.textContent = "Voz indisponível neste navegador";
      }
    }
    disconnectedCallback() {
      window.removeEventListener("cc-android-ready", this.nativeReady);
      this.requestId++;
      this.cancelVoice();
      document.removeEventListener("visibilitychange", this.visibility);
    }
    cancelVoice() {
      if (window.__CC_ANDROID__) {
        location.href = "ccvoice://cancel";
        this.utterance = null;
        return;
      }
      if (this.utterance && "speechSynthesis" in window) {
        speechSynthesis.cancel();
        this.utterance = null;
      }
    }
    speak(text) {
      if (window.__CC_ANDROID__) {
        if (!this.muted) location.href = "ccvoice://speak?text=" + encodeURIComponent(text);
        return;
      }
      if (this.muted || !("speechSynthesis" in window)) return;
      this.cancelVoice();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "pt-BR";
      u.rate = 1;
      const v = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase() === "pt-br");
      if (v) u.voice = v;
      u.onerror = () => {
        this.cancelVoice();
      };
      this.utterance = u;
      speechSynthesis.speak(u);
    }
    message(text) {
      this.status.textContent = text;
      this.speak(text);
    }
    toggleVoice() {
      this.muted = !this.muted;
      this.voice.setAttribute("aria-pressed", String(!this.muted));
      this.voice.setAttribute(
        "aria-label",
        this.muted ? "Ativar guia por voz" : "Silenciar guia por voz",
      );
      this.voice.textContent = this.muted ? "🔇 Ativar guia por voz" : "🔊 Silenciar guia";
      if (this.muted) this.cancelVoice();
      else this.speak(this.status.textContent);
    }
    destination() {
      const lat = this.getAttribute("data-lat"),
        lng = this.getAttribute("data-lng");
      if (
        lat !== null &&
        lng !== null &&
        lat !== "" &&
        lng !== "" &&
        Number.isFinite(Number(lat)) &&
        Number.isFinite(Number(lng)) &&
        Math.abs(Number(lat)) <= 90 &&
        Math.abs(Number(lng)) <= 180
      )
        return lat + "," + lng;
      return (this.getAttribute("data-address") || "").trim();
    }
    updateLink() {
      const destination = this.destination();
      if (!destination) {
        this.link.hidden = true;
        return;
      }
      const p = new URLSearchParams({
        api: "1",
        destination,
        travelmode: this.mode.value,
        dir_action: "navigate",
      });
      if (this.origin) p.set("origin", this.origin.lat + "," + this.origin.lng);
      this.link.href = "https://www.google.com/maps/dir/?" + p;
      this.link.hidden = !this.ready;
    }
    prepare() {
      if (!this.destination()) {
        this.message("Este local ainda não tem endereço ou coordenadas para iniciar um trajeto.");
        return;
      }
      const id = ++this.requestId;
      this.origin = null;
      this.ready = false;
      this.link.hidden = true;
      this.start.disabled = true;
      this.message("Autorize a localização no navegador para usar seu ponto de partida.");
      const finish = (point, text) => {
        if (id !== this.requestId || !this.isConnected) return;
        this.origin = point;
        this.ready = true;
        this.start.disabled = false;
        this.updateLink();
        this.message(text);
      };
      const name = this.getAttribute("data-title") || "o local escolhido";
      if (!navigator.geolocation) {
        finish(null, "GPS indisponível. Continue no Google Maps e informe seu ponto de partida.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) =>
          finish(
            { lat: p.coords.latitude, lng: p.coords.longitude },
            "Localização obtida. Destino: " +
              name +
              ". Confira o local e toque em Continuar no Google Maps para iniciar a navegação.",
          ),
        () =>
          finish(
            null,
            "Não foi possível obter a localização. Você ainda pode continuar no Google Maps e definir o ponto de partida.",
          ),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
      );
    }
  }
  customElements.define("route-guide", RouteGuide);
})();
