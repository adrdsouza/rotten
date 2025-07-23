#!/bin/bash

# Bulk Tracking Update Script - Vendure CLI Approach
# 
# This script uses Vendure's recommended CLI approach for bulk operations
# by bootstrapping Vendure directly, bypassing HTTP/auth issues.
#
# Usage: 
#   ./scripts/update-tracking.sh [--dry-run] [--file path/to/csv]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display help
show_help() {
    echo -e "${BLUE}Bulk Tracking Number Update Tool (Vendure CLI)${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
    echo "This tool uses Vendure's recommended CLI approach for bulk operations."
    echo "It bootstraps Vendure directly, avoiding HTTP/auth issues while ensuring"
    echo "the same events are triggered as the Admin UI (emails sent automatically)."
    echo ""
    echo -e "${GREEN}Usage:${NC}"
    echo "  ./update-tracking.sh [options]"
    echo ""
    echo -e "${GREEN}Options:${NC}"
    echo "  --dry-run         Test mode - shows what would be updated without making changes"
    echo "  --file <path>     Path to CSV file (default: tracking.csv)"
    echo "  --help            Show this help message"
    echo ""
    echo -e "${GREEN}CSV Format:${NC}"
    echo "  order code,provider,tracking code"
    echo "  DD29217,fedex,390944013515"
    echo "  DD29402,ups,390943729403"
    echo ""
    echo -e "${GREEN}Examples:${NC}"
    echo "  ./update-tracking.sh --dry-run                    # Test with default CSV"
    echo "  ./update-tracking.sh --file custom.csv           # Use custom CSV file"
    echo "  ./update-tracking.sh --dry-run --file custom.csv # Test with custom CSV"
    echo ""
    echo -e "${YELLOW}Advantages of this approach:${NC}"
    echo "  ✅ No HTTP/authentication issues"
    echo "  ✅ Direct access to Vendure services"
    echo "  ✅ Same events triggered as Admin UI"
    echo "  ✅ Automatic email notifications to customers"
    echo "  ✅ Better error handling and transaction support"
    echo "  ✅ Follows Vendure's recommended patterns for CLI tools"
}

# Check for help flag
if [[ "$1" == "--help" || "$#" -eq 0 ]]; then
    show_help
    exit 0
fi

# Get the directory where this script is located (database directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATABASE_DIR="$SCRIPT_DIR"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")/backend"

# Stay in database directory but reference backend for dependencies
cd "$DATABASE_DIR"

echo -e "${BLUE}🚀 Vendure Bulk Tracking Update Tool${NC}"
echo -e "${BLUE}====================================${NC}"

# Check if we can find the backend directory and vendure config
if [[ ! -f "$BACKEND_DIR/src/vendure-config.ts" ]]; then
    echo -e "${RED}❌ Error: Cannot find Vendure backend configuration${NC}"
    echo -e "${RED}   Current directory: $(pwd)${NC}"
    echo -e "${RED}   Expected to find: $BACKEND_DIR/src/vendure-config.ts${NC}"
    exit 1
fi

# Check if TypeScript and dependencies are available
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ Error: pnpm is not installed or not in PATH${NC}"
    exit 1
fi

# Check if ts-node is available in the backend directory
if ! (cd "$BACKEND_DIR" && pnpm exec ts-node --version &> /dev/null); then
    echo -e "${YELLOW}⚠️  ts-node not found in backend directory${NC}"
    echo -e "${YELLOW}   Please run 'cd $BACKEND_DIR && pnpm add -D ts-node typescript'${NC}"
    exit 1
fi

# Parse arguments
ARGS=()
DRY_RUN_FLAG=""
FILE_FLAG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN_FLAG="--dry-run"
            ARGS+=("$1")
            shift
            ;;
        --file)
            FILE_FLAG="--file"
            ARGS+=("$1")
            if [[ -n "$2" && "$2" != --* ]]; then
                ARGS+=("$2")
                shift
            fi
            shift
            ;;
        *)
            ARGS+=("$1")
            shift
            ;;
    esac
done

# Display mode
if [[ -n "$DRY_RUN_FLAG" ]]; then
    echo -e "${YELLOW}🔍 DRY RUN MODE: Testing without making changes${NC}"
else
    echo -e "${GREEN}💡 LIVE MODE: Will update tracking numbers and send emails${NC}"
fi

# Check if default CSV file exists (if no custom file specified)
if [[ -z "$FILE_FLAG" ]]; then
    DEFAULT_CSV="tracking.csv"
    if [[ ! -f "$DEFAULT_CSV" ]]; then
        echo -e "${RED}❌ Error: Default CSV file not found: $DEFAULT_CSV${NC}"
        echo -e "${YELLOW}   Use --file option to specify a different CSV file${NC}"
        exit 1
    fi
    echo -e "${BLUE}📋 Using default CSV file: $DEFAULT_CSV${NC}"
fi

echo ""

# Run the TypeScript CLI tool
echo -e "${BLUE}🔄 Starting bulk tracking update...${NC}"
echo ""

# Adjust file paths to be absolute if they're relative
ADJUSTED_ARGS=()
for arg in "${ARGS[@]}"; do
    if [[ "$arg" == "--file" ]]; then
        ADJUSTED_ARGS+=("$arg")
    elif [[ "${ARGS[$(( ${#ADJUSTED_ARGS[@]} - 1 ))]}" == "--file" ]]; then
        # This is the file argument, make it absolute if it's relative
        if [[ "$arg" == /* ]]; then
            ADJUSTED_ARGS+=("$arg")
        else
            ADJUSTED_ARGS+=("$DATABASE_DIR/$arg")
        fi
    else
        ADJUSTED_ARGS+=("$arg")
    fi
done

# If no file specified, use default
if [[ -z "$FILE_FLAG" ]]; then
    ADJUSTED_ARGS+=("--file" "$DATABASE_DIR/tracking.csv")
fi

if (cd "$BACKEND_DIR" && pnpm exec ts-node scripts/bulk-tracking-cli.ts "${ADJUSTED_ARGS[@]}"); then
    echo ""
    if [[ -n "$DRY_RUN_FLAG" ]]; then
        echo -e "${GREEN}✅ Dry run completed successfully!${NC}"
        echo -e "${YELLOW}   To perform the actual update, run without --dry-run${NC}"
    else
        echo -e "${GREEN}✅ Bulk tracking update completed successfully!${NC}"
        echo -e "${GREEN}   📧 Email notifications have been sent to customers${NC}"
    fi
else
    echo ""
    echo -e "${RED}❌ Bulk tracking update failed${NC}"
    echo -e "${YELLOW}   Check the error messages above for details${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🎉 Process completed!${NC}"
