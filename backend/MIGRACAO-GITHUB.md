# Ponte GitHub do Conexão Comunidade

O repositório público pode guardar o código da interface e do servidor. A publicação no GitHub Pages e a conexão entre o endereço do Pages e as APIs ainda precisam de adaptação e testes: caminhos absolutos, autenticação, cookies, imagens e acesso entre origens.

## Registros em JSON

Contas, empresas, imagens e relatos continuam no armazenamento protegido do servidor. A rotina de espelhamento aceita repositório privado por padrão. A pedido do responsável, o servidor também pode permitir um repositório público com GITHUB_ALLOW_ENCRYPTED_PUBLIC=true; somente envelopes JSON com os campos de criptografia esperados são aceitos. Um arquivo público cifrado continua disponível para cópia por qualquer pessoa, e a confidencialidade depende da chave mantida em segurança.

Variáveis do servidor: GITHUB_DATA_OWNER, GITHUB_DATA_REPO, GITHUB_DATA_BRANCH, GITHUB_DATA_TOKEN, GITHUB_SYNC_JOB_KEY e, somente se autorizado, GITHUB_ALLOW_ENCRYPTED_PUBLIC. O token e a chave da rotina devem ser configurados como segredos do serviço, nunca no site, repositório ou navegador. Login de pessoas e chaves criptográficas continuam no servidor.

Alterações e exclusões entram na fila. O envio lê a última versão do arquivo; se o GitHub estiver indisponível, a fila permanece pendente. Git mantém histórico: excluir um arquivo da versão atual não elimina cópias dos commits anteriores. Escolher retenção e exclusão com a equipe antes de sincronizar dados pessoais.

Para enfileirar registros já existentes, a rotina autorizada pode chamar POST /api/github-sync com o segredo da rotina no cabeçalho Authorization e JSON {"action":"backfill"}. Se a resposta indicar done=false, enviar o cursor recebido na chamada seguinte. Chamadas POST sem esse corpo drenam a fila. Testar com dados fictícios e conferir restauração antes de ativar com dados reais.

O servidor continua necessário para autenticar, guardar as chaves e receber alterações. GitHub Pages sozinho não grava arquivos de usuários nem executa estas APIs. Os nomes de variáveis citados são apenas exemplos; nenhum token está neste arquivo.
