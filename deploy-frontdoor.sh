#!/bin/zsh

# Exit on error
set -e

# Configuration
PROJECT_ID="aztec-coco"
REGION="europe-west10"
SERVICE_NAME="frontdoor"
GCR_HOSTNAME="gcr.io"

# Static IP names
AZTEC_IP_NAME="aztec-island-ip"
TEMPLERUNNER_IP_NAME="templerunner-ip"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "${GREEN}Starting deployment to Cloud Run...${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "${RED}Error: gcloud CLI is not installed${NC}"
    exit 1
fi

# Set the project
echo "${GREEN}Setting Google Cloud project...${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "${GREEN}Enabling required APIs...${NC}"
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable iam.googleapis.com
gcloud services enable serviceusage.googleapis.com

# Get the static IPs
echo "${GREEN}Getting static IPs...${NC}"
# AZTEC_IP=$(gcloud compute addresses describe $AZTEC_IP_NAME --region $REGION --format='get(address)')
# TEMPLERUNNER_IP=$(gcloud compute addresses describe $TEMPLERUNNER_IP_NAME --region $REGION --format='get(address)')
AZTEC_IP=localhost
TEMPLERUNNER_IP=localhost

# Create cloudbuild.yaml
echo "${GREEN}Creating Cloud Build configuration...${NC}"
cat <<EOF > cloudbuild.yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '${GCR_HOSTNAME}/${PROJECT_ID}/${SERVICE_NAME}:latest', './frontdoor']
  
  # Push the container image to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '${GCR_HOSTNAME}/${PROJECT_ID}/${SERVICE_NAME}:latest']

  # Deploy container image to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - '${SERVICE_NAME}'
      - '--image=${GCR_HOSTNAME}/${PROJECT_ID}/${SERVICE_NAME}:latest'
      - '--platform=managed'
      - '--region=${REGION}'
      - '--allow-unauthenticated'
      - '--set-env-vars=NEXT_PUBLIC_TEMPLERUNNER_URL=http://${TEMPLERUNNER_IP}:3001,NEXT_PUBLIC_PXE_URL=http://${AZTEC_IP}:8080'
      - '--set-secrets=ANTHROPIC_API_KEY=anthropic-api-key:latest'
      - '--memory=4Gi'
      - '--cpu=1'
      - '--min-instances=1'
      - '--max-instances=2'
      - '--port=3000'

images:
  - '${GCR_HOSTNAME}/${PROJECT_ID}/${SERVICE_NAME}:latest'
EOF

# Submit the build
echo "${GREEN}Submitting build to Cloud Build...${NC}"
gcloud builds submit --config cloudbuild.yaml

# Get the deployed URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --format 'value(status.url)')

echo "${GREEN}Deployment completed!${NC}"
echo "Frontdoor URL: $SERVICE_URL"
echo "${GREEN}Don't forget to set your ANTHROPIC_API_KEY in Secret Manager!${NC}"
echo "Run: gcloud secrets versions add anthropic-api-key --data-file=/path/to/key.txt" 