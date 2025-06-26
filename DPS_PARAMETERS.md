# DPS Parameter Reference Guide

This document lists all available command-line parameters and flags for the DualPhotoStack (DPS) system.

## Test Script Parameters (`test-download-and-run.sh`)

### Development Modes

#### `--localdev`
**Description**: Skip downloading and use local source code for testing
- Bypasses GitHub release download
- Uses current working directory code
- Enables rapid development iteration
- **Note**: Use `--localdev` (not `--localdevmode`)

**Example**:
```bash
./test-download-and-run.sh --localdev
```

#### `--interactive`
**Description**: Run in interactive mode with extended timeout
- Extends timeout from 30 seconds to 5 minutes
- Allows manual testing and interaction
- Useful for UI testing and debugging

**Example**:
```bash
./test-download-and-run.sh --interactive
./test-download-and-run.sh --localdev --interactive
```

### Logging and Debugging

#### `--remote-logs`
**Description**: Enable remote logging via Pastebin
- Streams logs to a public Pastebin URL
- Perfect for VM testing without SSH access
- Uses hardcoded API key for convenience
- Creates shareable URL for monitoring

**Example**:
```bash
./test-download-and-run.sh --remote-logs
./test-download-and-run.sh --localdev --remote-logs --interactive
```

### Combined Usage Examples

```bash
# Local development with interactive testing and remote logging
./test-download-and-run.sh --localdev --interactive --remote-logs

# Quick local test
./test-download-and-run.sh --localdev

# VM testing with remote monitoring
./test-download-and-run.sh --remote-logs --interactive
```

## Electron App Parameters (`npm start`)

### Startup and Debugging

#### `--verbose-startup`
**Description**: Enable detailed startup logging
- Shows comprehensive initialization steps
- Displays system verification information
- Useful for troubleshooting startup issues

#### `--dev`
**Description**: Enable development mode
- Opens DevTools automatically
- Enables hot reload (if available)
- Shows additional debug information

#### `--force-window-visible`
**Description**: Aggressive window positioning
- Forces window to front and center
- Applies focus and moveTop operations
- Useful for headless or VM environments

#### `--no-remote-logs` / `--local-only`
**Description**: Disable remote logging (enabled by default)
- Remote logging is ON by default for easier troubleshooting
- Streams logs to daily Pastebin with hardcoded API key
- Use these flags to disable if you want local-only logging

#### `--remote-logs` / `--vm-testing` / `--remote-debug` (Legacy)
**Description**: Force enable remote logging (now default)
- These flags are no longer needed (remote logging is default)
- Kept for backward compatibility

### Example Electron Usage

```bash
# Development mode with verbose logging
npm start -- --dev --verbose-startup

# VM testing with remote logs and forced visibility
npm start -- --remote-logs --force-window-visible --verbose-startup

# Full debugging setup
npm start -- --dev --verbose-startup --remote-logs --force-window-visible
```

## System Detection Parameters

The DPS system automatically detects various environment parameters. These are not command-line flags but system states that affect behavior:

### Network Detection
- **Localhost**: Always detected (127.0.0.1)
- **Local Network IP**: Auto-detected via network interfaces
- **Tailscale IP**: Auto-detected if Tailscale is running

### Platform Detection
- **Linux**: Primary supported platform
- **Architecture**: x64, arm64, etc.
- **Docker**: Availability and version detection
- **Docker Compose**: Version detection

### User Environment
- **Home Directory**: Auto-detected via `process.env.HOME`
- **User UID/GID**: For permission validation
- **Timezone**: System timezone detection

## Environment Variables

These can be set in your shell or passed to the application:

### `NODE_ENV`
```bash
NODE_ENV=development npm start
```

### `DEBUG`
```bash
DEBUG=dps:* npm start
```

## Configuration Files

### CLAUDE.md Context
The system checks for `CLAUDE.md` in the project root for additional context and configuration instructions.

### Store Configuration
Electron-store automatically manages configuration in:
- Linux: `~/.config/dual-photo-stack/config.json`

## Troubleshooting Common Parameter Issues

### Issue: `--localdevmode` not working
**Solution**: Use `--localdev` (without "mode")

### Issue: Still downloading despite local dev mode
**Verification**: Check that you're in the correct directory and using `--localdev`

### Issue: Remote logging not working
**Check**: Ensure you're using one of: `--remote-logs`, `--vm-testing`, or `--remote-debug`

### Issue: App window not visible
**Solution**: Add `--force-window-visible` flag

### Issue: Not enough debug information
**Solution**: Combine `--verbose-startup` with `--dev`

## Quick Reference Commands

```bash
# Local development
./test-download-and-run.sh --localdev --interactive

# VM testing
./test-download-and-run.sh --remote-logs --interactive

# Full debug mode
./test-download-and-run.sh --localdev --interactive --remote-logs

# Direct Electron testing
npm start -- --dev --verbose-startup --remote-logs --force-window-visible
```

## Parameter Combinations

All parameters can be combined. Recommended combinations:

1. **Local Development**: `--localdev --interactive`
2. **VM Testing**: `--remote-logs --interactive --force-window-visible`
3. **Full Debug**: `--localdev --interactive --remote-logs --verbose-startup --dev`
4. **CI/Automated**: No parameters (uses defaults)

## Notes

- Parameters are case-sensitive
- Use `--` before Electron app parameters when using `npm start`
- Test script parameters don't require `--`
- Remote logging requires internet connection for Pastebin
- Local dev mode requires you to be in the project directory