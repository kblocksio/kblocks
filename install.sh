#!/bin/sh
wing compile -t @winglibs/cdk8s wing/config.main.w
kubectl apply -f wing/target/config.main.cdk8s/*.yaml
