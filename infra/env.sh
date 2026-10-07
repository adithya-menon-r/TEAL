#!/usr/bin/env bash
# infra/env.sh — source this at the start of every Cloud Shell session
# Usage: cd ~/TEAL && source infra/env.sh

export PROJECT=bold-future-510804-q8
export REGION=asia-south1
export REPO=$REGION-docker.pkg.dev/$PROJECT/teal

export API_SA=teal-api@$PROJECT.iam.gserviceaccount.com
export LAB_SA=teal-lab-runtime@$PROJECT.iam.gserviceaccount.com
export SCHED_SA=teal-scheduler@$PROJECT.iam.gserviceaccount.com

gcloud config set project $PROJECT
gcloud config set run/region $REGION

echo "TEAL env loaded — project=$PROJECT region=$REGION"
