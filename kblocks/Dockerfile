FROM ghcr.io/flant/shell-operator:latest
RUN apk add --no-cache npm nodejs helm
RUN npm i -g winglang

RUN echo '@community https://dl-cdn.alpinelinux.org/alpine/edge/community' >> /etc/apk/repositories
RUN apk add --no-cache opentofu@community
RUN mkdir /terraform-cache
ENV TF_PLUGIN_CACHE_DIR="/terraform-cache"

ADD hooks /hooks

RUN mkdir /wing
ADD wing /wing
RUN cd /wing && ([ -f package.json ] && npm i --omit=dev || true)

ENV LOG_TYPE color
