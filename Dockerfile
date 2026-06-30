# Stage 1: Build React static client bundle
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Serve the application
FROM node:20-alpine AS runner
WORKDIR /app

# Copy root configurations and server descriptors
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies (retaining tsx for typescript execution)
WORKDIR /app/server
RUN npm install

# Copy backend server code and seeded db templates
COPY server/ ./

# Copy client assets to output dist folder to serve statically
COPY --from=client-builder /app/client/dist /app/dist

ENV NODE_ENV=production
ENV PORT=5001
EXPOSE 5001

CMD ["npm", "run", "start"]
