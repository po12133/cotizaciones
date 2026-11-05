# Imagen para Coolify (Build Pack: Dockerfile, Base Directory: /modaflow).
# Sirve el sitio y el endpoint de IA en el puerto 8080. La API key se define en las variables de entorno de Coolify.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production MODAFLOW_DOCKER=1 PORT=8080 TRUST_PROXY=1
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- "http://$(hostname):${PORT:-8080}/api/ia/estado" >/dev/null || exit 1
CMD ["node", "server/server.mjs"]
