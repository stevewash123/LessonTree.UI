#!/bin/bash
# WSL Cypress Test Runner with Proper Display Setup
# Fixes Electron crashes by using virtual framebuffer

# Check if services are running
echo "🔍 Checking WSL standalone services..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5047/api/admin/health 2>/dev/null || echo "000")
UI_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4201 2>/dev/null || echo "000")

echo "API (5047): $API_STATUS"
echo "UI (4201): $UI_STATUS"

if [[ "$API_STATUS" != "200" || "$UI_STATUS" != "200" ]]; then
    echo "❌ Services not ready. Starting WSL standalone services..."
    cd /mnt/c/Projects/LessonTree
    ./start-wsl-services-standalone.sh
    echo "⏳ Waiting for services to be ready..."
    sleep 30
fi

# Navigate to E2E project
cd /mnt/c/Projects/LessonTree/LessonTree-E2E

# Run Cypress with virtual framebuffer (fixes Electron crashes)
echo "🧪 Running Cypress tests with proper display setup..."
xvfb-run -a -s "-screen 0 1280x720x24" \
    npx cypress run \
    --config-file cypress.config.wsl-standalone.js \
    --browser electron \
    "$@"