# 🍔 FOOD RUSH — Aplicativo de Delivery Mobile

<div align="center">

![Versão](https://img.shields.io/badge/vers%C3%A3o-1.1.0-red?style=for-the-badge)
![Expo](https://img.shields.io/badge/Expo_SDK-57.0-black?style=for-the-badge&logo=expo)
![React Native](https://img.shields.io/badge/React_Native-0.86.3-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?style=for-the-badge&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)

<p align="center">
  <b>Aplicativo completo de delivery de refeições e gestão comercial para restaurantes e empreendedores.</b><br/>
  Compatibilidade nativa total com <b>Expo Go</b> (Android e iOS) e arquitetura moderna com <b>Expo Router</b>.
</p>

</div>

---

## 📱 Visão Geral

O **FOOD RUSH** foi desenvolvido para oferecer a melhor e mais rápida experiência gastronômica do mercado, conectando clientes famintos a restaurantes locais de excelência. Além do fluxo do consumidor final, o aplicativo conta com ecossistema completo para **Empreendedores**, permitindo cadastrar lojas, gerenciar cardápios e pratos, abrir/fechar estabelecimentos e receber pedidos em tempo real.

---

## ✨ Principais Funcionalidades

### 🛒 Para o Cliente
- **Catálogo Gastronômico Inteligente:** Grid responsivo de restaurantes com filtros por tempo de entrega, avaliação mínima (4.8+) e taxa grátis.
- **Busca em Tempo Real:** Filtragem instantânea por nome do prato, ingredientes ou categoria gastronômica.
- **Detecção de Localização via GPS:** Barra inteligente com solicitação de permissão nativa (`expo-location`), geocodificação reversa para captura automática da rua, bairro e cidade.
- **Carrinho de Compras Interativo:** Controle fino de quantidade, verificação de taxa de entrega e cálculo dinâmico de subtotal e total.
- **Checkout Seguro:** Suporte a múltiplas formas de pagamento (Pix, Cartão de Crédito/Débito e Dinheiro), seleção de endereço padrão e cupom de desconto.
- **Isolamento de Contas e Histórico Zerado:** Novos clientes iniciam com histórico de pedidos e lista de favoritos 100% limpos e individualizados por ID.

### 🏪 Para o Empreendedor (Minha Loja)
- **Cadastro de Loja Comercial:** Escolha do tipo de perfil (`Empreendedor`) no cadastro ou diretamente na aba de Perfil.
- **Painel da Loja no App:** Gestão completa dos dados do restaurante (nome, categoria, taxa e tempo médio de entrega).
- **Cadastro de Pratos no Cardápio:** Adição de novos pratos com nome, preço, descrição detalhada dos ingredientes e categoria.
- **Controle de Funcionamento:** Alternador em um toque para status **Aberta** (recebendo pedidos) ou **Fechada**.
- **Sincronização em Tempo Real:** As lojas e pratos criados aparecem imediatamente no feed principal da Home e na navegação do app.

### 🗺️ Rastreamento & Mapa Interativo
- **Permissão de GPS do Celular:** Solicitação amigável de autorização de uso de localização do dispositivo.
- **Pinos Dinâmicos no Mapa:** Identificação visual da Loja Parceira, do Entregador com radar expansivo e do Cliente ("Você aqui").
- **Simulação da Rota em Tempo Real:** Moto do entregador se deslocando pela rota planejada com telemetria ativa (distância restante e velocidade).
- **Alternador Noturno / Satélite:** Visualização cartográfica adaptável para dia ou noite.
- **Integração Externa com Apps de GPS:** Botão direto para traçar a rota real de navegação no **Google Maps, Waze ou Apple Maps**.
- **Comunicação Direta:** Botões dedicados para chamada telefônica direta ao entregador ou abertura do chat integrado.

---

## 🏗️ Arquitetura & Estrutura de Pastas

```bash
meu-site/
├── app/                          # Rotas estruturadas com Expo Router
│   ├── _layout.tsx               # Provider principal (Auth, Cart, Favorites, Orders)
│   ├── (tabs)/                   # Abas inferiores (Navegação com Safe Area)
│   │   ├── index.tsx             # Home: Catálogo, GPS e Filtros
│   │   ├── orders.tsx            # Pedidos: Em andamento e Histórico isolado
│   │   ├── favorites.tsx         # Favoritos salvos pelo cliente
│   │   └── profile.tsx           # Perfil do cliente e Painel do Empreendedor
│   ├── auth/                     # Autenticação (Login e Cadastro com tipo de conta)
│   ├── restaurant/[id].tsx       # Detalhes da loja parceira e cardápio
│   ├── cart.tsx                  # Sacola de compras e resumo financeiro
│   ├── checkout.tsx              # Finalização do pedido e escolha de pagamento
│   └── order/
│       ├── tracking.tsx          # Mapa interativo, GPS real e rastreamento
│       ├── success.tsx           # Confirmação do pedido e status
│       ├── review.tsx            # Avaliação de estrelas e comentários
│       └── chat.tsx              # Chat em tempo real com a loja/entregador
├── database/
│   └── init.sql                  # Schema relacional PostgreSQL (8 tabelas + seeds)
├── src/
│   ├── components/ui/            # Componentes reutilizáveis (Buttons, Inputs, Cards)
│   ├── contexts/                 # Context API isolada (Auth, Cart, Favorites, Order)
│   ├── mocks/                    # Dados de inicialização e fallback transparente
│   ├── services/                 # Cliente API com suporte a storage local e servidor
│   ├── theme/                    # Design System (Cores, Tipografia Poppins, Spacing)
│   ├── types/                    # Definições estritas de tipos em TypeScript
│   └── utils/                    # Formatadores de moeda, storage e helpers
├── docker-compose.yml            # Orquestração do PostgreSQL 16 e API REST
├── Dockerfile                    # Contêiner Node.js 20 Alpine para backend
├── server.js                     # Servidor Express REST com endpoints completos
└── app.json                      # Configuração Expo SDK 57 e plugins nativos
```

---

## 🚀 Como Executar o Projeto

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou 20 LTS)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)
- Aplicativo **Expo Go** instalado no smartphone ([Android na Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) ou [iOS na App Store](https://apps.apple.com/app/expo-go/id982107779))
- *(Opcional)* [Docker](https://www.docker.com/) para executar o banco PostgreSQL e a API em contêineres

---

### 2. Executando o App Mobile

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie o servidor Metro do Expo:
   ```bash
   npx expo start
   ```

3. Abra o app no celular:
   - **Android:** Abra o aplicativo **Expo Go** e escaneie o QR Code exibido no terminal.
   - **iOS:** Abra a câmera nativa do iPhone, aponte para o QR Code e toque no link para abrir no Expo Go.
   - **Web / Emulador:** Pressione `w` para abrir no navegador, `a` para emulador Android ou `i` para simulador iOS.

---

### 3. Executando o Banco de Dados e API via Docker (Opcional)

O Food Rush conta com **fallback inteligente**: o aplicativo mobile funciona com persistência 100% autônoma via AsyncStorage mesmo sem o backend rodando. Caso deseje subir o banco de dados relacional e a API completa em Docker:

1. Configure as variáveis de ambiente baseadas no exemplo:
   ```bash
   cp .env.example .env
   ```

2. Suba os contêineres do banco PostgreSQL e da API REST:
   ```bash
   docker compose up -d
   ```

3. Para verificar os logs dos serviços:
   ```bash
   docker compose logs -f
   ```

4. Para parar os contêineres:
   ```bash
   docker compose down
   ```

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Framework Mobile** | React Native 0.86.3 com Expo SDK 57 |
| **Navegação & Roteamento** | Expo Router 57 (File-based routing) |
| **Linguagem** | TypeScript 6.0 com checagem estrita |
| **Localização & GPS** | Expo Location (`expo-location`) |
| **Persistência Local** | `@react-native-async-storage/async-storage` |
| **Design & UI** | Google Fonts Poppins, Safe Area Context, Vector Icons |
| **Backend API** | Node.js 20, Express 5 REST API |
| **Banco de Dados** | PostgreSQL 16 Relacional com índices e constraints |
| **Containerização** | Docker & Docker Compose |

---

## 📄 Licença

Este projeto é desenvolvido para fins comerciais e de portfólio por [Jose Willians](https://github.com/JoseWillians).
Todos os direitos reservados.

