# Consumo da API e testes do GitHub Pages

Contribuição baseada no commit `7cf9fd7b050ad3e3565845e3c71bd18172b0dda5`.
A versão Pages usa os HTML e JavaScript da raiz; `public/` continua sendo a interface do servidor. Os testes exercitam a raiz e a preparação real da publicação em uma pasta temporária.

## Executar

Requisitos: Node 22 e pnpm 11.25.0, conforme o projeto.

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm exec playwright-core install --with-deps chromium firefox
pnpm run test:pages
```

- `test:pages:unit`: verifica transporte, pausas, cache, revisões e a sincronização já existente.
- `test:pages:browser`: verifica Chromium e Firefox. `PAGES_BROWSERS=chromium` ou `firefox` seleciona apenas um motor; `CHROMIUM_PATH` permite usar um Chromium local.
- As respostas públicas cifradas são geradas com dados sintéticos. A configuração é preparada com credencial fictícia; todas as chamadas GitHub são interceptadas. Nenhum teste consulta ou grava a base ativa.
- O CI roda em pull requests e na branch da contribuição. A publicação em main chama a mesma verificação antes de inicializar contas ou disponibilizar segredos; uma falha impede a publicação.

## Tratamento dos limites

Todas as chamadas da integração Pages à API passam por `github-request.js`, inclusive listagens e a conferência da conexão pela administração. Instâncias compartilham uma fila por credencial e repositório, GETs simultâneos, respostas em memória e ETags. O cache é limitado a 128 respostas e 16 MiB. Listagens com o mesmo SHA não exigem reler cada cadastro; uma gravação confirmada invalida as respostas.

A atualização normal ocorre a cada 60 segundos, somente com a tela visível e sem leitura anterior. A edição da empresa também impede a consulta automática enquanto houver campos alterados. Contas são revalidadas antes das ações autenticadas; gravações conferem a revisão atual e não são repetidas automaticamente. Requisições mutativas são espaçadas por pelo menos um segundo dentro da página.

O transporte reconhece 403/429 de limite, `Retry-After` em segundos ou data HTTP e o prazo de reinício quando `x-ratelimit-remaining` é zero. Bloqueios secundários sem prazo aguardam inicialmente 60 segundos, com espera crescente até cinco minutos. Um 401 ou 403 de permissão mantém sua classificação. Mesmo uma resposta 200 que consuma a última chamada inicia a pausa para as próximas consultas.

Somente o prazo numérico da pausa é guardado no armazenamento local, sob uma chave derivada da impressão digital da credencial. Outras abas e recarregamentos respeitam esse prazo. Tokens, respostas e cadastros decifrados não são persistidos pelo cache.

Catálogo e mapa continuam disponíveis pelo snapshot público durante falhas da API. A resposta acrescenta `sync: {stale, retryAt?, message?}` e `accountVerified`, sem retirar os campos existentes. O fallback remove dados de conta, revisões, propriedade e notas privadas e não libera ações autenticadas. A interface informa possível desatualização e o horário para nova tentativa; os campos digitados e a sessão permanecem guardados.

## Verificação e limites da entrega

A suíte cobre limite primário e secundário, recuperação, distinção de credenciais, bloqueio de chamadas enfileiradas, ETag/304, invalidação, revisão antiga e reaproveitamento por SHA. Em Chromium e Firefox, cobre assets em subpasta, catálogo, mapa, cadastro, login, criação/edição de empresa, erro de gravação, preservação do formulário e fallback durante bloqueio após recarregar.

A falha real relatada não foi reproduzida usando o token de produção. Os cabeçalhos sanitizados da última resposta ficam disponíveis em `transport.status()` e `window.ConexaoGithubStatus` (`status`, `remaining`, `resetAt`, `resource`, `limitKind`); não há registro da credencial. O diagnóstico de primário versus secundário deve usar a resposta real, sem provocar carga de teste na API ativa.

O cache e a fila não coordenam dispositivos independentes. O orçamento continua compartilhado pelo usuário do token. O snapshot público pode estar desatualizado enquanto a API estiver indisponível; o aviso permanece visível. Esta entrega preserva os envelopes e a organização atual dos dados e não transforma a API do GitHub em um banco com capacidade ilimitada.

Referências: [limites da API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) e [boas práticas](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api).
