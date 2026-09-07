#!/bin/bash
# Local agent executor test — runs every 60s, mimics Vercel cron

SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d '=' -f2)
LOG_FILE="agent.log"

if [ -z "$SECRET" ]; then
  echo "❌ CRON_SECRET not found in .env.local"
  exit 1
fi

echo "✅ CRON_SECRET loaded"
echo "📄 Logging to $LOG_FILE"
echo "🔁 Hitting /api/agent/execute every 60s. Press Ctrl+C to stop."
echo ""

while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  echo "⏱  $TIMESTAMP — triggering agent..."

  RESPONSE=$(curl -s -X POST http://localhost:3000/api/agent/execute \
    -H "Authorization: Bearer $SECRET" \
    -H "Content-Type: application/json")

  echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

  # Append run separator + response to log file
  {
    echo ""
    echo "===== RUN: $TIMESTAMP ====="
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
  } >> "$LOG_FILE"

  echo ""
  echo "--- sleeping 60s ---"
  sleep 60
done
