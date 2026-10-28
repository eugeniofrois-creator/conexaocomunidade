/* Endereços publicados e referências aproximadas têm origem e precisão distintas. */
export function completarEndereco(row, book) {
  if (row.sourceType !== 'survey') return row;
  const published = book?.publishedAddresses?.[row.id];
  const digits = value => String(value || '').replace(/\D/g, '');
  if (published?.display && published.sourceUrl?.startsWith('https://') &&
      published.name === row.name && digits(published.phone) === digits(row.contact) &&
      published.originalAddress === row.address) {
    return {
      ...row,
      address: published.display,
      addressOriginal: row.address,
      addressApproximate: false,
      addressSource: published.sourceUrl,
      addressCheckedAt: published.checkedAt
    };
  }
  // Um endereço fornecido no cadastro sempre prevalece sobre a rua inferida do mapa.
  if (!/^Rua e número não publicados(?:,|$)/i.test(String(row.address || ''))) return row;
  const ref = book?.records?.[row.id];
  if (!ref?.street || ref.approximate !== true || !Number.isFinite(ref.distanceMeters) || ref.distanceMeters > 80) return row;
  return {
    ...row,
    address: ref.display,
    addressOriginal: row.address,
    addressApproximate: true,
    addressSource: 'https://www.openstreetmap.org/way/' + encodeURIComponent(ref.osmWay)
  };
}
