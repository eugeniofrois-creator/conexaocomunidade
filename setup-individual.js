import {guardar,informacoes,remover} from './configuracao-segura.js';
const form=document.querySelector('#config'), status=document.querySelector('#status');
try {const current=informacoes();if(current)for(const k of ['owner','repo','branch'])form.elements[k].value=current[k]||'';}catch (_) {}
form.addEventListener('submit',async event=>{
 event.preventDefault();const d=Object.fromEntries(new FormData(form));status.textContent='Verificando acesso ao repositório…';
 try {
  const url=`https://api.github.com/repos/${encodeURIComponent(d.owner)}/${encodeURIComponent(d.repo)}`;
  const r=await fetch(url,{headers:{Authorization:`Bearer ${d.token}`,Accept:'application/vnd.github+json'}});
  if(!r.ok)throw Error(`Não foi possível consultar o repositório (${r.status}).`);
  const repo=await r.json();if(!repo.permissions?.push)throw Error('O token não tem permissão de escrita nesse repositório.');
  await guardar(d);form.elements.token.value='';form.elements.password.value='';status.textContent='Configuração cifrada e salva neste navegador.';
 } catch(e){status.textContent=e.message||'Não foi possível verificar o acesso.';}
});
document.querySelector('#remove').addEventListener('click',()=>{remover();status.textContent='Configuração removida deste navegador.';});
