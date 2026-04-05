#!/bin/bash
set -e
if [ $# -ne 2 ]; then
  echo "Usage: unlock_flag <unlockId> <attestToken>" >&2
  echo "Copy the attest token from the CyberRangeX challenge page (VM section)." >&2
  exit 2
fi
UNLOCK_ID="$1"
ATTEST_TOKEN="$2"
/usr/local/bin/unlock_flag_bin "$UNLOCK_ID"
SECRET="${CYBERRANGEX_VM_SECRET:-}"
API="${CYBERRANGEX_API_BASE:-http://host.docker.internal:5000}"
if [ -z "$SECRET" ]; then
  echo "" >&2
  echo "Warning: CYBERRANGEX_VM_SECRET is not set on this VM. The CTF server will not accept your flag until the operator configures it." >&2
  exit 0
fi
BASE="${API%/}"
URL="${BASE}/api/challenges/vm-attest/callback"
PAYLOAD=$(printf '{"attestToken":"%s","unlockKey":"%s"}' "$ATTEST_TOKEN" "$UNLOCK_ID")
if curl -sfS -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "X-Cyberrangex-Vm-Secret: ${SECRET}" \
  -d "$PAYLOAD"; then
  echo ""
  echo "Registered with CyberRangeX — submit your flag in the browser within ~20 minutes."
else
  echo "" >&2
  echo "Could not reach the CyberRangeX API at ${BASE}. Set CYBERRANGEX_API_BASE if the backend is not on the Docker host (e.g. http://172.17.0.1:5000 on Linux)." >&2
fi
