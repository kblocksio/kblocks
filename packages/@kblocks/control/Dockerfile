FROM node:20-alpine

RUN apk add --no-cache curl npm nodejs
RUN npm install -g typescript

RUN mkdir /app
WORKDIR /app

# Copy package.json and package-lock.json of the root workspace
COPY ./package.json ./package-lock.json ./

# Copy the workspace packages' package.json files
COPY ./packages/@kblocks/api/package.json ./packages/@kblocks/api/
COPY ./packages/@kblocks/common/package.json ./packages/@kblocks/common/
COPY ./packages/@kblocks/control/package.json ./packages/@kblocks/control/

# Install dependencies in the root (this will install and link workspace packages)
RUN npm install

# Copy the workspace packages' source code
COPY ./packages/@kblocks/api ./packages/@kblocks/api
COPY ./packages/@kblocks/common ./packages/@kblocks/common
COPY --link ./packages/@kblocks/control/src ./packages/@kblocks/control
COPY ./packages/@kblocks/control/tsconfig.json ./packages/@kblocks/control

WORKDIR /app/packages/@kblocks/api
RUN npm run build

WORKDIR /app/packages/@kblocks/common
RUN npm run build

# Set working directory to the app package
WORKDIR /app/packages/@kblocks/control

RUN CI=1 npm run test
RUN tsc

CMD [ "node", "index.js" ]
