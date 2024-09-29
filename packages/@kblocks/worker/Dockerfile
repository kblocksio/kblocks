FROM node:20-alpine

ARG CLI_VERSION
ENV CLI_VERSION=${CLI_VERSION}

ENV LOG_TYPE=color

# install opentofu
RUN echo '@community https://dl-cdn.alpinelinux.org/alpine/edge/community' >> /etc/apk/repositories
RUN apk add --no-cache opentofu@community

RUN apk add --no-cache helm curl npm nodejs git

RUN ARCH=$(uname -m); \
    case $ARCH in \
        x86_64) KUBECTL_ARCH="amd64" ;; \
        aarch64) KUBECTL_ARCH="arm64" ;; \
        *) echo "Unsupported architecture: $ARCH" && exit 1 ;; \
    esac && \
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/${KUBECTL_ARCH}/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

    
RUN npm install -g typescript winglang

RUN mkdir /terraform-cache
ENV TF_PLUGIN_CACHE_DIR="/terraform-cache"
ENV TF_PLUGIN_CACHE_MAY_BREAK_DEPENDENCY_LOCK_FILE="true"
RUN mkdir -p /tmp/tf
ADD providers.tf /tmp/tf
RUN cd /tmp/tf && tofu init && rm -rf /tmp/tf

RUN mkdir /app
WORKDIR /app

COPY package.json .
RUN npm install

COPY src .
COPY tsconfig.json .

RUN CI=1 npm run test
RUN tsc

CMD [ "node", "worker.js" ]

