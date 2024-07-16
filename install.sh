#!/bin/sh
wing compile -t @winglibs/cdk8s main.w
kubectl apply -f target/main.cdk8s/*.yaml
