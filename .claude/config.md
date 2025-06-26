# Claude Code Project Configuration

## Screenshots Directory
Screenshots are located at: `/var/home/j/Pictures/Screenshots/`

When the user says "look at screenshots" or similar, check this directory for recent files.
Most recent screenshots are typically from the current date (2025-06-26).

## Working Directory Information
- Primary project directory: `/var/home/j/Documents/DualPhotoStack`
- Screenshots path: `/var/home/j/Pictures/Screenshots/`
- DPS logs: `/var/home/j/.config/dps/logs/`
- Additional working directories: `/var/home/j/.config/dps/logs`

## Quick Access Commands
- Recent screenshots: `ls -la "/var/home/j/Pictures/Screenshots/" | tail -10`
- Today's screenshots: `ls -la "/var/home/j/Pictures/Screenshots/" | grep "$(date '+%Y-%m-%d')"`
- Latest screenshot: `ls -t "/var/home/j/Pictures/Screenshots/" | head -1`

## Project Context
This is the DualPhotoStack (DPS) project - a Linux-focused Electron application for coordinated Immich and PhotoPrism deployment. The project includes automated GitHub Actions builds, comprehensive logging, and agentic testing capabilities.

## Permissions and Workspace
The user has granted full development permissions within this project directory:
- File operations: read, write, edit, create, delete within `/var/home/j/Documents/DualPhotoStack/`
- System commands: ls, mkdir, find, grep, git operations
- Build operations: npm, electron-builder, test script execution
- Log analysis: reading DPS logs, crash diagnostics
- GitHub operations: releases, workflow management

This is an active development environment where Claude can perform necessary operations for debugging, building, and maintaining the DPS project.