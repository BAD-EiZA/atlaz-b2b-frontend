FROM node:20-alpine3.20 AS base
RUN npm install -g pnpm@9.0

FROM base AS builder
WORKDIR /app

ARG NEXT_PUBLIC_URL_BACKEND
ENV NEXT_PUBLIC_URL_BACKEND=$NEXT_PUBLIC_URL_BACKEND

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

RUN pnpm run build
RUN pnpm prune --prod

FROM base AS runner
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 3025

CMD ["pnpm", "start"]
