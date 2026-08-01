# bip6tohevy — Amazfit Bip 6

Mini Program para Zepp OS que prepara a integração com o Hevy. O Side Service
roda no celular, consulta a API do Hevy e conversa com o app no relógio por
Bluetooth.

## Onde colocar a chave do Hevy

Abra `side-service/config.local.js` e substitua somente:

```js
export const HEVY_API_KEY = 'COLE_A_NOVA_CHAVE_AQUI'
```

por sua nova chave. Não coloque a chave em `app.js`, `page/` ou em qualquer
arquivo que será compartilhado. A chave antiga foi revogada.

## Estrutura

- `app.json`: configuração do Mini Program e Side Service.
- `app.js`: comunicação Bluetooth do relógio.
- `app-side/index.js`: ponte entre relógio e API Hevy.
- `side-service/hevy-api.js`: cliente HTTPS da API Hevy.
- `side-service/config.local.js`: configuração local da chave.
- `page/index.page.js`: tela de sincronização.

## Compilar e testar

1. Instale Node.js LTS.
2. Instale o Zeus CLI conforme a documentação oficial do Zepp OS.
3. Na pasta do projeto, execute `zeus dev` para abrir no simulador.
4. Para instalar no Bip 6, use a prévia em dispositivo real/QR code do Zeus
   ou publique o Mini Program na loja Zepp. O relógio precisa estar conectado
   ao app Zepp.

Documentação: https://docs.zepp.com/
