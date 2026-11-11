# 🍔 FOOD RUSH — Aplicativo de Delivery Mobile

<div align="center">

![Versão](https://img.shields.io/badge/vers%C3%A3o-1.1.0-red?style=for-the-badge)
![Expo](https://img.shields.io/badge/Expo_SDK-58.0-black?style=for-the-badge&logo=expo)
![React Native](https://img.shields.io/badge/React_Native-0.88.1-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?style=for-the-badge&logo=typescript)
![Express](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express)

<p align="center">
  <b>Aplicativo de delivery de refeições para clientes e empreendedores.</b><br/>
  Feito com <b>Expo Router</b> e <b>TypeScript</b>, roda no <b>Expo Go</b>, no navegador e em emuladores.
</p>

</div>

---

## 📱 Visão Geral

O **FOOD RUSH** conecta clientes a restaurantes locais. O cliente escolhe a loja, monta o carrinho, finaliza o pedido e acompanha a entrega. O **empreendedor** cadastra a própria loja, monta o cardápio e recebe os pedidos pelo app.

O app **funciona sem servidor**: os dados ficam salvos no aparelho (AsyncStorage). Quando o servidor (`server.js`) está ligado, o app também envia e busca os dados nele.

---

## ✨ Funcionalidades

### 👤 Conta
- **Login com validação:** formato do e-mail, senha de no mínimo 6 caracteres, conta existente e senha correta.
- **Cadastro** de cliente ou empreendedor: e-mail com formato válido, e-mail que ainda não está cadastrado, celular com máscara `(98) 99999-9999` e confirmação de senha. Cada erro aparece embaixo do campo.
- **Esqueceu a senha:** redefine a senha no próprio aparelho, sem envio de e-mail.
- **Perfil:** dados pessoais, foto, endereços, formas de pagamento e notificações.

> As contas ficam salvas no aparelho porque o projeto não tem um servidor de usuários. Num app real, a senha ficaria no servidor, protegida com hash.

### 🛒 Cliente
- **Tela inicial:** busca, categorias, filtros rápidos e **ordenação** (melhor nota, mais rápido, mais barato). Os filtros escolhidos ficam salvos.
- **Página da loja:** cardápio, avaliações da loja, favoritar a loja e favoritar pratos.
- **Carrinho:** quantidade, **observação por item** ("sem cebola") e **taxa de entrega da própria loja**. Só aceita itens de uma loja por vez; para trocar de loja, o app pede confirmação.
- **Checkout:** endereço de entrega, forma de pagamento (Pix, crédito, débito, dinheiro) e cupons (`FOODRUSH10`, `FRETEGRATIS`, `PRIMEIRACOMPRA`).
- **Acompanhamento:** etapas do pedido (realizado → em preparo → saiu para entrega), mapa **simulado** com a moto do entregador e localização real do celular (`expo-location`).
- **Chat do pedido:** conversa **simulada** com respostas automáticas. As mensagens ficam salvas por pedido.
- **Avaliação:** estrelas e comentário. A nota média da loja é recalculada na hora.
- **Pedidos e favoritos:** histórico, "pedir novamente" e listas de lojas e pratos favoritos.

### 🏪 Empreendedor (tela "Minha Loja")
- Cadastro da loja no cadastro de conta ou pelo perfil.
- **Cardápio:** adicionar, **editar e excluir pratos**, com galeria de fotos e sugestão automática da foto pelo nome do prato.
- **Dados da loja:** editar nome, categoria, tempo e taxa de entrega; **abrir ou fechar a loja** (loja fechada não recebe pedidos); **excluir a loja**.
- **Pedidos recebidos:** aceitar o pedido, enviar para entrega e ver as observações de cada item.

---

## 🏗️ Estrutura de Pastas

```bash
Food-Rush/
├── app/                          # Telas (rotas do Expo Router)
│   ├── _layout.tsx               # Layout raiz: fontes e Contexts (Auth, Cart, Favorites, Order)
│   ├── index.tsx                 # Abertura: decide entre boas-vindas, login ou início
│   ├── onboarding/               # Telas de boas-vindas
│   ├── auth/login.tsx            # Login, cadastro e redefinição de senha
│   ├── (tabs)/                   # Abas: Início, Pedidos, Favoritos e Perfil
│   ├── restaurant/[id].tsx       # Página da loja (cardápio e avaliações)
│   ├── cart.tsx                  # Carrinho
│   ├── checkout.tsx              # Finalização do pedido
│   ├── order/                    # Acompanhamento, chat, avaliação e sucesso
│   └── store/                    # Painel do empreendedor e pedidos da loja
├── src/
│   ├── components/
│   │   ├── ui/                   # Botão, campo de texto, cabeçalho, BottomSheet, EmptyState...
│   │   ├── checkout/             # Partes do checkout (endereço, pagamento, cupom, resumo)
│   │   ├── profile/              # Janelas do perfil (dados, endereços, pagamentos...)
│   │   └── tracking/             # Mapa, entregador e linha do tempo do pedido
│   ├── constants/                # Categorias de loja e galeria de fotos de comida
│   ├── contexts/                 # Estado global: Auth, Cart, Favorites e Order
│   ├── hooks/                    # useDeviceLocation (GPS do celular)
│   ├── mocks/                    # Dados locais (lidos de database/seed.json)
│   ├── services/api.ts           # Acesso aos dados: servidor com reserva local
│   ├── theme/                    # Cores, espaçamentos e tipografia (Poppins)
│   ├── types/                    # Tipos TypeScript
│   └── utils/                    # Validação, preços/cupons, diálogos, armazenamento
├── database/
│   ├── seed.json                 # Lojas, pratos, categorias e avaliações (app e servidor)
│   └── init.sql                  # Esquema PostgreSQL (8 tabelas) — ainda não usado pelo servidor
├── tests/pricing.test.ts         # Testes dos cálculos de total e cupom
├── server.js                     # Servidor Express (API REST)
├── .env.example                  # Modelo das variáveis de ambiente
├── Dockerfile / docker-compose.yml
└── app.json                      # Configuração do Expo
```

---

## 🚀 Como Executar

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) 22.18 ou mais recente (para rodar os testes em TypeScript sem instalar nada a mais)
- App **Expo Go** no celular ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))
- *(Opcional)* [Docker](https://www.docker.com/)

> **Versão do Expo Go:** o projeto usa a **SDK 57**. O Expo Go precisa ser compatível com essa SDK. No iPhone, a App Store só oferece a versão mais recente do Expo Go; se ela for de outra SDK, use a versão web ou atualize o projeto para a mesma SDK.

### 2. App

```bash
npm install
npx expo start
```

- **Celular:** leia o QR Code com o Expo Go (o celular e o computador precisam estar na mesma rede Wi-Fi).
- **Navegador:** pressione `w` no terminal ou rode `npm run web`.
- **Emulador:** `a` (Android) ou `i` (iOS).

### 3. Servidor (opcional)

O app funciona sem ele. Para ligar o servidor, em outro terminal:

```bash
npm run server
```

O servidor sobe em `http://localhost:3000`. No Expo Go, o app descobre sozinho o IP do computador. Se o servidor estiver em outro endereço, crie o arquivo `.env` a partir do exemplo e preencha `EXPO_PUBLIC_API_URL`:

```bash
cp .env.example .env
```

**Principais rotas:** `GET /api/restaurants`, `GET /api/products?restaurantId=`, `GET|POST /api/restaurants/:id/reviews`, `POST /api/partners/register`, `PUT|DELETE /api/restaurants/:id`, `PATCH /api/restaurants/:id/status`, `POST /api/restaurants/:id/products`, `PUT|DELETE /api/products/:id`, `GET|POST /api/orders`, `PATCH /api/orders/:id/status`.

> O servidor guarda os dados **em memória**, carregados de `database/seed.json`. Ao reiniciar, as alterações somem. Se `DATABASE_URL` estiver configurada, ele apenas testa a conexão com o PostgreSQL. As consultas ao banco ainda não foram implementadas.

### 4. Docker (opcional)

```bash
cp .env.example .env
docker compose up -d        # sobe o PostgreSQL e o servidor
docker compose logs -f      # acompanha os logs
docker compose down         # desliga
```

### 5. Testes

```bash
npm test
```

Roda os testes de `tests/` com o test runner do próprio Node: subtotal, total, cupons de valor fixo e de frete grátis, cupom inválido e total que não fica negativo.

---

## 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| **Mobile** | React Native 0.88 com Expo SDK 58 |
| **Navegação** | Expo Router (rotas por arquivos) |
| **Linguagem** | TypeScript (modo estrito) |
| **Estado global** | React Context API |
| **Armazenamento local** | AsyncStorage |
| **Localização** | expo-location |
| **Interface** | Fonte Poppins, Ionicons, Safe Area Context |
| **Servidor** | Node.js + Express 5 |
| **Banco (preparado)** | PostgreSQL 16 via Docker, esquema em `database/init.sql` |
| **Testes** | `node:test` (test runner nativo do Node) |

---

## 📄 Licença

Este projeto é desenvolvido para fins comerciais e de portfólio por Jose Willians, Paulo Leão, André Lucas, Lucas Eduardo, Luis Felipe e Policarpo Sousa.
Todos os direitos reservados.
