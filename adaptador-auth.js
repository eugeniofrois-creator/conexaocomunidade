/* Adaptador de autenticação para a versão estática em desenvolvimento.
 * Instala-se antes dos scripts da página, com dependências fornecidas pelo chamador.
 */
export function instalarAuthIndividual({auth, fetchOriginal = window.fetch.bind(window), target = window}) {
  if (!auth || typeof auth.handle !== 'function') throw new Error('Autenticação não configurada.');
  target.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url || input.href, target.location.href);
    if (url.origin !== target.location.origin || url.pathname !== '/api/auth') return fetchOriginal(input, options);
    const method = String(options.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    try {
      let body = {};
      if (method !== 'GET' && options.body) {
        if (typeof options.body !== 'string') throw new Error('Dados de acesso inválidos.');
        body = JSON.parse(options.body);
      }
      const result = await auth.handle(method, body);
      return Response.json(result, {status: 200});
    } catch (error) {
      return Response.json({error: error.message || 'Não foi possível acessar a conta.'}, {status: 400});
    }
  };
}
