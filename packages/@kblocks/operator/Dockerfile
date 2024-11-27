FROM ghcr.io/flant/shell-operator:latest
ENV LOG_TYPE=color

# install opentofu
RUN echo '@community https://dl-cdn.alpinelinux.org/alpine/edge/community' >> /etc/apk/repositories
RUN apk add --no-cache opentofu@community

RUN apk add --no-cache helm curl npm nodejs

RUN npm install -g typescript winglang

RUN mkdir /terraform-cache
ENV TF_PLUGIN_CACHE_DIR="/terraform-cache"
ENV TF_PLUGIN_CACHE_MAY_BREAK_DEPENDENCY_LOCK_FILE="true"
RUN mkdir -p /tmp/tf
ADD ./packages/@kblocks/operator/providers.tf /tmp/tf
RUN cd /tmp/tf && tofu init && rm -rf /tmp/tf

RUN mkdir /app
WORKDIR /app

# Copy package.json and package-lock.json of the root workspace
COPY ./package.json ./package-lock.json ./

# Copy the workspace packages' package.json files
COPY ./packages/@kblocks/api/package.json ./packages/@kblocks/api/
COPY ./packages/@kblocks/common/package.json ./packages/@kblocks/common/
COPY ./packages/@kblocks/operator/package.json ./packages/@kblocks/operator/

RUN npm install

# Copy the workspace packages' source code
COPY ./packages/@kblocks/api ./packages/@kblocks/api
COPY ./packages/@kblocks/common ./packages/@kblocks/common
COPY --link ./packages/@kblocks/operator/src ./packages/@kblocks/operator
COPY ./packages/@kblocks/operator/tsconfig.json ./packages/@kblocks/operator
COPY ./packages/@kblocks/operator/bin/hook /hooks/hook

WORKDIR /app/packages/@kblocks/api
RUN npm run build

WORKDIR /app/packages/@kblocks/common
RUN npm run build

# Set working directory to the app package
WORKDIR /app/packages/@kblocks/operator

RUN CI=1 npm run test
RUN tsc
