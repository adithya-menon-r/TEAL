#!/usr/bin/env bash
# One-time GCP core setup for TEAL (PLAN.md §12.2 and §12.4):
#   - enables the required APIs
#   - creates the service accounts teal-api, teal-lab-runtime (no roles), teal-scheduler
#   - creates/updates the custom role tealProvisioner
#   - grants teal-api its roles and permission to run labs as teal-lab-runtime
#
# Run in Cloud Shell from the repo root:
#   bash infra/setup-core.sh                    # core setup
#   bash infra/setup-core.sh --build-perms      # also grant Cloud Build's service account push/log access
#
# Safe to re-run: existing resources are left as they are.
set -euo pipefail

# shellcheck source=infra/env.sh
source "$(dirname "$0")/env.sh"

BUILD_PERMS=false
for arg in "$@"; do
  case "$arg" in
    --build-perms) BUILD_PERMS=true ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

PROVISIONER_PERMISSIONS=run.services.create,run.services.get,run.services.list,run.services.delete,run.services.setIamPolicy,run.operations.get

# Retries a command; new service accounts can take a few seconds before IAM accepts them.
retry() {
  local attempt
  for attempt in 1 2 3 4 5 6; do
    if "$@"; then return 0; fi
    echo "   ...not ready yet, retrying in 10s ($attempt/6)"
    sleep 10
  done
  return 1
}

ensure_service_account() {
  local name=$1 display=$2
  if gcloud iam service-accounts describe "$name@$PROJECT.iam.gserviceaccount.com" >/dev/null 2>&1; then
    echo "   $name exists"
  else
    gcloud iam service-accounts create "$name" --display-name="$display" --quiet
    echo "   $name created"
  fi
}

bind_project_role() {
  local member=$1 role=$2
  retry gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="$member" --role="$role" --condition=None --quiet >/dev/null
  echo "   $role -> $member"
}

echo "==> Enabling APIs (takes a minute the first time)"
gcloud services enable \
  run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com \
  firestore.googleapis.com cloudscheduler.googleapis.com iam.googleapis.com \
  identitytoolkit.googleapis.com logging.googleapis.com monitoring.googleapis.com \
  billingbudgets.googleapis.com

echo "==> Service accounts"
ensure_service_account teal-api "TEAL API (teal-api)"
ensure_service_account teal-lab-runtime "TEAL lab runtime (no roles)"
ensure_service_account teal-scheduler "TEAL scheduler (reaper caller)"

echo "==> Custom role tealProvisioner"
role_state=$(gcloud iam roles describe tealProvisioner --project="$PROJECT" --format='value(deleted)' 2>/dev/null || echo "missing")
case "$role_state" in
  missing)
    gcloud iam roles create tealProvisioner --project="$PROJECT" --title="TEAL Provisioner" \
      --description="Create, read, list and delete TEAL lab services on Cloud Run" \
      --permissions="$PROVISIONER_PERMISSIONS" --stage=GA --quiet >/dev/null
    echo "   created" ;;
  True)
    gcloud iam roles undelete tealProvisioner --project="$PROJECT" --quiet >/dev/null
    gcloud iam roles update tealProvisioner --project="$PROJECT" \
      --permissions="$PROVISIONER_PERMISSIONS" --quiet >/dev/null
    echo "   restored and updated" ;;
  *)
    gcloud iam roles update tealProvisioner --project="$PROJECT" \
      --permissions="$PROVISIONER_PERMISSIONS" --quiet >/dev/null
    echo "   exists, permissions updated" ;;
esac

echo "==> Roles for teal-api"
bind_project_role "serviceAccount:$API_SA" "projects/$PROJECT/roles/tealProvisioner"
bind_project_role "serviceAccount:$API_SA" roles/datastore.user
bind_project_role "serviceAccount:$API_SA" roles/logging.logWriter

echo "==> teal-api may run labs as teal-lab-runtime (and only that account)"
retry gcloud iam service-accounts add-iam-policy-binding "$LAB_SA" \
  --member="serviceAccount:$API_SA" --role=roles/iam.serviceAccountUser --quiet >/dev/null
echo "   roles/iam.serviceAccountUser on $LAB_SA -> $API_SA"

if [ "$BUILD_PERMS" = true ]; then
  echo "==> Cloud Build permissions"
  project_number=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
  build_sa="serviceAccount:$project_number-compute@developer.gserviceaccount.com"
  for role in roles/artifactregistry.writer roles/logging.logWriter roles/storage.objectViewer; do
    bind_project_role "$build_sa" "$role"
  done
fi

echo "==> Check: teal-lab-runtime must have no project roles"
lab_roles=$(gcloud projects get-iam-policy "$PROJECT" --flatten='bindings[].members' \
  --filter="bindings.members:serviceAccount:$LAB_SA" --format='value(bindings.role)')
if [ -n "$lab_roles" ]; then
  echo "   WARNING: teal-lab-runtime has project roles, remove them:" >&2
  echo "$lab_roles" | sed 's/^/     /' >&2
  exit 1
fi
echo "   ok"

echo
echo "Done. Core setup for $PROJECT is in place."
echo "Next (other owners): Artifact Registry + Firestore (§12.3), Firebase (§6.1), images (§12.6)."
