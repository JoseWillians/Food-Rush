# Imagem oficial leve do Node.js
FROM node:20-alpine

# Diretório de trabalho no container
WORKDIR /app

# Variáveis de ambiente de produção
ENV NODE_ENV=production
ENV PORT=3000

# Instala estritamente as dependências necessárias para a API backend (Express e PostgreSQL).
# Evita baixar os 700+ pacotes do Expo / React Native do app mobile, garantindo
# um build ultrarrápido (menos de 5 segundos) e consumo mínimo de memória.
RUN npm init -y && \
    npm install --production --no-audit --no-fund express@^5.2.1 pg@^8.23.1

# Copia o código do servidor Express e os dados de seed/init
COPY server.js ./
COPY database ./database

# Garante a existência do diretório de uploads persistido
RUN mkdir -p public/uploads

# Expõe a porta 3000
EXPOSE 3000

# Garante permissões adequadas e executa com usuário não-root por segurança
RUN chown -R node:node /app
USER node

# Inicialização do backend
CMD ["node", "server.js"]
