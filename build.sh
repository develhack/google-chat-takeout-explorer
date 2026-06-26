#!/bin/bash

set -euo pipefail

base_dir="$(cd $(dirname $0) && pwd)"

cd "${base_dir}/client"
vp build

cd "${base_dir}/server"

platforms=(
  "windows/amd64"
  "windows/arm64"
  "linux/amd64"
  "linux/arm64"
  "darwin/amd64"
  "darwin/arm64"
)

dist_dir="${base_dir}/dist/"

for platform in "${platforms[@]}"
do
  GOOS=${platform%/*}
  GOARCH=${platform#*/}
  dist_name="google-chat-takeout-explorer-$GOOS-$GOARCH"
  if [ $GOOS = 'windows' ]; then
    dist_name+='.exe'
  fi
  
  echo "build for $GOOS/$GOARCH"
  env GOOS=$GOOS GOARCH=$GOARCH go build -o "${dist_dir}/${dist_name}"
done
