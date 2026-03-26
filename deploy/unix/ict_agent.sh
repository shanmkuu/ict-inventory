#!/usr/bin/env bash
# =============================================================================
# ICT Inventory Agent — Unix Edition (Linux & macOS)
# =============================================================================
#
# Collects system information (hostname, IP, MAC, OS, CPU, GPU, RAM, disk,
# serial number, etc.) and sends it as a JSON heartbeat to a central server.
#
# Compatible with: Linux (Debian/Ubuntu/RHEL/Arch) and macOS (10.15+).
# Dependencies: bash 4+, curl, standard Unix utilities.
#
# Usage:
#   ./ict_agent.sh              # Run agent (loops at configured interval)
#   ./ict_agent.sh --once       # Send a single heartbeat and exit
#   ./ict_agent.sh --test       # Collect info and print JSON (no send)
# =============================================================================

set -euo pipefail

# ─── Globals ─────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.json"
OS_TYPE="$(uname -s)"   # "Linux" or "Darwin"
LOG_FILE=""
LOG_LEVEL="INFO"
CURL_BIN=""

# ─── Logging ─────────────────────────────────────────────────────────────────

log() {
    local level="$1"; shift
    local timestamp
    timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    local msg="${timestamp} - ${level} - $*"

    # Only log DEBUG if log level is DEBUG
    if [[ "${level}" == "DEBUG" && "${LOG_LEVEL}" != "DEBUG" ]]; then
        return
    fi

    if [[ -n "${LOG_FILE}" ]]; then
        echo "${msg}" >> "${LOG_FILE}" 2>/dev/null || true
    fi
    # Also print to stderr so it doesn't pollute function return values
    echo "${msg}" >&2
}

log_info()    { log "INFO"    "$@"; }
log_warning() { log "WARNING" "$@"; }
log_error()   { log "ERROR"   "$@"; }
log_debug()   { log "DEBUG"   "$@"; }

# ─── Config Parsing ─────────────────────────────────────────────────────────
# Lightweight JSON parser using grep/sed — no jq dependency required.
# Handles simple flat keys and the "api_urls" array.

json_get_string() {
    # Extract a simple string value from JSON: "key": "value"
    local file="$1" key="$2"
    grep -o "\"${key}\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$file" 2>/dev/null \
        | head -1 \
        | sed "s/\"${key}\"[[:space:]]*:[[:space:]]*\"//" \
        | sed 's/"$//'
}

json_get_number() {
    # Extract a simple numeric value from JSON: "key": 123
    local file="$1" key="$2"
    grep -o "\"${key}\"[[:space:]]*:[[:space:]]*[0-9]*" "$file" 2>/dev/null \
        | head -1 \
        | sed "s/\"${key}\"[[:space:]]*:[[:space:]]*//"
}

json_get_array_strings() {
    # Extract a simple array of strings: "key": ["a", "b"]
    # Returns one URL per line
    local file="$1" key="$2"
    # Get everything between [ and ] for this key
    sed -n "/\"${key}\"/,/]/p" "$file" 2>/dev/null \
        | grep -o '"http[^"]*"' \
        | sed 's/"//g'
}

load_config() {
    if [[ ! -f "${CONFIG_FILE}" ]]; then
        echo "ERROR: Config file not found at ${CONFIG_FILE}" >&2
        exit 1
    fi

    LOG_LEVEL="$(json_get_string "${CONFIG_FILE}" "log_level")"
    LOG_LEVEL="${LOG_LEVEL:-INFO}"

    local log_file_name
    log_file_name="$(json_get_string "${CONFIG_FILE}" "log_file")"
    log_file_name="${log_file_name:-agent.log}"
    LOG_FILE="${SCRIPT_DIR}/${log_file_name}"

    INTERVAL_SECONDS="$(json_get_number "${CONFIG_FILE}" "interval_seconds")"
    INTERVAL_SECONDS="${INTERVAL_SECONDS:-300}"

    API_KEY="$(json_get_string "${CONFIG_FILE}" "api_key")"
    API_KEY="${API_KEY:-}"

    # Collect API URLs (supports both "api_url" single and "api_urls" array)
    API_URLS=()
    local single_url
    single_url="$(json_get_string "${CONFIG_FILE}" "api_url")"
    if [[ -n "${single_url}" ]]; then
        API_URLS+=("${single_url}")
    fi

    while IFS= read -r url; do
        if [[ -n "${url}" ]]; then
            # Avoid duplicates
            local dup=false
            for existing in "${API_URLS[@]+"${API_URLS[@]}"}"; do
                if [[ "${existing}" == "${url}" ]]; then dup=true; break; fi
            done
            if [[ "${dup}" == false ]]; then
                API_URLS+=("${url}")
            fi
        fi
    done < <(json_get_array_strings "${CONFIG_FILE}" "api_urls")

    if [[ ${#API_URLS[@]} -eq 0 ]]; then
        log_error "No API URLs configured! Set 'api_urls' or 'api_url' in config.json."
        exit 1
    fi
}

# ─── HTTP Client Detection ──────────────────────────────────────────────────

detect_http_client() {
    if command -v curl &>/dev/null; then
        CURL_BIN="curl"
    elif command -v wget &>/dev/null; then
        CURL_BIN="wget"
    else
        log_error "Neither curl nor wget found. Cannot send heartbeat."
        exit 1
    fi
}

# ─── Data Collection Functions ───────────────────────────────────────────────
# Each function prints a single value to stdout.

get_hostname() {
    hostname 2>/dev/null || echo "Unknown"
}

get_ip_address() {
    case "${OS_TYPE}" in
        Linux)
            # Try ip route first (most reliable on modern Linux)
            if command -v ip &>/dev/null; then
                ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' | head -1
            elif command -v hostname &>/dev/null; then
                hostname -I 2>/dev/null | awk '{print $1}'
            else
                echo "Unknown"
            fi
            ;;
        Darwin)
            # Try en0 (Wi-Fi) then en1 (Ethernet) on macOS
            local ip
            ip="$(ipconfig getifaddr en0 2>/dev/null || true)"
            if [[ -z "${ip}" ]]; then
                ip="$(ipconfig getifaddr en1 2>/dev/null || true)"
            fi
            if [[ -z "${ip}" ]]; then
                # Fallback: route-based
                ip="$(route get default 2>/dev/null | awk '/interface:/{print $2}' | head -1)"
                if [[ -n "${ip}" ]]; then
                    ip="$(ipconfig getifaddr "${ip}" 2>/dev/null || true)"
                fi
            fi
            echo "${ip:-Unknown}"
            ;;
        *)
            echo "Unknown"
            ;;
    esac
}

get_mac_address() {
    local mac=""

    case "${OS_TYPE}" in
        Linux)
            # Try ip link for the first non-loopback, non-virtual interface
            if command -v ip &>/dev/null; then
                mac="$(ip link show 2>/dev/null \
                    | awk '/^[0-9]+:/{iface=$2} /link\/ether/{print iface, $2}' \
                    | grep -v -iE 'lo:|docker|veth|br-|virbr|vmnet|vbox|tailscale|zerotier|wg' \
                    | head -1 \
                    | awk '{print toupper($2)}')"
            fi
            # Fallback: /sys/class/net
            if [[ -z "${mac}" ]]; then
                for dev in /sys/class/net/*; do
                    local devname
                    devname="$(basename "$dev")"
                    [[ "${devname}" == "lo" ]] && continue
                    [[ "${devname}" =~ ^(docker|veth|br-|virbr|vmnet|vbox) ]] && continue
                    if [[ -f "${dev}/address" ]]; then
                        local addr
                        addr="$(cat "${dev}/address" 2>/dev/null)"
                        if [[ -n "${addr}" && "${addr}" != "00:00:00:00:00:00" ]]; then
                            mac="$(echo "${addr}" | tr '[:lower:]' '[:upper:]')"
                            break
                        fi
                    fi
                done
            fi
            ;;
        Darwin)
            # macOS: use ifconfig on the primary interface
            local iface
            iface="$(route get default 2>/dev/null | awk '/interface:/{print $2}' | head -1)"
            iface="${iface:-en0}"
            mac="$(ifconfig "${iface}" 2>/dev/null | awk '/ether/{print toupper($2)}')"
            ;;
    esac

    # Convert colon-separated to dash-separated (matches Windows agent format)
    mac="${mac//:/-}"
    echo "${mac:-Unknown}"
}

get_os_name() {
    case "${OS_TYPE}" in
        Linux)  echo "Linux" ;;
        Darwin) echo "macOS" ;;
        *)      echo "${OS_TYPE}" ;;
    esac
}

get_os_version() {
    case "${OS_TYPE}" in
        Linux)
            if [[ -f /etc/os-release ]]; then
                # e.g. "Ubuntu 22.04.3 LTS"
                (source /etc/os-release 2>/dev/null && echo "${PRETTY_NAME:-${NAME} ${VERSION_ID}}") || echo "Unknown"
            else
                uname -r
            fi
            ;;
        Darwin)
            sw_vers -productVersion 2>/dev/null || echo "Unknown"
            ;;
        *)
            echo "Unknown"
            ;;
    esac
}

get_os_release() {
    uname -r 2>/dev/null || echo "Unknown"
}

get_architecture() {
    uname -m 2>/dev/null || echo "Unknown"
}

get_system_type() {
    # Determine Laptop vs Desktop by checking for a battery
    case "${OS_TYPE}" in
        Linux)
            if [[ -d /sys/class/power_supply ]]; then
                for ps in /sys/class/power_supply/BAT*; do
                    if [[ -e "${ps}" ]]; then
                        echo "Laptop"
                        return
                    fi
                done
            fi
            echo "Desktop"
            ;;
        Darwin)
            if pmset -g batt 2>/dev/null | grep -q "Battery"; then
                echo "Laptop"
            else
                echo "Desktop"
            fi
            ;;
        *)
            echo "Unknown"
            ;;
    esac
}

get_cpu_model() {
    case "${OS_TYPE}" in
        Linux)
            grep -m1 'model name' /proc/cpuinfo 2>/dev/null \
                | sed 's/model name[[:space:]]*:[[:space:]]*//' \
                || echo "Unknown"
            ;;
        Darwin)
            sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "Unknown"
            ;;
        *)
            echo "Unknown"
            ;;
    esac
}

get_cpu_cores_physical() {
    case "${OS_TYPE}" in
        Linux)
            grep -c '^processor' /proc/cpuinfo 2>/dev/null \
                | xargs -I{} sh -c 'echo $(grep "^core id" /proc/cpuinfo 2>/dev/null | sort -u | wc -l)' 2>/dev/null
            # Better approach: use lscpu
            if command -v lscpu &>/dev/null; then
                lscpu 2>/dev/null | awk -F: '/^Core\(s\) per socket/{c=$2} /^Socket\(s\)/{s=$2} END{printf "%d", c*s}'
            else
                grep "^cpu cores" /proc/cpuinfo 2>/dev/null | head -1 | awk '{print $NF}'
            fi
            ;;
        Darwin)
            sysctl -n hw.physicalcpu 2>/dev/null || echo "0"
            ;;
        *)
            echo "0"
            ;;
    esac
}

get_cpu_cores_logical() {
    case "${OS_TYPE}" in
        Linux)
            nproc 2>/dev/null || grep -c '^processor' /proc/cpuinfo 2>/dev/null || echo "0"
            ;;
        Darwin)
            sysctl -n hw.logicalcpu 2>/dev/null || echo "0"
            ;;
        *)
            echo "0"
            ;;
    esac
}

get_gpu_info() {
    case "${OS_TYPE}" in
        Linux)
            if command -v lspci &>/dev/null; then
                local gpu
                gpu="$(lspci 2>/dev/null | grep -iE 'vga|3d|display' | sed 's/.*: //' | head -3 | paste -sd ', ')"
                echo "${gpu:-Unknown}"
            else
                echo "Unknown"
            fi
            ;;
        Darwin)
            local gpu
            gpu="$(system_profiler SPDisplaysDataType 2>/dev/null \
                | awk -F': ' '/Chipset Model/{print $2}' \
                | paste -sd ', ')"
            echo "${gpu:-Unknown}"
            ;;
        *)
            echo "Unknown"
            ;;
    esac
}

get_ram_total_gb() {
    case "${OS_TYPE}" in
        Linux)
            local kb
            kb="$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}')"
            if [[ -n "${kb}" ]]; then
                awk "BEGIN {printf \"%.2f\", ${kb} / 1048576}"
            else
                echo "0"
            fi
            ;;
        Darwin)
            local bytes
            bytes="$(sysctl -n hw.memsize 2>/dev/null)"
            if [[ -n "${bytes}" ]]; then
                awk "BEGIN {printf \"%.2f\", ${bytes} / 1073741824}"
            else
                echo "0"
            fi
            ;;
        *)
            echo "0"
            ;;
    esac
}

get_disk_total_gb() {
    case "${OS_TYPE}" in
        Linux)
            # Use lsblk to sum physical disk sizes (like the Windows agent does)
            if command -v lsblk &>/dev/null; then
                local bytes
                bytes="$(lsblk -bdno SIZE,TYPE 2>/dev/null \
                    | awk '$2=="disk"{sum+=$1} END{print sum}')"
                if [[ -n "${bytes}" && "${bytes}" != "0" ]]; then
                    awk "BEGIN {printf \"%.2f\", ${bytes} / 1073741824}"
                    return
                fi
            fi
            # Fallback: df on root
            df -B1 / 2>/dev/null | awk 'NR==2{printf "%.2f", $2/1073741824}'
            ;;
        Darwin)
            # Use diskutil on the main physical disk
            local bytes
            bytes="$(diskutil info disk0 2>/dev/null | awk -F'[:(]' '/Disk Size/{gsub(/[^0-9]/,"",$3); print $3}' | head -1)"
            if [[ -n "${bytes}" && "${bytes}" != "0" ]]; then
                awk "BEGIN {printf \"%.2f\", ${bytes} / 1073741824}"
            else
                # Fallback: df on root
                df -g / 2>/dev/null | awk 'NR==2{print $2}'
            fi
            ;;
        *)
            echo "0"
            ;;
    esac
}

get_boot_time() {
    case "${OS_TYPE}" in
        Linux)
            if command -v uptime &>/dev/null && uptime -s &>/dev/null; then
                uptime -s 2>/dev/null
            elif [[ -f /proc/stat ]]; then
                local btime
                btime="$(awk '/^btime/{print $2}' /proc/stat 2>/dev/null)"
                if [[ -n "${btime}" ]]; then
                    date -d "@${btime}" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "Unknown"
                else
                    echo "Unknown"
                fi
            else
                echo "Unknown"
            fi
            ;;
        Darwin)
            local raw
            raw="$(sysctl -n kern.boottime 2>/dev/null)"
            # Format: { sec = 1711000000, usec = 0 }
            local epoch
            epoch="$(echo "${raw}" | sed 's/.*sec = //' | sed 's/,.*//')"
            if [[ -n "${epoch}" ]]; then
                date -r "${epoch}" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "Unknown"
            else
                echo "Unknown"
            fi
            ;;
        *)
            echo "Unknown"
            ;;
    esac
}

get_current_user() {
    # Try multiple methods to find the logged-in console user
    local user=""

    if command -v logname &>/dev/null; then
        user="$(logname 2>/dev/null || true)"
    fi

    if [[ -z "${user}" || "${user}" == "root" ]]; then
        # Get the first interactive (console/tty) user
        user="$(who 2>/dev/null | awk 'NR==1{print $1}')"
    fi

    if [[ -z "${user}" ]]; then
        user="${USER:-${LOGNAME:-Unknown}}"
    fi

    echo "${user}"
}

get_device_id() {
    # Machine UUID — unique hardware identifier
    case "${OS_TYPE}" in
        Linux)
            # Try /sys DMI UUID (requires root)
            if [[ -r /sys/class/dmi/id/product_uuid ]]; then
                cat /sys/class/dmi/id/product_uuid 2>/dev/null
                return
            fi
            # Try dmidecode (requires root)
            if command -v dmidecode &>/dev/null; then
                local uuid
                uuid="$(sudo dmidecode -s system-uuid 2>/dev/null || true)"
                if [[ -n "${uuid}" ]]; then
                    echo "${uuid}"
                    return
                fi
            fi
            # Fallback: machine-id (persistent but not a hardware UUID)
            if [[ -f /etc/machine-id ]]; then
                cat /etc/machine-id 2>/dev/null
                return
            fi
            echo "Unknown"
            ;;
        Darwin)
            # IOPlatformUUID
            ioreg -rd1 -c IOPlatformExpertDevice 2>/dev/null \
                | awk -F'"' '/IOPlatformUUID/{print $4}' \
                | head -1 \
                || echo "Unknown"
            ;;
        *)
            echo "Unknown"
            ;;
    esac
}

get_serial_number() {
    case "${OS_TYPE}" in
        Linux)
            # DMI serial (requires root)
            if [[ -r /sys/class/dmi/id/product_serial ]]; then
                local sn
                sn="$(cat /sys/class/dmi/id/product_serial 2>/dev/null)"
                if [[ -n "${sn}" && "${sn}" != "None" && "${sn}" != "To Be Filled By O.E.M." ]]; then
                    echo "${sn}"
                    return
                fi
            fi
            if command -v dmidecode &>/dev/null; then
                local sn
                sn="$(sudo dmidecode -s system-serial-number 2>/dev/null || true)"
                if [[ -n "${sn}" && "${sn}" != "None" && "${sn}" != "To Be Filled By O.E.M." ]]; then
                    echo "${sn}"
                    return
                fi
            fi
            echo "Unknown"
            ;;
        Darwin)
            # ioreg or system_profiler
            local sn
            sn="$(ioreg -l 2>/dev/null | awk -F'"' '/IOPlatformSerialNumber/{print $4}' | head -1)"
            if [[ -z "${sn}" ]]; then
                sn="$(system_profiler SPHardwareDataType 2>/dev/null \
                    | awk -F': ' '/Serial Number/{print $2}' | head -1)"
            fi
            echo "${sn:-Unknown}"
            ;;
        *)
            echo "Unknown"
            ;;
    esac
}

# ─── JSON Payload Builder ───────────────────────────────────────────────────

escape_json() {
    # Escape special characters for JSON string values
    local s="$1"
    s="${s//\\/\\\\}"    # backslash
    s="${s//\"/\\\"}"    # double quote
    s="${s//$'\n'/\\n}"  # newline
    s="${s//$'\r'/}"     # carriage return
    s="${s//$'\t'/\\t}"  # tab
    echo -n "${s}"
}

build_json_payload() {
    log_info "Collecting system information..."

    local hostname ip_address mac_address os_name os_version os_release
    local architecture system_type cpu_model cpu_cores_physical cpu_cores_logical
    local gpu_model ram_total_gb disk_total_gb boot_time current_user
    local device_id serial_number

    hostname="$(escape_json "$(get_hostname)")"
    ip_address="$(escape_json "$(get_ip_address)")"
    mac_address="$(escape_json "$(get_mac_address)")"
    os_name="$(escape_json "$(get_os_name)")"
    os_version="$(escape_json "$(get_os_version)")"
    os_release="$(escape_json "$(get_os_release)")"
    architecture="$(escape_json "$(get_architecture)")"
    system_type="$(escape_json "$(get_system_type)")"
    cpu_model="$(escape_json "$(get_cpu_model)")"
    cpu_cores_physical="$(get_cpu_cores_physical)"
    cpu_cores_logical="$(get_cpu_cores_logical)"
    gpu_model="$(escape_json "$(get_gpu_info)")"
    ram_total_gb="$(get_ram_total_gb)"
    disk_total_gb="$(get_disk_total_gb)"
    boot_time="$(escape_json "$(get_boot_time)")"
    current_user="$(escape_json "$(get_current_user)")"
    device_id="$(escape_json "$(get_device_id)")"
    serial_number="$(escape_json "$(get_serial_number)")"

    # Ensure numeric fields have sane defaults
    cpu_cores_physical="${cpu_cores_physical:-0}"
    cpu_cores_logical="${cpu_cores_logical:-0}"
    ram_total_gb="${ram_total_gb:-0}"
    disk_total_gb="${disk_total_gb:-0}"

    cat <<EOF
{
  "device_id": "${device_id}",
  "hostname": "${hostname}",
  "ip_address": "${ip_address}",
  "mac_address": "${mac_address}",
  "os_name": "${os_name}",
  "os_version": "${os_version}",
  "os_release": "${os_release}",
  "architecture": "${architecture}",
  "system_type": "${system_type}",
  "cpu_model": "${cpu_model}",
  "gpu_model": "${gpu_model}",
  "cpu_cores_logical": ${cpu_cores_logical},
  "cpu_cores_physical": ${cpu_cores_physical},
  "ram_total_gb": ${ram_total_gb},
  "disk_total_gb": ${disk_total_gb},
  "boot_time": "${boot_time}",
  "current_user": "${current_user}",
  "serial_number": "${serial_number}"
}
EOF
}

# ─── Heartbeat Sender ───────────────────────────────────────────────────────

send_heartbeat() {
    local payload
    payload="$(build_json_payload)"

    local success=false

    for url in "${API_URLS[@]}"; do
        log_info "Sending heartbeat to ${url}..."

        local http_code=""
        if [[ "${CURL_BIN}" == "curl" ]]; then
            http_code="$(curl -s -o /dev/null -w "%{http_code}" \
                --connect-timeout 10 \
                --max-time 15 \
                -X POST \
                -H "Content-Type: application/json" \
                -H "x-api-key: ${API_KEY}" \
                -d "${payload}" \
                "${url}" 2>/dev/null || echo "000")"
        elif [[ "${CURL_BIN}" == "wget" ]]; then
            local tmpfile
            tmpfile="$(mktemp)"
            if wget -q --timeout=10 \
                --header="Content-Type: application/json" \
                --header="x-api-key: ${API_KEY}" \
                --post-data="${payload}" \
                -O "${tmpfile}" \
                "${url}" 2>/dev/null; then
                http_code="200"
            else
                http_code="000"
            fi
            rm -f "${tmpfile}"
        fi

        if [[ "${http_code}" == "200" ]]; then
            log_info "Heartbeat sent successfully to ${url}. Status: ${http_code}"
            success=true
            break   # Stop on first success (mirrors Python agent behavior)
        else
            log_error "Failed to send heartbeat to ${url}. Status: ${http_code}"
        fi
    done

    if [[ "${success}" == false ]]; then
        log_error "Failed to send heartbeat to ALL configured URLs."
    fi
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
    local mode="${1:-}"

    load_config
    detect_http_client

    log_info "Starting ICT Inventory Endpoint Agent (Unix)..."
    log_info "OS detected: ${OS_TYPE}"
    log_info "Agent configured. Reporting to [${API_URLS[*]}] every ${INTERVAL_SECONDS} seconds."

    case "${mode}" in
        --test)
            # Print payload only — useful for debugging
            echo "=== System Information (JSON) ==="
            build_json_payload
            echo "================================="
            ;;
        --once)
            # Send one heartbeat and exit
            send_heartbeat
            ;;
        *)
            # Main loop
            while true; do
                send_heartbeat
                sleep "${INTERVAL_SECONDS}"
            done
            ;;
    esac
}

main "$@"
