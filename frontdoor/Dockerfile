# Use Node.js LTS version
FROM node:20-alpine

RUN apk add --no-cache python3 make g++ && \
    ln -sf python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the rest of the application
COPY . .

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV development

# Build the application
# RUN yarn build

# Expose the port
EXPOSE 3000

# Start the application (THIS IS HACKY)
CMD ["yarn", "dev"] 