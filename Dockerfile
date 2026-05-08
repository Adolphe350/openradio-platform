FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js evaluates server modules while building. Provide valid build-time
# values so env validation passes; docker-compose/Coolify inject the real
# production values at runtime.
ARG DATABASE_URL="postgresql://postgres:postgres@postgres:5432/openradio?schema=public"
ARG APP_BASE_URL="http://localhost:3000"
ARG STREAM_PUBLIC_BASE_URL="http://localhost:8080"
ENV DATABASE_URL=$DATABASE_URL
ENV APP_BASE_URL=$APP_BASE_URL
ENV STREAM_PUBLIC_BASE_URL=$STREAM_PUBLIC_BASE_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@postgres:5432/openradio?schema=public}" npm run prisma:generate
RUN DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@postgres:5432/openradio?schema=public}" \
    APP_BASE_URL="${APP_BASE_URL:-http://localhost:3000}" \
    STREAM_PUBLIC_BASE_URL="${STREAM_PUBLIC_BASE_URL:-http://localhost:8080}" \
    npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
COPY --from=builder /app ./
RUN chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 3000
CMD ["sh", "-c", "npm run prisma:push && npm run start"]
