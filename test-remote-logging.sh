#!/bin/bash
# Test Remote Logging Feature
# Demonstrates VM testing with GitHub Gist log streaming

echo "🌐 DPS Remote Logging Test"
echo "=========================="
echo
echo "This test will:"
echo "  • Start DPS with remote logging enabled"
echo "  • Create a GitHub Gist for log streaming"
echo "  • Stream all logs to the Gist in real-time"
echo "  • Provide a URL you can monitor from any device"
echo

echo "Starting DPS with remote logging..."
echo

# Run with remote logging enabled
./test-download-and-run.sh --localdev --interactive --remote-logs

echo
echo "Remote logging test completed!"
echo "Check the console output above for the GitHub Gist URL."