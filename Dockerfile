FROM node:24-slim

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000

COPY package*.json ./

RUN npm ci --omit=dev
RUN npx playwright install --with-deps chromium

COPY . .

EXPOSE 4000

CMD ["npm", "start"]
