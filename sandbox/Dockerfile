FROM docker:latest

# Install Node.js and other dependencies
RUN apk add --no-cache \
    bash \
    curl \
    git \
    tar \
    gzip \
    jq \
    python3 \
    build-base \
    nodejs \
    npm \
    yarn

ENV NODE_VERSION=22.15.0
WORKDIR /root/app
ENV NVM_DIR=/root/.nvm

# Create NVM directory and install nvm
RUN mkdir -p $NVM_DIR && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash \
    && . "$NVM_DIR/nvm.sh" \
    && nvm install ${NODE_VERSION} \
    && nvm use ${NODE_VERSION} \
    && nvm alias default ${NODE_VERSION}

# Add node and npm to path
ENV PATH="${NVM_DIR}/versions/node/v${NODE_VERSION}/bin:${PATH}"

# # Add health check to wait for daemon
# HEALTHCHECK --interval=1s --timeout=5s --start-period=0s --retries=30 \
#   CMD docker info > /dev/null 2>&1 || exit 1

# Expose necessary ports (you may need to adjust these based on Aztec's requirements)
EXPOSE 8080

# Create startup script
COPY <<EOF /usr/local/bin/start.sh
#!/bin/bash
set -e

echo "Debug: Checking bash location..."
which bash
ls -l /bin/bash
echo "Debug: Current shell is: $SHELL"

# Store original PATH
ORIGINAL_PATH="${PATH}"

echo "Starting Docker daemon..."
dockerd > /var/log/dockerd.log 2>&1 &

echo "Waiting for Docker daemon to be ready..."
for i in {1..30}; do
    if docker info > /dev/null 2>&1; then
        echo "Docker daemon is ready!"
        break
    fi
    if [ "${i}" -eq 30 ]; then
        echo "Timeout waiting for Docker daemon"
        cat /var/log/dockerd.log
        exit 1
    fi
    echo "Waiting for Docker daemon... attempt ${i}/30"
    sleep 1
done

echo "Docker daemon started successfully"
docker info

echo "Installing Aztec CLI..."
curl -s https://install.aztec.network | NON_INTERACTIVE=1 BIN_PATH=/usr/local/bin bash -s

# Restore original PATH and add Aztec bin
export PATH="${ORIGINAL_PATH}:/usr/local/bin:./aztec"

echo "Debug2: Checking bash location..."
which bash
ls -l /bin/bash
echo "Debug: Current shell is: $SHELL"

# echo "Updating Aztec..."
# aztec-up 0.87.8

echo "Starting Aztec sandbox..."
exec aztec start --sandbox
EOF

RUN chmod +x /usr/local/bin/start.sh

# Start the Aztec sandbox
ENTRYPOINT ["/usr/local/bin/start.sh"] 
