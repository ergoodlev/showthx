#!/bin/bash
# Start Expo development server with proper terminal output

cd /Users/ericgoodlev/Desktop/GratituGram

echo "🚀 Starting GratituGram Development Server"
echo "=========================================="
echo ""
echo "This will:"
echo "1. Clear the Expo cache"
echo "2. Rebuild the Metro bundler"
echo "3. Display a QR code you can scan with ExpoGo"
echo ""
echo "Once the server is running, open ExpoGo on your phone and:"
echo "- Tap 'Scan QR code' button"
echo "- Point your camera at the QR code below"
echo "- Or tap 'Enter manually' and type: 192.168.1.224:8081"
echo ""
echo "=========================================="
echo ""

npx expo start --clear
