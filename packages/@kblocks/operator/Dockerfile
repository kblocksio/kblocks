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
ADD providers.tf /tmp/tf
RUN cd /tmp/tf && tofu init && rm -rf /tmp/tf

RUN mkdir /app
WORKDIR /app

COPY package.json .
RUN npm install

# My sources
COPY bin/hook /hooks/hook
COPY src .
COPY tsconfig.json .

RUN CI=1 npm run test
RUN tsc
