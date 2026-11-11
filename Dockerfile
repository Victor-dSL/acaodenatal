# Imagem oficial leve do Node.js
FROM node:20-alpine

# Diretório de trabalho dentro do container
WORKDIR /app

# Copia arquivos de dependência do backend
COPY backend/package*.json ./backend/

# Instala dependências de produção
RUN cd backend && npm ci --only=production || (cd backend && npm install --omit=dev)

# Copia todo o código da aplicação (backend e frontend)
COPY backend ./backend
COPY frontend ./frontend

# Porta padrão do Google Cloud Run (8080)
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Inicia o servidor backend (que serve tanto as rotas da API quanto o frontend)
CMD ["node", "backend/server.js"]

