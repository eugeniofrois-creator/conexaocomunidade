export class RequestError extends Error {
  constructor(message:string,public status:number){super(message);}
}
async function boundedBytes(req:Request,max:number){
  const length=req.headers.get('content-length');
  if(length!==null&&Number(length)>max)throw new RequestError('Conteúdo muito grande.',413);
  const reader=req.body?.getReader();if(!reader)return new Uint8Array();
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new RequestError('Conteúdo muito grande.',413);}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;
}
export async function readJsonBody(req:Request,max:number){
  if(req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new RequestError('Envie os dados em JSON.',415);
  const bytes=await boundedBytes(req,max);let data;
  try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new RequestError('Dados JSON inválidos.',400);}
  if(!data||typeof data!=='object'||Array.isArray(data))throw new RequestError('Dados inválidos.',400);
  return data;
}
export async function readImageForm(req:Request){
  if(!req.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data;'))throw new RequestError('Envie a imagem pelo formulário.',415);
  const bytes=await boundedBytes(req,5500000);
  try{return await new Request(req.url,{method:'POST',headers:{'Content-Type':req.headers.get('content-type')!},body:bytes as unknown as BodyInit}).formData();}catch{throw new RequestError('Formulário de imagem inválido.',400);}
}
