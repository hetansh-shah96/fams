FROM node:20-alpine
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# Build
COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080
ENV AUTH_TRUST_HOST=true

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
