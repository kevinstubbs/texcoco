#!/bin/zsh

# Exit on error
set -e

# Configuration
PROJECT_ID="aztec-coco"
CLUSTER_NAME="texcoco-cluster"
REGION="europe-west10"
ZONE="europe-west10-a"
GCR_HOSTNAME="gcr.io"

# Static IP names
AZTEC_IP_NAME="aztec-island-ip"
TEMPLERUNNER_IP_NAME="templerunner-ip"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "${GREEN}Starting deployment to Google Cloud...${NC}"

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

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

# Set the project
echo "${GREEN}Setting Google Cloud project...${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "${GREEN}Enabling required APIs...${NC}"
gcloud services enable container.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable compute.googleapis.com

# Reserve static IPs if they don't exist
echo "${GREEN}Reserving static IPs...${NC}"

# Check if Aztec IP exists
if ! gcloud compute addresses describe $AZTEC_IP_NAME --region $REGION &> /dev/null; then
    echo "${GREEN}Creating static IP for Aztec Island...${NC}"
    gcloud compute addresses create $AZTEC_IP_NAME --region $REGION
fi

# Check if Templerunner IP exists
if ! gcloud compute addresses describe $TEMPLERUNNER_IP_NAME --region $REGION &> /dev/null; then
    echo "${GREEN}Creating static IP for Templerunner...${NC}"
    gcloud compute addresses create $TEMPLERUNNER_IP_NAME --region $REGION
fi

# Get the static IPs
AZTEC_IP=$(gcloud compute addresses describe $AZTEC_IP_NAME --region $REGION --format='get(address)')
TEMPLERUNNER_IP=$(gcloud compute addresses describe $TEMPLERUNNER_IP_NAME --region $REGION --format='get(address)')

# Create GKE cluster if it doesn't exist
if ! gcloud container clusters describe $CLUSTER_NAME --zone $ZONE &> /dev/null; then
    echo "${GREEN}Creating GKE cluster...${NC}"
    gcloud container clusters create $CLUSTER_NAME \
        --zone $ZONE \
        --machine-type e2-medium \
        --num-nodes 3 \
        --enable-ip-alias
fi

# Get credentials for the cluster
echo "${GREEN}Getting cluster credentials...${NC}"
gcloud container clusters get-credentials $CLUSTER_NAME --zone $ZONE

# Configure Docker to use GCR
echo "${GREEN}Configuring Docker for Google Container Registry...${NC}"
gcloud auth configure-docker $GCR_HOSTNAME

# Build and push Docker images
echo "${GREEN}Building and pushing Docker images...${NC}"

# Build and push templerunner
echo "${GREEN}Building templerunner image...${NC}"
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 \
    -t $GCR_HOSTNAME/$PROJECT_ID/templerunner:latest \
    --push \
    ./templerunner

# Create Kubernetes namespace
echo "${GREEN}Creating Kubernetes namespace...${NC}"
kubectl create namespace texcoco --dry-run=client -o yaml | kubectl apply -f -

# Create Kubernetes secrets for environment variables
echo "${GREEN}Creating Kubernetes secrets...${NC}"
kubectl create secret generic aztec-secrets \
    --namespace texcoco \
    --from-literal=FORCE_COLOR=0 \
    --from-literal=LOG_LEVEL=info \
    --from-literal=PXE_PORT=8080 \
    --from-literal=PORT=8080 \
    --from-literal=L1_CHAIN_ID=31337 \
    --from-literal=TEST_ACCOUNTS=true \
    --from-literal=VERSION=latest \
    --dry-run=client -o yaml | kubectl apply -f -

# Create Kubernetes deployments and services
echo "${GREEN}Creating Kubernetes deployments and services...${NC}"

# Ethereum deployment
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ethereum
  namespace: texcoco
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ethereum
  template:
    metadata:
      labels:
        app: ethereum
    spec:
      containers:
      - name: ethereum
        image: ghcr.io/clarifiedlabs/foundry:stable
        imagePullPolicy: Always
        command: ["anvil"]
        args: ["-p", "8545", "--host", "0.0.0.0", "--chain-id", "31337", "--silent"]
        ports:
        - containerPort: 8545
---
apiVersion: v1
kind: Service
metadata:
  name: ethereum
  namespace: texcoco
spec:
  selector:
    app: ethereum
  ports:
  - port: 8545
    targetPort: 8545
  type: ClusterIP
EOF

# Aztec Island deployment
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aztec-island
  namespace: texcoco
spec:
  replicas: 1
  selector:
    matchLabels:
      app: aztec-island
  template:
    metadata:
      labels:
        app: aztec-island
    spec:
      containers:
      - name: aztec-island
        image: aztecprotocol/aztec:0.82.3
        imagePullPolicy: Always
        command: ["node", "--no-warnings", "/usr/src/yarn-project/aztec/dest/bin/index.js", "start", "--sandbox"]
        envFrom:
        - secretRef:
            name: aztec-secrets
        env:
        - name: ETHEREUM_HOSTS
          value: "http://ethereum:8545"
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /status
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: aztec-island
  namespace: texcoco
  annotations:
    cloud.google.com/load-balancer-ip: "${AZTEC_IP}"
spec:
  selector:
    app: aztec-island
  ports:
  - port: 8080
    targetPort: 8080
  type: LoadBalancer
EOF

# Templerunner deployment
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: templerunner
  namespace: texcoco
spec:
  replicas: 1
  selector:
    matchLabels:
      app: templerunner
  template:
    metadata:
      labels:
        app: templerunner
    spec:
      containers:
      - name: templerunner
        image: $GCR_HOSTNAME/$PROJECT_ID/templerunner:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3001
        readinessProbe:
          httpGet:
            path: /status
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: templerunner
  namespace: texcoco
  annotations:
    cloud.google.com/load-balancer-ip: "${TEMPLERUNNER_IP}"
spec:
  selector:
    app: templerunner
  ports:
  - port: 3001
    targetPort: 3001
  type: LoadBalancer
EOF

# Wait for services to be ready
echo "${GREEN}Waiting for services to be ready...${NC}"
kubectl wait --namespace texcoco \
  --for=condition=ready pod \
  --selector=app=ethereum \
  --timeout=300s

kubectl wait --namespace texcoco \
  --for=condition=ready pod \
  --selector=app=aztec-island \
  --timeout=300s

kubectl wait --namespace texcoco \
  --for=condition=ready pod \
  --selector=app=templerunner \
  --timeout=300s

echo "${GREEN}Deployment completed!${NC}"
echo "Aztec Island URL: http://$AZTEC_IP:8080"
echo "Templerunner URL: http://$TEMPLERUNNER_IP:3001" 