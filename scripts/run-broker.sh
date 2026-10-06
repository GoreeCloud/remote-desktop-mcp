#!/usr/bin/env bash
set -euo pipefail
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
fi
set -a
. "$HOME/.config/goreecloud-remote-mcp/broker.env"
set +a
exec node "/home/slickkredd/GoreeCloud-work/goreecloud-remote-mcp/src/broker.mjs"
