#!/bin/zsh

# Exit on error
set -e

# Configuration
PROJECT_ID="aztec-coco"
REGION="europe-west10"
SERVICE_NAME="frontdoor"
GCR_HOSTNAME="gcr.io"

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

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "${RED}Error: docker is not installed${NC}"
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

# Configure Docker to use GCR
echo "${GREEN}Configuring Docker for Google Container Registry...${NC}"
gcloud auth configure-docker $GCR_HOSTNAME

# Build and push Docker image
echo "${GREEN}Building and pushing Docker image...${NC}"
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 \
    -t $GCR_HOSTNAME/$PROJECT_ID/$SERVICE_NAME:latest \
    --push \
    ./frontdoor

# Deploy to Cloud Run
echo "${GREEN}Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
    --image $GCR_HOSTNAME/$PROJECT_ID/$SERVICE_NAME:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars="NEXT_PUBLIC_AZTEC_URL=http://aztec-island-ip:8080,NEXT_PUBLIC_TEMPLERUNNER_URL=http://templerunner-ip:3001" \
    --memory 1Gi \
    --cpu 1 \
    --min-instances 1 \
    --max-instances 2 \
    --port 3000

# Get the deployed URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --format 'value(status.url)')

echo "${GREEN}Deployment completed!${NC}"
echo "Frontdoor URL: $SERVICE_URL" 