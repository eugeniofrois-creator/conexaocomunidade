/* Conexão Comunidade: interface no Pages, dados no serviço do projeto. */
(() => {
  const api = 'https://conexao-comunidade-frei-damiao.eugenio-frois.chatgpt.site/api/pages-bridge';
  const key = 'conexao-pages-session';
  const nativeFetch = window.fetch.bind(window);
  const clear = () => { sessionStorage.removeItem(key); localStorage.removeItem(key); };
  const token = () => sessionStorage.getItem(key) || localStorage.getItem(key);
  window.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url || input.href, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return nativeFetch(input, options);
    const endpoint = url.pathname.slice(5);
    const dest = new URL(api);
    dest.search = url.search;
    dest.searchParams.set('endpoint', endpoint);
    const headers = new Headers(options.headers || (input instanceof Request ? input.headers : undefined));
    if (token()) headers.set('Authorization', `Bearer ${token()}`);
    const result = await nativeFetch(dest, {...options, headers, credentials: 'omit'});
    if (endpoint === 'auth') {
      let data = {};
      try { data = JSON.parse(options.body || '{}'); } catch (_) {}
      const session = result.headers.get('X-Conexao-Session');
      if (session) { clear(); (data.remember === true || data.remember === 'true' || data.remember === 'on' ? localStorage : sessionStorage).setItem(key, session); }
      if (result.ok && (data.action === 'logout' || data.action === 'password')) clear();
    }
    return result;
  };
  const pending = new WeakSet();
  function showImage(img) {
    const raw = img.getAttribute('src');
    if (!raw || !raw.startsWith('/api/') || pending.has(img)) return;
    pending.add(img);
    window.fetch(raw).then(r => { if (!r.ok) throw new Error('image'); return r.blob(); })
      .then(blob => { img.src = URL.createObjectURL(blob); }).catch(() => {}).finally(() => pending.delete(img));
  }
  const scan = node => {
    if (node.nodeType !== 1) return;
    if (node.tagName === 'IMG') showImage(node);
    node.querySelectorAll?.('img').forEach(showImage);
  };
  new MutationObserver(records => records.forEach(r => {
    if (r.type === 'attributes') showImage(r.target);
    else r.addedNodes.forEach(scan);
  })).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
})();
