# Use the Aztec base image
FROM aztecprotocol/aztec:0.82.3

# Install Node.js and npm
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    python3 \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Yarn
RUN npm install -g yarn

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
RUN yarn install

# Copy source files
COPY . .

# Expose the server port
EXPOSE 3001

# Start the server
CMD ["yarn", "start"] 