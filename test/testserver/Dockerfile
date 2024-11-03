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

COPY package.json .
RUN npm install

COPY src .
COPY tsconfig.json .

RUN tsc

CMD [ "node", "main.js" ]

