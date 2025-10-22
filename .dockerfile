# syntax=docker/dockerfile:1

# 1) Dependências
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# 2) Build
FROM deps AS build
WORKDIR /app
COPY . .
# Funciona para Vite e CRA (ambos usam "npm run build")
RUN npm run build

# 3) Runtime Nginx (serve arquivos estáticos)
FROM nginx:1.27-alpine AS runtime
# Limpa a página padrão
RUN rm -rf /usr/share/nginx/html/*

# Vite gera em /dist; CRA gera em /build — copie o que você tiver:
# Descomente apenas um dos COPY abaixo
# Vite:
COPY --from=build /app/dist /usr/share/nginx/html
# CRA:
# COPY --from=build /app/build /usr/share/nginx/html

# Config SPA: qualquer rota cai no index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
