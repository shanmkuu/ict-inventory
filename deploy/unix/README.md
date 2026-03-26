# ICT Inventory Agent — Unix Deployment

Cross-platform Bash agent that collects system inventory data and sends it to the ICT Inventory backend. Compatible with **Linux** and **macOS**.

## Files

| File | Purpose |
|---|---|
| `ict_agent.sh` | Main agent script |
| `config.json` | Server URL, API key, and interval settings |
| `install.sh` | Automated installer (systemd / launchd / cron) |

## Quick Start
.
### 1. Configure

Edit `config.json` and set your server URL:

```json
{
    "api_urls": ["http://YOUR_SERVER_IP:8000/api/v1/heartbeat"],
    "api_key": "YOUR_API_KEY_HERE",
    "interval_seconds": 300
}
```

### 2. Test (optional)

Run a dry-run to see what data will be collected:

```bash
chmod +x ict_agent.sh
./ict_agent.sh --test
```

### 3. Install

Install as a background service (requires root):

```bash
sudo bash install.sh
```

This will:
- Copy files to `/opt/ict-agent/`
- **Linux (systemd):** Create and enable `ict-agent.service`
- **Linux (no systemd):** Add a `@reboot` cron job
- **macOS:** Install a `launchd` daemon

### 4. Verify

Check that the device appears in your ICT Inventory dashboard within a few minutes.

**Linux (systemd):**
```bash
sudo systemctl status ict-agent.service
sudo journalctl -u ict-agent.service -f
```

**macOS:**
```bash
sudo launchctl list | grep ict
tail -f /opt/ict-agent/agent.log
```

## Manual Run Modes

```bash
# Run once and exit
./ict_agent.sh --once

# Run in continuous loop (foreground)
./ict_agent.sh

# Test / dry-run (print JSON, don't send)
./ict_agent.sh --test
```

## Uninstall

```bash
sudo bash install.sh --remove
```

## Requirements

- **Bash** 4+
- **curl** (pre-installed on most systems; `wget` used as fallback)
- Standard Unix utilities (`uname`, `awk`, `sed`, `grep`, `df`, `who`)
- Root access recommended for hardware serial/UUID collection

## Notes

- The agent collects **only** basic system inventory data (hostname, IP, OS, CPU, RAM, disk, user). No personal files or sensitive data are accessed.
- The JSON payload matches the same schema as the Windows agent, so both can report to the same backend.
- On macOS, `system_profiler` calls may take 1–2 seconds. This is normal.
