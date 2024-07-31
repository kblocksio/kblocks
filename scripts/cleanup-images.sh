#!/bin/sh
docker images | grep localhost | cut -f4 -d" " | xargs -n1 -I {} -- docker rmi localhost:5001/kblocks:{}