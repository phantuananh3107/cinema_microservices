FROM node:18-alpine AS deps

WORKDIR /app
COPY package*.json ./

RUN npm install

FROM node:18-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8005

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/proto ./proto
COPY .env .env

EXPOSE 8005

CMD ["npm", "run", "start"]
