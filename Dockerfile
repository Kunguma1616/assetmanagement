# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder
 
WORKDIR /frontend
 
# Copy package file
COPY frontend/package.json ./
 
# Use npm install (doesn't require package-lock.json)
RUN npm install
 
# Copy frontend source
COPY frontend/ ./
 
# Build the frontend
RUN npm run build
 
# Stage 2: Python backend
FROM python:3.11-slim
 
WORKDIR /app
 
# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*
 
# Copy Python requirements
COPY backend/requirements.txt ./requirements.txt
 
# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt
 
# Copy backend code
COPY backend/ ./
 
# Copy frontend build artifacts to backend static folder
COPY --from=frontend-builder /frontend/dist ./static
 
# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser
 
# Cloud Run environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV FLASK_PORT=8000
ENV PYTHONUNBUFFERED=1
 
# Expose the port
EXPOSE 8080
 
# Run Flask
CMD ["python", "app.py"]
