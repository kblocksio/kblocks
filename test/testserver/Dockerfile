FROM node:20-alpine

RUN apk add --no-cache curl npm nodejs
RUN npm install -g typescript

RUN ARCH=$(uname -m); \
    case $ARCH in \
        x86_64) KUBECTL_ARCH="amd64" ;; \
        aarch64) KUBECTL_ARCH="arm64" ;; \
        *) echo "Unsupported architecture: $ARCH" && exit 1 ;; \
    esac && \
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/${KUBECTL_ARCH}/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

RUN mkdir /app
WORKDIR /app

# Copy package.json and package-lock.json of the root workspace
COPY ./package.json ./package-lock.json ./

# Copy the workspace packages' package.json files
COPY ./packages/@kblocks/api/package.json ./packages/@kblocks/api/
COPY ./packages/@kblocks/common/package.json ./packages/@kblocks/common/
COPY ./test/testserver/package.json ./test/testserver/

RUN npm install

# Copy the workspace packages' source code
COPY ./packages/@kblocks/api ./packages/@kblocks/api
COPY ./packages/@kblocks/common ./packages/@kblocks/common
COPY --link ./test/testserver/src ./test/testserver
COPY ./test/testserver/tsconfig.json ./test/testserver

WORKDIR /app/packages/@kblocks/api
RUN npm run build

WORKDIR /app/packages/@kblocks/common
RUN npm run build

# Set working directory to the app package
WORKDIR /app/test/testserver

RUN tsc

CMD [ "node", "main.js" ]

