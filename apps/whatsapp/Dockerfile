FROM node:alpine AS development

WORKDIR /usr/src/app

COPY package.json ./
COPY yarn.lock ./
COPY tsconfig.json tsconfig.json
COPY nest-cli.json nest-cli.json

RUN yarn install

COPY apps/whatsapp apps/whatsapp
COPY libs libs

COPY apps/whatsapp/prisma ./prisma
RUN npx prisma generate

RUN yarn run build webhook

FROM node:alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package.json ./
COPY yarn.lock ./

COPY apps/whatsapp/prisma ./prisma
RUN npx prisma generate

RUN yarn install --prod

COPY --from=development /usr/src/app/dist ./dist

CMD ["node", "dist/apps/whatsapp/main"]