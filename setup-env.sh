#!/bin/bash

# GratituGram Environment Setup Script
# Run this once to configure EAS environment variables

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║  GratituGram Environment Setup         ║"
echo "║  Configure EAS Secrets                 ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}This script will set up environment variables in EAS.${NC}"
echo ""

# Check if user has SENDGRID_API_KEY
read -p "Do you have a SendGrid API key? (y/n): " has_sendgrid

echo ""
echo -e "${BLUE}Setting up environment variables...${NC}"
echo ""

# Supabase URL (already known)
echo "📝 Adding SUPABASE_URL..."
npx eas secret:create --scope project --name SUPABASE_URL --value "https://lufpjgmvkccrmefdykki.supabase.co" --type string --force || true

# Supabase Anon Key (already known)
echo "📝 Adding SUPABASE_ANON_KEY..."
npx eas secret:create --scope project --name SUPABASE_ANON_KEY --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1ZnBqZ212a2Njcm1lZmR5a2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTE0OTcsImV4cCI6MjA3NzY2NzQ5N30.b0n4kLon25DdSlJ_rFn6EAf1JSczH2ToqaB49ZqtaDg" --type string --force || true

# FROM_EMAIL
echo "📝 Adding FROM_EMAIL..."
npx eas secret:create --scope project --name FROM_EMAIL --value "hello@showthx.app" --type string --force || true

# SendGrid API Key (if user has it)
if [ "$has_sendgrid" = "y" ]; then
    echo ""
    read -p "Enter your SendGrid API Key: " sendgrid_key
    echo "📝 Adding SENDGRID_API_KEY..."
    npx eas secret:create --scope project --name SENDGRID_API_KEY --value "$sendgrid_key" --type string --force || true
else
    echo -e "${YELLOW}⚠ Skipping SENDGRID_API_KEY (you can add it later)${NC}"
fi

echo ""
echo -e "${GREEN}✓ Environment setup complete!${NC}"
echo ""
echo "View your secrets at:"
echo "https://expo.dev/accounts/ericgoodlev/projects/showthx/secrets"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Run './build.sh' to start a build"
echo "2. Or run: npx eas build --profile preview --platform ios"
