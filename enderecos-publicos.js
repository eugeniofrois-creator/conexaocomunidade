/* A referência de rua não identifica o imóvel nem substitui o endereço confirmado pelo responsável. */
export function completarEndereco(row, book) {
  if(row.sourceType!=='survey'||!/^Rua e número não publicados(?:,|$)/i.test(String(row.address||'')))return row;
  const ref=book?.records?.[row.id];
  if(!ref?.street||ref.approximate!==true||!Number.isFinite(ref.distanceMeters)||ref.distanceMeters>80)return row;
  return {...row,address:ref.display,addressOriginal:row.address,addressApproximate:true,addressSource:'https://www.openstreetmap.org/way/'+encodeURIComponent(ref.osmWay)};
}
