export async function readApiResponse(response:Response){
  const text=await response.text();let data;
  try{data=JSON.parse(text);}catch{
    const message=response.status===401?'Entre na sua conta para continuar.':response.status===403?'O acesso foi bloqueado. Abra o site no navegador e tente novamente.':'O servidor não respondeu com os dados esperados. Tente novamente em alguns instantes.';
    const error=new Error(message);Object.assign(error,{status:response.status});throw error;
  }
  if(!response.ok){const error=new Error(data.error||'Não foi possível concluir.');Object.assign(error,{status:response.status});throw error;}
  return data;
}
