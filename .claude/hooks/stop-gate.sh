#!/bin/bash
INPUT=$(cat)

# Prevent infinite loops — if we already blocked once, let Claude stop
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0
fi

# Skip if no changes
if git diff --quiet && git diff --cached --quiet; then
  exit 0
fi

# Run quality gates, capture output
OUTPUT=$(pnpm format && pnpm lint && pnpm check && pnpm test 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  # Exit 2 = blocking error. Reason goes to stderr.
  echo "$OUTPUT" | tail -30 >&2
  exit 2
fi

exit 0
