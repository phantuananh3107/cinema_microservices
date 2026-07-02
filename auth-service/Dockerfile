FROM node:18-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm install

FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY proto ./proto

EXPOSE 3001

CMD ["npm", "run", "start"]
