# Imagem oficial leve do Node.js
FROM node:20-alpine

# Diretório de trabalho no container
WORKDIR /app

# Variável de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Copia os manifestos de dependência
COPY package*.json ./

# Instala dependências de produção
RUN npm install --omit=dev --ignore-scripts

# Copia o código do servidor e o banco de dados
COPY server.js ./
COPY database ./database

# Expõe a porta da API
EXPOSE 3000

# Comando de inicialização
CMD ["node", "server.js"]

