# Conexão Comunidade — Android 0.1 de testes

Aplicativo Android leve, sem bibliotecas nativas por arquitetura. Abre o site HTTPS dentro de uma WebView, com o mesmo servidor e os mesmos dados. Atualizações do site aparecem no aplicativo sem reinstalar o APK. Não contém senhas de contas, tokens administrativos nem chaves do servidor.

## Compatibilidade

- Configuração mínima: Android 6.0 (API 23).
- Compilado para API 35; WebView/Chromium 100 ou superior recomendado. Se o componente estiver antigo, aparece uma orientação para atualizar ou abrir em navegador atualizado.
- Não foi executado em celular ou emulador nesta entrega; a compilação, manifesto e assinatura foram verificados. Compatibilidade em aparelhos reais ainda deve ser testada, principalmente Android 6/7/8.
- Internet necessária para catálogo, login, salvamento, fotos e mapas. Não é uma versão offline do servidor.

## Funções preservadas

Busca e sugestões, empresas e fotos, limite de 10 fotos por empresa, endereço, proximidade com GPS autorizado, mapa comunitário, Google Maps externo, relatos anônimos/identificados, login da empresa, edição de dados e fotos, administração autorizada e Sobre. Voz de partida usa TextToSpeech em português do Android; o mute interrompe a fala. Instruções por curva continuam no Google Maps. O seletor de fotos usa o seletor do sistema, sem pedir acesso geral à galeria. Google Maps, telefone e links externos abrem nos aplicativos do aparelho.

O acesso local de empresas funciona dentro do aplicativo. Para login com ChatGPT, use a versão no navegador: políticas do provedor podem impedir autenticação em WebView. Sessões do aplicativo e navegador são independentes.

## Gerar APK de testes

Instale JDK 17+, Android SDK Platform 35 e Build Tools 35.0.0. No Linux/macOS:

```bash
export ANDROID_SDK_ROOT=/caminho/para/android-sdk
./build-apk.sh
```

O script informa a localização do APK assinado com chave de depuração. A chave não está neste projeto: fica em `~/.android/debug.keystore`. Preserve-a para atualizar instalações de teste; com outra chave será necessário desinstalar a anterior. Este APK é para apresentação/testes, sem publicação na Play Store. Uma versão comercial deve receber assinatura de produção, versão própria e validação em aparelhos reais.

## Testes no celular

1. Instale o APK e confira busca, sugestões e endereços sem login.
2. Autorize e negue GPS; verifique distância e abertura do Google Maps.
3. Ative e silencie o guia por voz.
4. Entre como empresa, envie/substitua/exclua fotos e confira o limite de 10.
5. Saia e verifique que dados privados não ficam disponíveis.
6. Envie um relato sem nome e outro identificado; confira a caixa com perfil de administrador.
7. Use Voltar entre início, mapa, cadastro e detalhes.
8. Teste sem internet e com o WebView desatualizado.

Site: https://conexao-comunidade-frei-damiao.eugenio-frois.chatgpt.site
