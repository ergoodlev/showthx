#!/bin/bash

# GratituGram Build Script
# Easy builds with EAS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║     GratituGram Build Script           ║"
echo "║     EAS Cloud Builds Made Easy         ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# Check if EAS CLI is installed
check_eas_cli() {
    if ! command -v eas &> /dev/null; then
        print_error "EAS CLI not found!"
        print_info "Installing EAS CLI globally..."
        npm install -g eas-cli
        print_success "EAS CLI installed!"
    else
        print_success "EAS CLI found!"
    fi
}

# Check if logged in to EAS
check_eas_login() {
    if ! npx eas whoami &> /dev/null; then
        print_error "Not logged in to EAS!"
        print_info "Please log in..."
        npx eas login
    else
        USERNAME=$(npx eas whoami 2>/dev/null | head -n 1)
        print_success "Logged in as: $USERNAME"
    fi
}

# Display build menu
show_menu() {
    echo ""
    echo -e "${YELLOW}Select Build Type:${NC}"
    echo "1) iOS Development"
    echo "2) iOS Preview (TestFlight)"
    echo "3) iOS Production"
    echo "4) Android Development"
    echo "5) Android Preview"
    echo "6) Android Production"
    echo "7) Both Platforms (Preview)"
    echo "8) Both Platforms (Production)"
    echo "9) Check Build Status"
    echo "0) Exit"
    echo ""
}

# Build function
build() {
    local profile=$1
    local platform=$2

    print_info "Starting $platform build with profile: $profile"
    print_warning "This will run in the cloud and take 10-15 minutes..."
    echo ""

    npx eas build --profile "$profile" --platform "$platform"

    if [ $? -eq 0 ]; then
        print_success "Build submitted successfully!"
        print_info "Monitor your build at: https://expo.dev/accounts/ericgoodlev/projects/showthx/builds"
    else
        print_error "Build failed!"
        exit 1
    fi
}

# Check build status
check_status() {
    print_info "Checking recent builds..."
    npx eas build:list --limit 5
}

# Main script
main() {
    # Pre-flight checks
    check_eas_cli
    check_eas_login

    # Show menu
    while true; do
        show_menu
        read -p "Enter your choice [0-9]: " choice

        case $choice in
            1)
                build "development" "ios"
                ;;
            2)
                build "preview" "ios"
                ;;
            3)
                build "production" "ios"
                ;;
            4)
                build "development" "android"
                ;;
            5)
                build "preview" "android"
                ;;
            6)
                build "production" "android"
                ;;
            7)
                build "preview" "all"
                ;;
            8)
                build "production" "all"
                ;;
            9)
                check_status
                ;;
            0)
                print_info "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please try again."
                ;;
        esac

        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main function
main
