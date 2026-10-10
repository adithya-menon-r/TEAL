#!/usr/bin/env bash
# infra/setup-wif.sh
# One-time setup: Workload Identity Federation for GitHub Actions.
# This lets GitHub Actions authenticate to GCP without any stored SA key.
#
# Run from repo root in Cloud Shell:
#   bash infra/setup-wif.sh
#
# After running, add these two GitHub secrets to the repo:
#   WIF_PROVIDER  -> printed at the end of this script
#   WIF_SERVICE_ACCOUNT -> teal-cicd@<PROJECT>.iam.gserviceaccount.com
#
set -euo pipefail
source "$(dirname "$0")/env.sh"

GITHUB_REPO="adithya-menon-r/TEAL"
POOL_ID="github-pool"
PROVIDER_ID="github-provider"
CICD_SA="teal-cicd"
CICD_SA_EMAIL="$CICD_SA@$PROJECT.iam.gserviceaccount.com"

echo "==> Creating CI/CD service account"
if gcloud iam service-accounts describe "$CICD_SA_EMAIL" > /dev/null 2>&1; then
  echo "   $CICD_SA exists"
else
  gcloud iam service-accounts create "$CICD_SA" \
    --display-name="TEAL CI/CD (GitHub Actions)" --quiet
  echo "   $CICD_SA created"
fi

echo "==> Granting roles to $CICD_SA"
for role in \
  roles/run.admin \
  roles/artifactregistry.writer \
  roles/cloudbuild.builds.editor \
  roles/iam.serviceAccountUser \
  roles/storage.objectViewer \
  roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:$CICD_SA_EMAIL" \
    --role="$role" --condition=None --quiet > /dev/null
  echo "   $role"
done

echo "==> Creating Workload Identity Pool"
if gcloud iam workload-identity-pools describe "$POOL_ID" \
     --location=global --project="$PROJECT" > /dev/null 2>&1; then
  echo "   pool '$POOL_ID' exists"
else
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --location=global \
    --display-name="GitHub Actions Pool" \
    --project="$PROJECT" --quiet
  echo "   pool '$POOL_ID' created"
fi

echo "==> Creating OIDC provider"
if gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
     --workload-identity-pool="$POOL_ID" --location=global \
     --project="$PROJECT" > /dev/null 2>&1; then
  echo "   provider '$PROVIDER_ID' exists"
else
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --workload-identity-pool="$POOL_ID" \
    --location=global \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='$GITHUB_REPO'" \
    --project="$PROJECT" --quiet
  echo "   provider '$PROVIDER_ID' created"
fi

echo "==> Binding WIF pool to $CICD_SA"
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
POOL_RESOURCE="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/attribute.repository/$GITHUB_REPO"

gcloud iam service-accounts add-iam-policy-binding "$CICD_SA_EMAIL" \
  --role=roles/iam.workloadIdentityUser \
  --member="$POOL_RESOURCE" \
  --quiet > /dev/null
echo "   binding set"

WIF_PROVIDER_FULL="projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID"

echo
echo "Done! Add these two secrets to GitHub repo settings:"
echo
echo "  WIF_PROVIDER         = $WIF_PROVIDER_FULL"
echo "  WIF_SERVICE_ACCOUNT  = $CICD_SA_EMAIL"
echo
echo "GitHub: https://github.com/$GITHUB_REPO/settings/secrets/actions"
