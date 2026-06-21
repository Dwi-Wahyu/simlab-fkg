#!/bin/bash
# Exit immediately if any command fails
set -e

# Configuration
REMOTE_HOST="server-csi"
REMOTE_DIR="/var/www/simlab-fkg"
IMAGE_TAR="simlab-fkg-images.tar.gz"

echo "=== 1. Building Docker Images Locally ==="
# Build builder stage (contains migrations)
docker build --target builder -t simlab-fkg-builder:latest .
# Build runner stage (contains production app)
docker build --target runner -t simlab-fkg-app:latest .

echo "=== 2. Packing & Compressing Images into $IMAGE_TAR ==="
docker save simlab-fkg-app:latest simlab-fkg-builder:latest | gzip > "$IMAGE_TAR"

echo "=== 3. Copying Files to Remote Server ($REMOTE_HOST) ==="
# Ensure remote directory exists
ssh "$REMOTE_HOST" "mkdir -p $REMOTE_DIR"
# Copy docker-compose.yaml and compressed image tar
scp "$IMAGE_TAR" docker-compose.yaml "$REMOTE_HOST:$REMOTE_DIR/"

echo "=== 4. Loading Images on Remote Server ==="
ssh "$REMOTE_HOST" "docker load -i $REMOTE_DIR/$IMAGE_TAR"

echo "=== 5. Running SvelteKit App & Services ==="
ssh "$REMOTE_HOST" "cd $REMOTE_DIR && docker compose up -d"

echo "=== 6. Cleaning Up Local Tar File ==="
rm "$IMAGE_TAR"

echo "=== Deployment Completed Successfully ==="
