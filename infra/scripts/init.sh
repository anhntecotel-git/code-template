#!/bin/bash

# Make all scripts executable
chmod +x deploy.sh backup.sh start.sh

echo "✅ All scripts are now executable!"
echo ""
echo "Scripts available:"
echo "  1. deploy.sh   - Deploy to Kubernetes"
echo "  2. backup.sh   - Backup databases and volumes"
echo "  3. start.sh    - Start application locally"
echo ""
echo "Usage:"
echo "  ./deploy.sh [environment] [version]"
echo "  ./backup.sh [type] [destination]"
echo "  ./start.sh [mode] [options]"
echo ""
echo "For help, run:"
echo "  ./deploy.sh --help"
echo "  ./backup.sh --help"
echo "  ./start.sh --help"
