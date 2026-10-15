# Розклад ІТ коледжу — образ для будь-якого сервера з Docker
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATABASE_URL="file:/data/rozklad.db"
COPY --from=build /app ./
RUN chmod +x docker-entrypoint.sh
VOLUME /data
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
