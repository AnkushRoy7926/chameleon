FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY tsconfig.json tsconfig.server.json ./
COPY games/ ./games/
COPY src/shared/ ./src/shared/
COPY src/server/ ./src/server/
COPY server.ts ./

EXPOSE 3001

CMD ["npx", "tsx", "server.ts"]
