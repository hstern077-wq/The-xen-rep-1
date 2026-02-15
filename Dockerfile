FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /data/photos

ENV PORT=3000
ENV PHOTOS_DIR=/data/photos
ENV NODE_OPTIONS="--max-old-space-size=450"

EXPOSE 3000

CMD ["node", "server/index.js"]
