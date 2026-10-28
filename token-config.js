/* A chave acompanha o site: criptografia reversível para ofuscação, não segredo. */
export async function unlockConfiguration(config) {
  if (!config?.tokenEnvelope) return config;
  const envelope = config.tokenEnvelope;
  if (envelope.algorithm !== 'AES-256-GCM') throw Error('Formato de conexão inválido.');
  const decode = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', decode(config.publicWrappingKey), 'AES-GCM', false, ['decrypt']);
  const clear = await crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv: decode(envelope.iv),
    additionalData: new TextEncoder().encode(config.owner + '/' + config.repo)
  }, key, decode(envelope.body));
  const { tokenEnvelope, publicWrappingKey, ...metadata } = config;
  return { ...metadata, token: new TextDecoder().decode(clear) };
}
