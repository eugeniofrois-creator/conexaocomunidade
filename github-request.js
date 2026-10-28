/* Transporte compartilhado da versão Pages. Não persiste tokens ou respostas privadas. */
export class GithubRequestError extends Error {
  constructor(message, status, retryAt = 0) {
    super(message);
    this.name = 'GithubRequestError';
    this.status = status;
    this.retryAt = retryAt;
  }
}

function browserStorage() {
  if (typeof window === 'undefined') return null;
  try { return globalThis.localStorage; } catch { return null; }
}

export class GithubRequest {
  constructor({owner, repo, token, request = globalThis.fetch.bind(globalThis), storage = browserStorage(), now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms))}) {
    this.base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/`;
    this.fetch = request;
    this.storage = storage;
    this.now = now;
    this.sleep = sleep;
    this.cache = new Map();
    this.cachedBytes = 0;
    this.pending = new Map();
    this.queue = Promise.resolve();
    this.blockedUntil = 0;
    this.failures = 0;
    this.lastWrite = -Infinity;
    this.listeners = new Set();
    this.storageKey = crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)).then(bytes =>
      'conexao-api-pause:' + Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join(''));
    this.ready = this.restorePause();
    globalThis.addEventListener?.('storage', event => {
      this.storageKey.then(key => { if (event.key === key) this.restorePause().then(() => this.notify()); });
    });
  }
  async restorePause() {
    try { this.blockedUntil = Math.max(this.blockedUntil, Number(this.storage?.getItem(await this.storageKey)) || 0); } catch { /* Storage may be disabled. */ }
  }
  async pause(until) {
    this.blockedUntil = Math.max(this.blockedUntil, until);
    try { this.storage?.setItem(await this.storageKey, String(this.blockedUntil)); } catch { /* Keep the in-memory pause. */ }
    this.notify();
  }
  notify() { for (const listener of this.listeners) listener(this.status()); }
  subscribe(listener) { this.listeners.add(listener); listener(this.status()); return () => this.listeners.delete(listener); }
  status() { return {blockedUntil: this.blockedUntil > this.now() ? this.blockedUntil : 0, ...this.limits}; }
  limitedError() {
    const time = new Date(this.blockedUntil).toLocaleTimeString('pt-BR');
    return new GithubRequestError(`O GitHub limitou as consultas. Nova tentativa após ${time}. Seus campos foram preservados.`, 429, this.blockedUntil);
  }
  async checkPause() {
    await this.ready;
    await this.restorePause();
    if (this.blockedUntil > this.now()) throw this.limitedError();
  }
  request(input, options = {}) {
    const url = String(input);
    if (!url.startsWith(this.base)) throw new GithubRequestError('Destino da API inválido.', 400);
    const method = String(options.method || 'GET').toUpperCase();
    const headers = new Headers(options.headers);
    const key = url + '\n' + (headers.get('accept') || '');
    // A fresh authorization check never borrows a potentially stale pending read.
    const pendingKey = key + (options.githubFresh ? '\nfresh' : '');
    if (method === 'GET' && this.pending.has(pendingKey)) return this.pending.get(pendingKey).then(response => response.clone());
    const run = this.queue.then(() => this.send(url, method, key, options));
    this.queue = run.catch(() => {});
    if (method === 'GET') {
      this.pending.set(pendingKey, run);
      run.then(() => this.pending.delete(pendingKey), () => this.pending.delete(pendingKey));
    }
    return run.then(response => response.clone());
  }
  async send(url, method, key, {githubFresh = false, ...options}) {
    await this.checkPause();
    const cached = this.cache.get(key);
    if (method === 'GET' && cached && !githubFresh && this.now() - cached.checkedAt < 60000) return cached.response.clone();
    const headers = new Headers(options.headers);
    if (method === 'GET' && cached?.etag) headers.set('If-None-Match', cached.etag);
    if (method !== 'GET') {
      const wait = 1000 - (this.now() - this.lastWrite);
      if (wait > 0) await this.sleep(wait);
      await this.checkPause();
      this.lastWrite = this.now();
    }
    let response;
    try { response = await this.fetch(url, {...options, method, headers, cache: 'no-store'}); }
    catch { throw new GithubRequestError('Não foi possível alcançar o GitHub. Confira a conexão e tente novamente; seus campos foram preservados.', 503); }
    const remaining = response.headers.get('x-ratelimit-remaining');
    const resetAt = Number(response.headers.get('x-ratelimit-reset')) * 1000;
    const retry = response.headers.get('retry-after');
    this.limits = {status: response.status, remaining: remaining === null ? null : Number(remaining), resetAt: resetAt || null, resource: response.headers.get('x-ratelimit-resource')};
    let detail = '';
    if (!response.ok && response.status !== 304) {
      try { detail = String((await response.clone().json()).message || ''); } catch { /* GitHub may send an empty error body. */ }
    }
    const limited = response.status === 429 || ((response.status === 403) && (remaining === '0' || retry !== null || /secondary rate limit|rate limit exceeded|abuse detection/i.test(detail)));
    if (limited || ((response.ok || response.status === 304) && remaining === '0')) {
      this.limits.limitKind = remaining === '0' ? 'primary' : 'secondary';
      const retryAt = retry === null ? 0 : Number.isFinite(Number(retry)) ? this.now() + Number(retry) * 1000 : Date.parse(retry) || 0;
      const primaryReset = remaining === '0' ? resetAt : 0;
      const fallback = !retryAt && !primaryReset ? this.now() + Math.min(300000, 60000 * 2 ** this.failures++) : this.now() + 1000;
      await this.pause(Math.max(fallback, retryAt, primaryReset));
      if (limited) throw this.limitedError();
    } else if (response.ok || response.status === 304) {
      this.failures = 0;
    }
    if (response.status === 401) throw new GithubRequestError('O token da demonstração expirou ou é inválido. Avise a equipe responsável.', 401);
    if (response.status === 403) throw new GithubRequestError('O GitHub negou a operação. Confira as permissões da integração.', 403);
    if (response.status === 304) {
      if (!cached) throw new GithubRequestError('O GitHub retornou uma versão sem conteúdo em cache. Tente novamente.', 503);
      cached.checkedAt = this.now();
      return cached.response.clone();
    }
    if (method === 'GET' && response.ok) {
      // Cache only response bytes in memory; decrypted accounts are never persisted.
      const bytes = (await response.clone().arrayBuffer()).byteLength;
      this.cachedBytes -= this.cache.get(key)?.bytes || 0;
      this.cache.set(key, {response: response.clone(), etag: response.headers.get('etag'), checkedAt: this.now(), bytes});
      this.cachedBytes += bytes;
      while (this.cache.size > 128 || this.cachedBytes > 16 * 1024 * 1024) {
        const oldest = this.cache.keys().next().value;
        this.cachedBytes -= this.cache.get(oldest).bytes;
        this.cache.delete(oldest);
      }
    } else if (method !== 'GET' && response.ok) {
      this.cache.clear();
      this.cachedBytes = 0;
    }
    this.notify();
    return response;
  }
}

const registryKey = Symbol.for('conexao.github.requests');
const registry = globalThis[registryKey] ||= new Map();
export function getSharedGithubRequest(config) {
  const key = `${config.owner}/${config.repo}\n${config.token}`;
  if (!registry.has(key)) registry.set(key, new GithubRequest(config));
  return registry.get(key);
}
