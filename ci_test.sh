#!/bin/bash
export NODE_ENV=test
if [ $GITHUB_ACTIONS ]; then
echo do not use docker-compose 
else
docker-compose down && docker-compose up -d redis
fi
if npm run test; then
  echo "Test Success"
  docker-compose down
else
	echo "Test Failed"
  docker-compose down
	exit 1
fi
