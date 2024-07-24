FROM ghcr.io/flant/shell-operator:latest
RUN apk add --no-cache npm nodejs
RUN npm i -g winglang
ADD config.json /hooks
ADD hook.js /hooks

RUN mkdir /wing
ADD lib /wing
RUN cd /wing && npm i --omit=dev

ENV LOG_TYPE color
