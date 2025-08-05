#!/bin/bash

# Claude Code Agents Dashboard Startup Script
# This script provides an easy way to start the dashboard service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DASHBOARD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_PORT=3001
SERVER_PORT=3002

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    else
        return 0
    fi
}

# Function to check if Node.js is installed
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js to continue."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm to continue."
        exit 1
    fi
    
    print_success "Node.js $(node --version) and npm $(npm --version) are available"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dashboard dependencies..."
    
    # Install server dependencies
    if [ ! -d "node_modules" ]; then
        print_status "Installing server dependencies..."
        npm install
    else
        print_status "Server dependencies already installed"
    fi
    
    # Install client dependencies
    if [ ! -d "client/node_modules" ]; then
        print_status "Installing client dependencies..."
        cd client && npm install && cd ..
    else
        print_status "Client dependencies already installed"
    fi
    
    print_success "All dependencies installed"
}

# Function to check port availability
check_ports() {
    print_status "Checking port availability..."
    
    if ! check_port $CLIENT_PORT; then
        print_warning "Port $CLIENT_PORT is already in use. Dashboard client may not start properly."
        print_status "You can kill the process using: lsof -ti:$CLIENT_PORT | xargs kill -9"
    fi
    
    if ! check_port $SERVER_PORT; then
        print_warning "Port $SERVER_PORT is already in use. Dashboard server may not start properly."
        print_status "You can kill the process using: lsof -ti:$SERVER_PORT | xargs kill -9"
    fi
}

# Function to start the dashboard
start_dashboard() {
    local demo_mode=${1:-false}
    
    print_status "Starting Claude Code Agents Dashboard..."
    print_status "Client will be available at: http://localhost:$CLIENT_PORT"
    print_status "Server API will be available at: http://localhost:$SERVER_PORT"
    print_status "Press Ctrl+C to stop the dashboard"
    
    if [ "$demo_mode" = "true" ]; then
        print_status "Running in DEMO MODE with sample data"
        NODE_ENV=demo npm start
    elif [ ! -f "../.plan/tasks.json" ] || [ ! -s "../.plan/tasks.json" ]; then
        print_status "Template repository detected - running in test mode"
        NODE_ENV=test npm start
    else
        print_status "Production repository detected - running in production mode"
        npm start
    fi
}

# Function to show help
show_help() {
    echo "Claude Code Agents Dashboard Startup Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -c, --check    Check prerequisites only"
    echo "  -i, --install  Install dependencies only"
    echo "  -p, --ports    Check port availability only"
    echo "  -d, --demo     Start in demo mode with sample data"
    echo ""
    echo "Examples:"
    echo "  $0              Start the dashboard (default)"
    echo "  $0 --check     Check if Node.js and npm are available"
    echo "  $0 --install   Install dependencies without starting"
    echo "  $0 --ports     Check if ports 3001 and 3002 are available"
    echo "  $0 --demo      Start the dashboard in demo mode"
}

# Main execution
main() {
    cd "$DASHBOARD_DIR"
    
    case "${1:-start}" in
        -h|--help)
            show_help
            exit 0
            ;;
        -c|--check)
            print_status "Checking prerequisites..."
            check_nodejs
            print_success "All prerequisites met"
            exit 0
            ;;
        -i|--install)
            check_nodejs
            install_dependencies
            exit 0
            ;;
        -p|--ports)
            check_ports
            exit 0
            ;;
        -d|--demo)
            print_status "Starting Claude Code Agents Dashboard in demo mode..."
            check_nodejs
            install_dependencies
            check_ports
            start_dashboard true
            ;;
        start|"")
            print_status "Starting Claude Code Agents Dashboard..."
            check_nodejs
            install_dependencies
            check_ports
            start_dashboard false
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Trap Ctrl+C and cleanup
trap 'print_status "Shutting down dashboard..."; exit 0' INT

# Run main function
main "$@"