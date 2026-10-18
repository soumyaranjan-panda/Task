# Node 26 + npm 11, matching the toolchain that produced package-lock.json.
# A mismatch here makes `npm ci` reject the lock (different dedupe rules).
FROM node:26-alpine AS build
WORKDIR /app

# Dependencies first so a content-only change doesn't reinstall them.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# `node-server` instead of the default `vercel` preset: this image runs the app
# with `node`, not on Vercel.
ENV NITRO_PRESET=node-server
RUN npm run build && test -f .output/server/index.mjs


FROM node:26-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    API_PORT=8090 \
    HOST=0.0.0.0

# The API server imports `pg`, and Nitro leaves some packages external, so ship
# production dependencies rather than hand-picking one.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/.output ./.output
COPY --from=build /app/server ./server
COPY --from=build /app/scripts/serve.mjs ./scripts/serve.mjs

# Runs the site and the solutions API as one supervised process.
EXPOSE 8080
CMD ["node", "scripts/serve.mjs"]