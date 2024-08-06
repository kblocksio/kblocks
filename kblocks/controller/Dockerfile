FROM ghcr.io/flant/shell-operator:latest
ENV LOG_TYPE=color

RUN apk add --no-cache npm nodejs helm

# install opentofu
RUN echo '@community https://dl-cdn.alpinelinux.org/alpine/edge/community' >> /etc/apk/repositories
RUN apk add --no-cache opentofu@community

RUN mkdir /terraform-cache
ENV TF_PLUGIN_CACHE_DIR="/terraform-cache"
ENV TF_PLUGIN_CACHE_MAY_BREAK_DEPENDENCY_LOCK_FILE="true"
RUN mkdir -p /tmp/tf
ADD providers.tf /tmp/tf
RUN cd /tmp/tf && tofu init && rm -rf /tmp/tf

# install winglang
RUN npm i -g winglang

# ADD package.json package-lock.json /libs/
# RUN cd /libs/ && npm i --omit=dev
# ENV NODE_PATH=/libs/node_modules:$NODE_PATH

ADD hooks /hooks

ADD app /app
RUN echo "installing app dependencies"
RUN cd /app && ([ -f package.json ] && npm i --omit=dev || true)

# the "wing" directory contains the kblock
RUN mkdir /kblock
ADD kblock /kblock
RUN cd /kblock && ([ -f package.json ] && npm i --omit=dev || true)
RUN cd /kblock && ([ -f Chart.yaml ] && helm dependency update || true)
