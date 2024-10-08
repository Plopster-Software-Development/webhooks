FROM node:20-alpine AS development

WORKDIR /usr/src/app

COPY package.json yarn.lock ./
RUN yarn install

COPY tsconfig.json nest-cli.json ./
COPY apps/whatsapp apps/whatsapp
COPY libs libs
COPY apps/whatsapp/prisma ./prisma

RUN npx prisma generate --no-engine
RUN yarn run build whatsapp

FROM node:20-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package.json yarn.lock ./
COPY apps/whatsapp/.env .env
COPY apps/whatsapp/prisma ./prisma

RUN npx prisma generate --no-engine
RUN yarn install --production

COPY --from=development /usr/src/app/dist ./dist

CMD ["node", "dist/apps/whatsapp/main"]