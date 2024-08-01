#!/bin/sh
docker images --format "{{.Repository}} {{.ID}}" | grep "localhost" | cut -d" " -f2   | xargs -n1 -- docker rmi