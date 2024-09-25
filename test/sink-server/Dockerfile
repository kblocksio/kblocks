FROM node:20-alpine

RUN apk add --no-cache curl npm nodejs
RUN npm install -g typescript

RUN mkdir /app
WORKDIR /app

COPY package.json .
RUN npm install

COPY src .
COPY tsconfig.json .

RUN CI=1 npm run test
RUN tsc

CMD [ "node", "main.js" ]

