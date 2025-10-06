#!/bin/bash

# Script to clean up merge conflicts by taking the HEAD version
# This removes conflict markers and keeps the HEAD version of conflicted sections

echo "Cleaning up merge conflicts..."

# Function to clean a single file
clean_file() {
    local file="$1"
    echo "Cleaning $file..."
    
    # Create a temporary file
    temp_file=$(mktemp)
    
    # Process the file line by line
    in_conflict=false
    in_head_section=false
    
    while IFS= read -r line; do
        if [[ "$line" == "<<<<<<< HEAD" ]]; then
            in_conflict=true
            in_head_section=true
            continue
        elif [[ "$line" == "=======" ]]; then
            in_head_section=false
            continue
        elif [[ "$line" =~ ">>>>>>> " ]]; then
            in_conflict=false
            in_head_section=false
            continue
        fi
        
        # Only write lines if we're not in conflict or if we're in the HEAD section
        if [[ "$in_conflict" == false ]] || [[ "$in_head_section" == true ]]; then
            echo "$line" >> "$temp_file"
        fi
    done < "$file"
    
    # Replace the original file
    mv "$temp_file" "$file"
    echo "Cleaned $file"
}

# Clean specific files with conflicts
clean_file "frontend/src/components/payment/StripePayment.tsx"
clean_file "frontend/src/components/payment/PaymentErrorDisplay.tsx"
clean_file "frontend/src/routes/checkout/index.tsx"
clean_file "frontend/src/services/payment-error-handler.ts"

# Find and clean any other files with conflict markers
echo "Searching for other files with conflict markers..."
grep -r "<<<<<<< HEAD" frontend/ backend/ 2>/dev/null | cut -d: -f1 | sort -u | while read -r file; do
    if [[ -f "$file" ]]; then
        clean_file "$file"
    fi
done

echo "Conflict cleanup complete!"
