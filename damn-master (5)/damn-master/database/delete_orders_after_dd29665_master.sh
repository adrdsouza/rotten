#!/bin/bash

# Master script to delete all orders after DD29665
# This script orchestrates the complete deletion process with safety checks
# Created: $(date +%Y-%m-%d)

set -e  # Exit on any error

# Configuration
DB_NAME="vendure_db"
LOG_DIR="/home/vendure/damneddesigns/database/logs"
SQL_DIR="/home/vendure/damneddesigns/database/sql"
BACKUP_DIR="/home/vendure/damneddesigns/database/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/delete_orders_dd29665_$TIMESTAMP.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create directories if they don't exist
mkdir -p "$LOG_DIR" "$BACKUP_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# Function to check if PostgreSQL is running
check_postgres() {
    if ! sudo -u postgres psql -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        log_error "Cannot connect to PostgreSQL database '$DB_NAME'"
        exit 1
    fi
    log_success "PostgreSQL connection verified"
}

# Function to create database backup
create_backup() {
    local backup_file="$BACKUP_DIR/vendure_db_before_delete_dd29665_$TIMESTAMP.sql"
    log_info "Creating database backup..."
    
    if sudo -u postgres pg_dump "$DB_NAME" > "$backup_file"; then
        log_success "Database backup created: $backup_file"
        # Compress the backup
        gzip "$backup_file"
        log_success "Backup compressed: ${backup_file}.gz"
    else
        log_error "Failed to create database backup"
        exit 1
    fi
}

# Function to run SQL script with error handling
run_sql_script() {
    local script_path="$1"
    local description="$2"
    
    if [ ! -f "$script_path" ]; then
        log_error "SQL script not found: $script_path"
        return 1
    fi
    
    log_info "Running $description..."
    log_info "Script: $script_path"
    
    if sudo -u postgres psql -d "$DB_NAME" -f "$script_path" >> "$LOG_FILE" 2>&1; then
        log_success "$description completed successfully"
        return 0
    else
        log_error "$description failed"
        return 1
    fi
}

# Function to prompt user for confirmation
confirm() {
    local message="$1"
    local response
    
    echo -e "${YELLOW}$message${NC}"
    read -p "Continue? (y/N): " response
    
    case "$response" in
        [yY]|[yY][eE][sS])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Main execution
main() {
    log_info "=== Starting Order Deletion Process for Orders After DD29665 ==="
    log_info "Log file: $LOG_FILE"
    log_info "Timestamp: $TIMESTAMP"
    
    # Step 0: Initial checks
    log_info "Step 0: Performing initial checks..."
    check_postgres
    
    # Check if SQL scripts exist
    local required_scripts=(
        "$SQL_DIR/dry_run_orders_after_dd29665.sql"
        "$SQL_DIR/clear_inventory_reservations_dd29665.sql"
        "$SQL_DIR/transition_orders_to_cancelled_dd29665.sql"
        "$SQL_DIR/delete_orders_after_dd29665.sql"
    )
    
    for script in "${required_scripts[@]}"; do
        if [ ! -f "$script" ]; then
            log_error "Required SQL script not found: $script"
            exit 1
        fi
    done
    log_success "All required SQL scripts found"
    
    # Step 1: Dry run analysis
    echo
    log_info "=== STEP 1: DRY RUN ANALYSIS ==="
    
    if ! confirm "Run dry run analysis to see what orders will be affected?"; then
        log_warning "Dry run analysis skipped by user"
    else
        if run_sql_script "$SQL_DIR/dry_run_orders_after_dd29665.sql" "Dry run analysis"; then
            echo
            if ! confirm "Review the dry run results above. Do you want to proceed with the deletion process?"; then
                log_info "Process cancelled by user after dry run review"
                exit 0
            fi
        else
            log_error "Dry run analysis failed. Aborting."
            exit 1
        fi
    fi
    
    # Step 2: Create backup
    echo
    log_info "=== STEP 2: DATABASE BACKUP ==="
    
    if ! confirm "Create a database backup before proceeding? (HIGHLY RECOMMENDED)"; then
        log_warning "Database backup skipped by user - THIS IS RISKY!"
        if ! confirm "Are you absolutely sure you want to proceed without a backup?"; then
            log_info "Process cancelled - backup is recommended"
            exit 0
        fi
    else
        create_backup
    fi
    
    # Step 3: Clear inventory reservations
    echo
    log_info "=== STEP 3: CLEAR INVENTORY RESERVATIONS ==="
    
    if ! confirm "Clear inventory reservations (stock allocations) for orders after DD29665?"; then
        log_warning "Inventory reservation clearing skipped by user"
    else
        if ! run_sql_script "$SQL_DIR/clear_inventory_reservations_dd29665.sql" "Inventory reservation clearing"; then
            log_error "Failed to clear inventory reservations. Aborting."
            exit 1
        fi
    fi
    
    # Step 4: Transition PaymentSettled orders to Cancelled
    echo
    log_info "=== STEP 4: TRANSITION ORDERS TO CANCELLED ==="
    
    if ! confirm "Transition PaymentSettled orders to Cancelled state?"; then
        log_warning "Order state transition skipped by user"
    else
        if ! run_sql_script "$SQL_DIR/transition_orders_to_cancelled_dd29665.sql" "Order state transitions"; then
            log_error "Failed to transition order states. Aborting."
            exit 1
        fi
    fi
    
    # Step 5: Final deletion
    echo
    log_info "=== STEP 5: DELETE ORDERS AND RELATED DATA ==="
    log_warning "THIS IS THE FINAL STEP - ORDERS WILL BE PERMANENTLY DELETED!"
    
    if ! confirm "Proceed with permanent deletion of orders after DD29665?"; then
        log_info "Final deletion cancelled by user"
        exit 0
    fi
    
    if ! run_sql_script "$SQL_DIR/delete_orders_after_dd29665.sql" "Order deletion"; then
        log_error "Order deletion failed!"
        log_error "Check the log file for details: $LOG_FILE"
        exit 1
    fi
    
    # Step 6: Final verification
    echo
    log_info "=== STEP 6: FINAL VERIFICATION ==="
    
    log_info "Running final verification..."
    local remaining_orders
    remaining_orders=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"order\" WHERE CAST(SUBSTRING(code, 3) AS INTEGER) > 29665;" 2>/dev/null | tr -d ' ')
    
    if [ "$remaining_orders" = "0" ]; then
        log_success "Verification passed: No orders after DD29665 remain in the database"
    else
        log_error "Verification failed: $remaining_orders orders after DD29665 still exist"
        exit 1
    fi
    
    # Success!
    echo
    log_success "=== ORDER DELETION PROCESS COMPLETED SUCCESSFULLY ==="
    log_info "All orders after DD29665 have been deleted along with:"
    log_info "- Order lines"
    log_info "- Payments and refunds"
    log_info "- History entries"
    log_info "- Fulfillments"
    log_info "- Stock allocations"
    log_info "- All other related data"
    log_info ""
    log_info "Log file: $LOG_FILE"
    if [ -f "$BACKUP_DIR/vendure_db_before_delete_dd29665_$TIMESTAMP.sql.gz" ]; then
        log_info "Backup file: $BACKUP_DIR/vendure_db_before_delete_dd29665_$TIMESTAMP.sql.gz"
    fi
    
    echo
    echo -e "${GREEN}Process completed successfully!${NC}"
}

# Error handling
trap 'log_error "Script interrupted or failed at line $LINENO"' ERR
trap 'log_info "Script interrupted by user"' INT

# Run main function
main "$@"