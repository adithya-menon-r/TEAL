# TEAL shared settings for Cloud Shell.
# Load at the start of every Cloud Shell session, from the repo root:
#   source infra/env.sh
#
# PROJECT defaults to the project selected in the Cloud console / gcloud config.
# To pin it explicitly:  export PROJECT=<project-id> && source infra/env.sh

export PROJECT="${PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
if [ -z "$PROJECT" ]; then
  echo "env.sh: no project set. Run: export PROJECT=<project-id> && source infra/env.sh" >&2
  return 1 2>/dev/null || exit 1
fi

export REGION=asia-south1
export REPO=$REGION-docker.pkg.dev/$PROJECT/teal
export API_SA=teal-api@$PROJECT.iam.gserviceaccount.com
export LAB_SA=teal-lab-runtime@$PROJECT.iam.gserviceaccount.com
export SCHED_SA=teal-scheduler@$PROJECT.iam.gserviceaccount.com

gcloud config set project "$PROJECT" >/dev/null 2>&1
gcloud config set run/region "$REGION" >/dev/null 2>&1

echo "TEAL env: PROJECT=$PROJECT REGION=$REGION"
