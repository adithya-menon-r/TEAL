#!/usr/bin/env bash
# scripts/stop-all.sh
# Deletes every Cloud Run service labelled teal-lab=true.
# The reaper (running every minute) will then mark those sessions ended/deleted.
#
# Run from Cloud Shell: bash scripts/stop-all.sh

set -euo pipefail

REGION=asia-south1

echo "Listing all active TEAL lab services in $REGION..."
SERVICES=$(gcloud run services list \
  --region="$REGION" \
  --filter="metadata.labels.teal-lab=true" \
  --format="value(metadata.name)")

if [ -z "$SERVICES" ]; then
  echo "No active lab services found."
  exit 0
fi

for s in $SERVICES; do
  echo "Deleting $s ..."
  gcloud run services delete "$s" --region="$REGION" --quiet --async
done

echo "Done. The reaper will mark sessions as ended/deleted within ~1 minute."
