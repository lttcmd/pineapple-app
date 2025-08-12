#!/bin/bash

# Production Build Script for Mobile App

echo "📱 Building production version of mobile app..."

# Set production server URL (replace with your DigitalOcean domain)
export EXPO_PUBLIC_SERVER_URL="https://your-domain.com"

echo "🔧 Using server URL: $EXPO_PUBLIC_SERVER_URL"

# Build for Android
echo "🤖 Building Android APK..."
npx expo build:android --type apk

# Build for iOS (requires Apple Developer account)
echo "🍎 Building iOS IPA..."
npx expo build:ios --type archive

echo "✅ Production builds complete!"
echo ""
echo "Next steps:"
echo "1. Download the built APK/IPA files"
echo "2. Distribute via your preferred method (App Store, direct download, etc.)"
echo "3. Update your server URL in the config before building"
