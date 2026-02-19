# Remote Access & Cross-Department Setup

This guide explains how to enable connectivity for devices that are not on the same local network as your server. This includes:
-   **Departments on different subnets** (e.g., Finance, HR).
-   **Branch offices** connected via internet.
-   **Remote employees** working from home.

## Prerequisites
- A Cloudflare account (Free tier is sufficient).
- A domain name added to your Cloudflare account.
- Administrator access to the server.

## Step 1: Set up Cloudflare Tunnel (Server Side)

We have provided a script to automate this process.

3.  Run the setup script by double-clicking:
    **`deploy\run_setup.bat`**
    
    *(This batch file ensures the script runs with Administrator privileges and bypasses restrictive execution policies)*
4.  Follow the interactive prompts:
    -   It will open a browser for you to login to Cloudflare.
    -   Select the domain you want to use.
    -   Enter the desired hostname (e.g., `inventory.example.com`).

Once finished, the script will install a system service that keeps the tunnel running automatically.

## Step 2: Configure Agents

Update the `config.json` file on your agent devices (or the release build you distribute) to include the new public URL.

**File:** `config.json`

```json
{
    "api_urls": [
        "http://10.10.6.127:8000/api/v1/heartbeat",
        "https://inventory.example.com/api/v1/heartbeat"
    ],
    "api_key": "YOUR_API_KEY_HERE",
    "interval_seconds": 300,
    ...
}
```

The agent is smart enough to try the local URL first. If that fails (device is not on office network), it will seamlessly switch to the secure remote URL.

## Troubleshooting

-   **Tunnel Status**: Check services.msc for "Cloudflare Tunnel agent" or run `cloudflared tunnel info ict-inventory`.
-   **Agent Logs**: Check `agent.log` to see which URL the agent is successfully connecting to.
