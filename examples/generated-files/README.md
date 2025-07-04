# Generated Files Examples

This directory contains example files that were previously generated by the DPS template engine.

**Important:** These files contain hardcoded paths and should NOT be used directly. They are kept here for reference only.

## How It Works

1. **Templates** (`/docker-templates/`) contain variable placeholders like `{{STACK_PATH}}`
2. **Template Engine** substitutes these with actual user paths
3. **Generated Files** are created in the user's output directory (default: `~/.local/share/docker-stacks`)

## User-Specific Paths

When the template engine runs, it will create files with paths specific to the current user:
- `{{STACK_PATH}}` → `~/.local/share/docker-stacks` 
- `{{DATA_STORAGE_PATH}}` → User-selected data directory
- `{{LIBRARY_PATH}}` → User-selected photo library

This ensures compatibility with:
- Different users
- Immutable Linux distributions  
- Various system configurations

## Usage

Run the Electron app to generate properly configured files for your system.