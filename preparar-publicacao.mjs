/* Preparação do artefato Pages de demonstração. Segredos usados aqui ficam visíveis no site gerado. */
import {readFile,writeFile,readdir} from 'node:fs/promises';
const {PROTOTYPE_GITHUB_TOKEN:token,GITHUB_REPOSITORY:repository}=process.env;
// Chave pública do protótipo: não substitui proteção de dados.
const password='demo-conexao-4a705f2b-4f15-4a71-91ec-a40459ff94b4';
if(!token||!repository)throw Error('Configure os dois secrets do protótipo no repositório.');
const [owner,repo]=repository.split('/');
await writeFile('conexao-config.js','window.CONEXAO_CONFIG='+JSON.stringify({owner,repo,branch:process.env.CONEXAO_BRANCH||'main',token,password})+';\n');
for(const file of await readdir('.'))if(file.endsWith('.html')){
 const html=await readFile(file,'utf8');
 if(html.includes('pages-independent.js')&&!html.includes('conexao-config.js'))await writeFile(file,html.replace(/(<script\s+src=["'][^"']*pages-independent\.js["'][^>]*><\/script>)/,'<script src="/conexaocomunidade/conexao-config.js"></script>\n    $1'));
}
