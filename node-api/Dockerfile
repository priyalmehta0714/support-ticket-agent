# node-api/Dockerfile
# This file tells Railway how to build and run your Node app

FROM node:20-alpine
# node:20 = Node.js version 20 (LTS — Long Term Support)
# alpine = minimal Linux image (5MB vs 900MB for full Ubuntu)
# Smaller image = faster deploys, less attack surface

WORKDIR /app
# All commands run from /app directory inside container

COPY package*.json ./
# Copy package.json AND package-lock.json
# The * means "package.json and package-lock.json"
# Why copy these BEFORE source code?
# Docker caches layers. If package.json hasn't changed,
# Docker skips npm install on next build = faster deploys

RUN npm install --production
# --production = don't install devDependencies (nodemon etc)
# Those are dev tools only — not needed in production
# Smaller final image, faster startup

COPY src/ ./src/
# Copy your source code AFTER npm install
# So code changes don't invalidate the npm install cache

EXPOSE 3000
# Document that this container listens on port 3000
# Railway reads this to know which port to route traffic to

CMD ["node", "src/index.js"]
# Start command when container runs
# NOT nodemon — nodemon is for dev only (auto-restart on file changes)
# In production, Railway restarts the container if it crashes