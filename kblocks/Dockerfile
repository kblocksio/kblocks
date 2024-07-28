FROM ghcr.io/flant/shell-operator:latest
RUN apk add --no-cache npm nodejs helm
RUN npm i -g winglang
ADD hooks /hooks

RUN mkdir /wing
ADD wing /wing
RUN cd /wing && ([ -f package.json ] && npm i --omit=dev || true)

ENV LOG_TYPE color
