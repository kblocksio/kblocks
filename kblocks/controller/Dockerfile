FROM ghcr.io/flant/shell-operator:latest
ENV LOG_TYPE color

RUN apk add --no-cache npm nodejs helm

# install opentofu
RUN echo '@community https://dl-cdn.alpinelinux.org/alpine/edge/community' >> /etc/apk/repositories
RUN apk add --no-cache opentofu@community
RUN mkdir /terraform-cache
ENV TF_PLUGIN_CACHE_DIR="/terraform-cache"

# pre-cache terraform providers
RUN mkdir -p /tmp/tf
ADD providers.tf /tmp/tf
RUN cd /tmp/tf && tofu init && rm -rf /tmp/tf

# install winglang
RUN npm i -g winglang

ADD hooks /hooks

# the "wing" directory contains the kblock
RUN mkdir /kblock
ADD kblock /kblock
RUN cd /kblock && ([ -f package.json ] && npm i --omit=dev || true)
RUN cd /kblock && ([ -f Chart.yaml ] && helm dependency update || true)
