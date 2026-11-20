# syntax=docker/dockerfile:1

# ============================================================
# Credensa — single container for Cloud Run
# Stage 1 builds the React/Vite frontend.
# Stage 2 runs the Express backend and serves the built SPA.
# ============================================================

# ---------- Stage 1: frontend builder ----------
FROM node:24-alpine AS frontend-builder

WORKDIR /app/frontend

# Install dependencies first so this layer is cached between builds.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy the rest of the frontend source (node_modules and dist are
# excluded by .dockerignore).
COPY frontend/ ./

# In production the app is served from the same origin as the API,
# so the browser should call the relative /api path. Vite bakes this
# value into the bundle at build time (see frontend/src/api.ts).
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build
# Result: /app/frontend/dist

# ---------- Stage 2: production runtime ----------
FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies for the backend.
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# Copy backend source. .env is excluded by .dockerignore on purpose:
# secrets are injected by Cloud Run / Secret Manager at runtime.
COPY backend/ ./

# Place the compiled SPA where the backend serves static files from
# (backend/public). The backend has an SPA fallback for client routes.
COPY --from=frontend-builder /app/frontend/dist ./public

# Cloud Run injects PORT, but 3001 is our documented default.
EXPOSE 3001

CMD ["node", "server.js"]
