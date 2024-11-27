FROM node:20-alpine

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

    
RUN npm install -g typescript winglang@^0.85.29 cdk8s-cli tsx

RUN mkdir /terraform-cache
ENV TF_PLUGIN_CACHE_DIR="/terraform-cache"
ENV TF_PLUGIN_CACHE_MAY_BREAK_DEPENDENCY_LOCK_FILE="true"
RUN mkdir -p /tmp/tf
ADD ./packages/@kblocks/worker/providers.tf /tmp/tf
RUN cd /tmp/tf && tofu init && rm -rf /tmp/tf

RUN mkdir /app
WORKDIR /app

# Copy package.json and package-lock.json of the root workspace
COPY ./package.json ./package-lock.json ./

# Copy the workspace packages' package.json files
COPY ./packages/@kblocks/api/package.json ./packages/@kblocks/api/
COPY ./packages/@kblocks/common/package.json ./packages/@kblocks/common/
COPY ./packages/@kblocks/worker/package.json ./packages/@kblocks/worker/

# Install dependencies in the root (this will install and link workspace packages)
RUN npm install

# Copy the workspace packages' source code
COPY ./packages/@kblocks/api ./packages/@kblocks/api
COPY ./packages/@kblocks/common ./packages/@kblocks/common
COPY --link ./packages/@kblocks/worker/src ./packages/@kblocks/worker
COPY ./packages/@kblocks/worker/tsconfig.json ./packages/@kblocks/worker

WORKDIR /app/packages/@kblocks/api
RUN npm run build

WORKDIR /app/packages/@kblocks/common
RUN npm run build

# Set working directory to the app package
WORKDIR /app/packages/@kblocks/worker

RUN CI=1 npm run test
RUN tsc

ARG KBLOCKS_OPERATOR_IMAGE
ENV KBLOCKS_OPERATOR_IMAGE=${KBLOCKS_OPERATOR_IMAGE}

ARG KBLOCKS_CONTROL_IMAGE
ENV KBLOCKS_CONTROL_IMAGE=${KBLOCKS_CONTROL_IMAGE}

ARG KBLOCKS_WORKER_IMAGE
ENV KBLOCKS_WORKER_IMAGE=${KBLOCKS_WORKER_IMAGE}

ARG KBLOCKS_VERSION
ENV KBLOCKS_VERSION=${KBLOCKS_VERSION}

CMD [ "node", "worker.js" ]

