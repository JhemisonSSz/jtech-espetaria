# Jtech Espetaria

Cardápio digital de uma espetaria, com uma área para o dono editar os itens e os preços. É um projeto modelo do portfólio JhemisonTech: o nome e o telefone são fictícios.

- **Site:** https://jtech-espetaria.web.app
- **Área do administrador:** https://jtech-espetaria.web.app/#admin, ou pelo link "Área do administrador" no rodapé

Tudo é feito em HTML, CSS e JavaScript puros. O Firebase (Firestore e Auth) é carregado direto do CDN do Google, e por isso **não precisa de npm, Vite nem build**.

---

## O que o site faz

- **Cardápio público:** mostra os espetos (um preço por unidade) e as guarnições (preço Médio e Grande), além do botão "Pedir pelo WhatsApp".
- **Área do administrador (`#admin`):** depois do login, o dono altera nomes e preços, adiciona itens e exclui o que saiu do cardápio.
- **Atualização na hora:** quando o dono salva, o cardápio de quem está com o site aberto muda sozinho, sem recarregar a página.
- **Primeiro acesso:** enquanto o banco está vazio, o site mostra os itens de exemplo (`initialItems` em `main.js`). No primeiro login do admin, esses exemplos são gravados no banco.

---

## Estrutura de arquivos

```
jtech-espetaria/
  firebase.json          configuração do Firebase (só a pasta public/ vai para o site)
  .firebaserc            projeto Firebase: jtech-espetaria
  firestore.rules        regras de segurança do banco
  firestore.indexes.json índices do banco (nenhum especial)
  README.md              este arquivo
  public/
    index.html           as duas telas: cardápio e área do administrador
    style.css            cores, espaços e aparência no celular e no computador
    firebase-config.js   dados do projeto Firebase (não são senha)
    assets/whatsapp.svg  ícone do botão
    js/
      main.js            monta as telas e responde aos cliques e formulários
      db.js              ÚNICO arquivo que conversa com o Firebase (banco e login)
```

### Por onde começar a ler o código

No `main.js`, procure estes nomes:
- `initialItems`: os itens de exemplo.
- `renderPublicMenu`: monta o cardápio que o cliente vê.
- `renderAdminPanel`: monta a tela de edição.
- `handleSaveItem` e `handleDeleteItem`: salvam e excluem itens, usando as funções do `db.js`.
- `startFirebaseListeners`: fica "escutando" o banco e o login.

No `db.js`, cada função tem um nome que diz o que faz:
- `ouvirCardapio`
- `gravarItensIniciais`
- `salvarItem`
- `excluirItem`
- `entrar`
- `sair`

---

## Banco de dados (Firestore)

Só existe uma coleção, `menu_items`. Cada item tem estes campos:

| Campo | Espeto | Guarnição |
|---|---|---|
| `category` | `"skewer"` | `"side"` |
| `name` | nome | nome |
| `price` | preço da unidade | `null` |
| `mediumPrice` | `null` | preço do Médio |
| `largePrice` | `null` | preço do Grande, ou `null` se não tiver |
| `sortOrder` | posição na lista | posição na lista |

As regras (`firestore.rules`):
- **qualquer pessoa** pode ler o cardápio;
- **só o admin** pode criar, alterar ou excluir itens;
- o banco **recusa** itens com campos a mais ou com preço inválido.

---

## Login do administrador

Só pode editar quem entra com um e-mail que está na lista `emailsAdmin()` do `firestore.rules`. Hoje a lista tem só `teste@jtech.teste`, a conta de demonstração, criada no console do Firebase em **Authentication → Users**.

Para mostrar o painel a um cliente em potencial:
1. Envie o login e a senha.
2. Depois de usado, **troque a senha** no console.

---

## Editar, salvar e publicar

1. Edite os arquivos no VS Code.
2. Teste localmente: abra o `public/index.html` com o Live Server. Se abrir o arquivo com dois cliques, ele não funciona, por causa dos `import`.
3. Salve no Git:
   ```
   git add .
   git commit -m "o que mudou"
   git push
   ```
4. Publique **sempre com `--project`**. Sem ele, o Firebase pode publicar no projeto errado.
   ```
   firebase deploy --project jtech-espetaria --only hosting,firestore:rules
   ```
5. Confira o resultado numa **janela anônima**.
