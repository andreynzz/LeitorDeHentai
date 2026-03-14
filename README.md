# Leitor de hentai

Um bot de Discord que utiliza a API do nhentai para enviar doujins de tempos em tempos

## Estrutura do Projeto

- `index.js`: bootstrap principal do bot
- `bot/`: infraestrutura de runtime, sessoes, interacoes e onda automatica
- `commands/`: slash commands separados por dominio
- `lib/`: utilitarios compartilhados como config, loader de comandos e tempo
- `modules/`: regras de dominio, persistencia e embeds
- `test/`: testes basicos de regressao com `node:test`

## Testes

```bash
npm test
```

## 🚀 Como Instalar

Siga os passos abaixo para colocar o bot em funcionamento:

1. Pré-requisitos

    Node.js instalado (versão 18 ou superior recomendada pelas dependências do discord.js).

    Uma conta no Discord Developer Portal para criar o bot.

2. Clonar e Instalar Dependências

No seu terminal, execute:

```bash
# Clone o repositório (ou baixe os arquivos)
# Entre na pasta do projeto
npm install
```

Isso instalará pacotes essenciais como `discord.js`, `keyv`, `@keyv/sqlite` e `nhentai`.

3. Configuração (config.json)

    Crie um arquivo chamado config.json na raiz do projeto. Você pode usar o script de automação fornecido anteriormente ou criar manualmente com este formato:

    ```json
    {
    "token": "SEU_TOKEN_AQUI",
    "client_id": "ID_DO_BOT_AQUI",
    "guild_id": "ID_DO_SERVIDOR_DE_TESTES",
    "database_path": "database.sqlite",
    "gelbooru_api_key": "OPCIONAL_API_KEY_GELBOORU",
    "gelbooru_user_id": "OPCIONAL_USER_ID_GELBOORU"
    }
    ```

    - **token**: Chave secreta do seu bot.

    - **client_id**: ID da aplicação do bot.

    - **guild_id**: ID do servidor onde os comandos serão registrados imediatamente.

    - **gelbooru_api_key / gelbooru_user_id**: opcionais, usados pelo `/im` para autenticar no Gelbooru e aliviar limites/rate limit. Sem eles, o bot ainda tenta a busca publica e depois usa fallback.

4. Registrar Comandos Slash

    Os comandos precisam ser registrados no Discord antes de aparecerem no servidor.

    - **Para registro global (pode demorar)**: npm run register.

    - **Para registro imediato no seu servidor**: npm run register-guild.

5. Iniciar o Bot

    Para ligar o bot, execute:

    ```bash
    npm run main
    ```

## 🛠️ Comandos Disponíveis

- **/addchannel**: Adiciona um canal para receber envios automáticos. Você pode definir a tag e o intervalo de tempo (mínimo 10s).

- **/changechannel**: Altera as configurações de um canal já registrado.

- **/removechannel**: Para a "onda de hentai" e remove o canal do banco de dados.

- **/random**: Busca e envia um doujin aleatório imediatamente (com tag opcional).

- **/character**: Busca um personagem aleatório de um doujin e permite adicionar ao seu harem por botão.

- **/harem**: Lista os personagens que você já adicionou e mostra qual é o favorito atual.

- **/favorite**: Marca um personagem do seu harem como favorito usando o ID exibido em `/harem`.

- **/coins**: Mostra quantas moedas você ou outro usuário possui.

- **/tu**: Mostra em quanto tempo você pode casar novamente e quantos rolls ainda restam.

- **/admincoins**: Administra a carteira de moedas de um usuário com ações de adicionar, remover ou definir saldo.

- **/adminrolls**: Consulta ou reseta os rolls de um usuário.

- **/admininfamy**: Mostra o mural atual da infâmia ou força manualmente o reset semanal.

- **/admindrop**: Força um drop administrativo de personagem sem consumir rolls.

- **/divorce**: Remove um personagem do seu harem e conta esse divórcio para a infâmia semanal.

- **/wish**: Adiciona, remove ou lista personagens desejados. Quando um desejado aparece, o bot menciona quem tem ele na wish.

- **/im**: Pesquisa personagens parecidos com o nome informado.

- **/ima**: Pesquisa obras parecidas com o nome informado.

- **/top**: Lista os personagens com maior base score.

- **/infamia**: Mostra o mural da vergonha da semana com os personagens mais divorciados.

- **/perfil**: Exibe o perfil de mercado do personagem, incluindo score, valor, rank e status de infame.

## ⚠️ Observações Importantes

- **NSFW**: Certifique-se de usar o bot apenas em canais marcados como NSFW no Discord para evitar violações de termos de uso.

- **Cloudflare**: A biblioteca nhentai pode enfrentar bloqueios do Cloudflare. Se o bot parar de responder, pode ser necessário configurar um proxy como o FlareSolverr.
