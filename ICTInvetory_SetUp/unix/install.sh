#!/usr/bin/env bash
# =============================================================================
# ICT Inventory Agent — Unix Installer
# =============================================================================
#
# Installs the ICT agent to /opt/ict-agent/ and sets up automatic execution
# via cron (Linux) or launchd (macOS).
#
# Usage:
#   sudo bash install.sh           # Install with auto-start
#   sudo bash install.sh --remove  # Uninstall
# =============================================================================

set -euo pipefail

INSTALL_DIR="/opt/ict-agent"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OS_TYPE="$(uname -s)"
AGENT_SCRIPT="ict_agent.sh"
CONFIG_FILE="config.json"
PLIST_LABEL="com.ict-inventory.agent"
PLIST_PATH="/Library/LaunchDaemons/${PLIST_LABEL}.plist"
CRON_MARKER="# ict-inventory-agent"
SYSTEMD_SERVICE="ict-agent.service"

# ─── Helpers ─────────────────────────────────────────────────────────────────

info()  { echo "[INFO]  $*"; }
warn()  { echo "[WARN]  $*" >&2; }
error() { echo "[ERROR] $*" >&2; exit 1; }

check_root() {
    if [[ "$(id -u)" -ne 0 ]]; then
        error "This script must be run as root (use sudo)."
    fi
}

# ─── Install ─────────────────────────────────────────────────────────────────

install_files() {
    info "Installing agent to ${INSTALL_DIR}..."
    mkdir -p "${INSTALL_DIR}"
    cp "${SCRIPT_DIR}/${AGENT_SCRIPT}" "${INSTALL_DIR}/${AGENT_SCRIPT}"
    chmod +x "${INSTALL_DIR}/${AGENT_SCRIPT}"

    # Only copy config if it doesn't already exist (preserve user edits)
    if [[ ! -f "${INSTALL_DIR}/${CONFIG_FILE}" ]]; then
        cp "${SCRIPT_DIR}/${CONFIG_FILE}" "${INSTALL_DIR}/${CONFIG_FILE}"
        info "Default config.json installed. Please edit ${INSTALL_DIR}/${CONFIG_FILE} with your server URL."
    else
        info "Existing config.json preserved."
    fi
}

install_cron() {
    info "Setting up cron job..."
    local cron_cmd="@reboot ${INSTALL_DIR}/${AGENT_SCRIPT} ${CRON_MARKER}"

    # Remove existing entry if present
    (crontab -l 2>/dev/null || true) | grep -v "${CRON_MARKER}" | crontab -

    # Add new entry
    (crontab -l 2>/dev/null || true; echo "${cron_cmd}") | crontab -
    info "Cron job installed: will start agent on boot."
}

install_systemd() {
    local service_path="/etc/systemd/system/${SYSTEMD_SERVICE}"
    info "Creating systemd service at ${service_path}..."

    cat > "${service_path}" <<EOF
[Unit]
Description=ICT Inventory Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/bin/bash ${INSTALL_DIR}/${AGENT_SCRIPT}
Restart=on-failure
RestartSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "${SYSTEMD_SERVICE}"
    systemctl start "${SYSTEMD_SERVICE}"
    info "Systemd service enabled and started."
}

install_launchd() {
    info "Creating launchd plist at ${PLIST_PATH}..."

    cat > "${PLIST_PATH}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${INSTALL_DIR}/${AGENT_SCRIPT}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${INSTALL_DIR}/agent_stdout.log</string>
    <key>StandardErrorPath</key>
    <string>${INSTALL_DIR}/agent_stderr.log</string>
</dict>
</plist>
EOF

    launchctl load "${PLIST_PATH}"
    info "launchd daemon loaded. Agent will start on boot."
}

do_install() {
    check_root
    install_files

    case "${OS_TYPE}" in
        Linux)
            if command -v systemctl &>/dev/null; then
                install_systemd
            else
                install_cron
            fi
            ;;
        Darwin)
            install_launchd
            ;;
        *)
            warn "Unknown OS '${OS_TYPE}'. Installing files only (no auto-start)."
            ;;
    esac

    echo ""
    info "============================================"
    info "  Installation complete!"
    info "  Config: ${INSTALL_DIR}/${CONFIG_FILE}"
    info "  Agent:  ${INSTALL_DIR}/${AGENT_SCRIPT}"
    info "============================================"
    echo ""
    info "IMPORTANT: Edit ${INSTALL_DIR}/${CONFIG_FILE} to set your server URL."
}

# ─── Uninstall ───────────────────────────────────────────────────────────────

do_remove() {
    check_root
    info "Removing ICT Inventory Agent..."

    case "${OS_TYPE}" in
        Linux)
            if command -v systemctl &>/dev/null; then
                systemctl stop "${SYSTEMD_SERVICE}" 2>/dev/null || true
                systemctl disable "${SYSTEMD_SERVICE}" 2>/dev/null || true
                rm -f "/etc/systemd/system/${SYSTEMD_SERVICE}"
                systemctl daemon-reload
                info "Systemd service removed."
            fi
            # Also clean cron just in case
            (crontab -l 2>/dev/null || true) | grep -v "${CRON_MARKER}" | crontab - 2>/dev/null || true
            ;;
        Darwin)
            launchctl unload "${PLIST_PATH}" 2>/dev/null || true
            rm -f "${PLIST_PATH}"
            info "launchd daemon removed."
            ;;
    esac

    rm -rf "${INSTALL_DIR}"
    info "Agent files removed from ${INSTALL_DIR}."
    info "Uninstallation complete."
}

# ─── Main ────────────────────────────────────────────────────────────────────

case "${1:-}" in
    --remove|--uninstall)
        do_remove
        ;;
    *)
        do_install
        ;;
esac
