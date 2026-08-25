FROM node:20-alpine

WORKDIR /app

# better-sqlite3 ships prebuilt binaries for most platforms, but these build
# tools are kept as a fallback so `npm install` still succeeds by compiling
# from source if no prebuilt binary matches this exact image.
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

ENV PORT=4000
EXPOSE 4000

CMD ["node", "src/server.js"]
