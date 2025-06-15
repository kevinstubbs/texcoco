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
gcloud services enable cloudbuild.googleapis.com
gcloud services enable iam.googleapis.com
gcloud services enable serviceusage.googleapis.com

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
        --num-nodes 1 \
        --enable-ip-alias
fi

# Get credentials for the cluster
echo "${GREEN}Getting cluster credentials...${NC}"
gcloud container clusters get-credentials $CLUSTER_NAME --zone $ZONE

# Create cloudbuild.yaml
echo "${GREEN}Creating Cloud Build configuration...${NC}"
cat <<EOF > cloudbuild.yaml
steps:
  # Build the templerunner image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '${GCR_HOSTNAME}/${PROJECT_ID}/templerunner:latest', './templerunner']
  
  # Push the templerunner image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '${GCR_HOSTNAME}/${PROJECT_ID}/templerunner:latest']

  # Create Kubernetes namespace
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - 'run'
      - '--filename=k8s/namespace.yaml'
      - '--location=${ZONE}'
      - '--cluster=${CLUSTER_NAME}'
      - '--output=/workspace/output/namespace'

  # Create Kubernetes secrets
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - 'run'
      - '--filename=k8s/secrets.yaml'
      - '--location=${ZONE}'
      - '--cluster=${CLUSTER_NAME}'
      - '--output=/workspace/output/secrets'

  # Deploy ethereum service
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - 'run'
      - '--filename=k8s/ethereum.yaml'
      - '--location=${ZONE}'
      - '--cluster=${CLUSTER_NAME}'
      - '--output=/workspace/output/ethereum'

  # Deploy aztec-island service
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - 'run'
      - '--filename=k8s/aztec-island.yaml'
      - '--location=${ZONE}'
      - '--cluster=${CLUSTER_NAME}'
      - '--output=/workspace/output/aztec-island'

  # Deploy templerunner service
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - 'run'
      - '--filename=k8s/templerunner.yaml'
      - '--location=${ZONE}'
      - '--cluster=${CLUSTER_NAME}'
      - '--output=/workspace/output/templerunner'

images:
  - '${GCR_HOSTNAME}/${PROJECT_ID}/templerunner:latest'
EOF

# Create Kubernetes manifests directory
mkdir -p k8s

# Create namespace manifest
cat <<EOF > k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: texcoco
EOF

# Create secrets manifest
cat <<EOF > k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: aztec-secrets
  namespace: texcoco
type: Opaque
stringData:
  FORCE_COLOR: "0"
  LOG_LEVEL: "info"
  PXE_PORT: "8080"
  PORT: "8080"
  L1_CHAIN_ID: "31337"
  TEST_ACCOUNTS: "true"
  VERSION: "latest"
  ANTHROPIC_API_KEY: ""  # This will be set via GCP UI
EOF

# Create ethereum manifest
cat <<EOF > k8s/ethereum.yaml
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

# Create aztec-island manifest
cat <<EOF > k8s/aztec-island.yaml
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
        - name: NEXT_PUBLIC_AZTEC_URL
          value: "http://${AZTEC_IP}:8080"
        - name: NEXT_PUBLIC_TEMPLERUNNER_URL
          value: "http://${TEMPLERUNNER_IP}:3001"
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
    cloud.google.com/neg: '{"ingress": true}'
spec:
  selector:
    app: aztec-island
  ports:
  - port: 8080
    targetPort: 8080
    protocol: TCP
  type: LoadBalancer
EOF

# Create templerunner manifest
cat <<EOF > k8s/templerunner.yaml
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
        image: ${GCR_HOSTNAME}/${PROJECT_ID}/templerunner:latest
        imagePullPolicy: Always
        envFrom:
        - secretRef:
            name: aztec-secrets
        env:
        - name: NEXT_PUBLIC_AZTEC_URL
          value: "http://${AZTEC_IP}:8080"
        - name: NEXT_PUBLIC_TEMPLERUNNER_URL
          value: "http://${TEMPLERUNNER_IP}:3001"
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
    cloud.google.com/neg: '{"ingress": true}'
spec:
  selector:
    app: templerunner
  ports:
  - port: 3001
    targetPort: 3001
    protocol: TCP
  type: LoadBalancer
EOF

# Submit the build
echo "${GREEN}Submitting build to Cloud Build...${NC}"
gcloud builds submit --config cloudbuild.yaml

echo "${GREEN}Deployment completed!${NC}"
echo "Aztec Island URL: http://$AZTEC_IP:8080"
echo "Templerunner URL: http://$TEMPLERUNNER_IP:3001" 