# Zero-setup way to run taggatu: `docker build -t taggatu . && docker run --rm -p 4173:4173 taggatu`
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 4173
CMD ["npm", "run", "serve"]
