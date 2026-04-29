#!/usr/bin/env bash
# Run this script once to install the daily cron job.
# The digest will be generated every day at 07:30.
#
# Usage:  bash digest/schedule_cron.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAIN_PY="$SCRIPT_DIR/main.py"
LOG="$SCRIPT_DIR/output/cron.log"

CRON_LINE="30 7 * * * ANTHROPIC_API_KEY=\"$ANTHROPIC_API_KEY\" python3 \"$MAIN_PY\" >> \"$LOG\" 2>&1"

# Add only if not already present
if crontab -l 2>/dev/null | grep -qF "$MAIN_PY"; then
  echo "✅  Cron job already installed."
else
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  echo "✅  Cron job installed — runs daily at 07:30."
fi

echo "   Log: $LOG"
echo ""
echo "To remove:"
echo "  crontab -e   # delete the ai-digest line"
