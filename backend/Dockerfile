FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY src/ ./src/

RUN mkdir -p /app/uploads

EXPOSE 5000
CMD ["node", "src/index.js"]