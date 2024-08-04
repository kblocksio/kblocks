#!/bin/sh
docker images --format "{{.Repository}} {{.ID}}" | grep "kind-registry" | cut -d" " -f2   | xargs -n1 -- docker rmi -f
