# setup_tunnel.ps1 - Automate Cloudflare Tunnel Setup for ICT Inventory

$ErrorActionPreference = "Stop"

function Pause-Script {
    Read-Host -Prompt "Press Enter to exit"
}

# 0. Admin Check
Write-Host "Checking permissions..." -ForegroundColor Cyan
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script requires Administrator privileges to install software and services."
    Write-Host "Please right-click the script and select 'Run with PowerShell', or run 'Start-Process powershell -Verb RunAs' to open an admin terminal." -ForegroundColor Yellow
    Pause-Script
    exit 1
}

try {
    $CloudflaredUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    $InstallDir = "C:\Program Files\cloudflared"
    $ExePath = "$InstallDir\cloudflared.exe"

    # 1. Check/Install cloudflared
    if (-not (Test-Path $ExePath)) {
        Write-Host "Downloading cloudflared..." -ForegroundColor Cyan
        New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
        Invoke-WebRequest -Uri $CloudflaredUrl -OutFile $ExePath
        Write-Host "Installed cloudflared to $InstallDir" -ForegroundColor Green
    }
    else {
        Write-Host "cloudflared already installed." -ForegroundColor Yellow
    }

    # Add to PATH temporarily for this session
    $env:Path += ";$InstallDir"

    # 2. Login
    Write-Host "`nStep 1: Authenticate with Cloudflare" -ForegroundColor Cyan
    Write-Host "A browser window will open. Please log in and select your domain." -ForegroundColor Yellow
    & $ExePath tunnel login

    # 3. Create Tunnel
    $TunnelName = "ict-inventory"
    Write-Host "`nStep 2: Creating tunnel '$TunnelName'..." -ForegroundColor Cyan
    try {
        & $ExePath tunnel create $TunnelName
    }
    catch {
        Write-Host "Tunnel might already exist, continuing..." -ForegroundColor Yellow
    }

    # 4. Route DNS
    $Domain = Read-Host "`nEnter the full hostname you want to use (e.g., inventory.yourcompany.com)"
    if (-not [string]::IsNullOrWhiteSpace($Domain)) {
        Write-Host "Routing $Domain to tunnel..." -ForegroundColor Cyan
        & $ExePath tunnel route dns $TunnelName $Domain
    }

    # 5. Create Config
    Write-Host "`nStep 3: Creating configuration..." -ForegroundColor Cyan
    $UserHome = $env:USERPROFILE
    $CertPath = "$UserHome\.cloudflared\cert.pem"
    # Find the credentials json file (it uses UUID as filename)
    $CredFiles = Get-ChildItem "$UserHome\.cloudflared\*.json"
    if ($CredFiles.Count -eq 0) {
        Write-Error "Could not find tunnel credentials file. Did tunnel creation succeed?"
    }
    $CredFile = $CredFiles[0].FullName

    $ConfigContent = @"
tunnel: $TunnelName
credentials-file: $CredFile

ingress:
  - hostname: $Domain
    service: http://localhost:8000
  - service: http_status:404
"@

    $ConfigPath = "$UserHome\.cloudflared\config.yml"
    Set-Content -Path $ConfigPath -Value $ConfigContent
    Write-Host "Config saved to $ConfigPath" -ForegroundColor Green

    # 6. Install Service (Requires Admin)
    Write-Host "`nStep 4: Installing System Service..." -ForegroundColor Cyan
    & $ExePath service install
    & $ExePath service start
    Write-Host "Cloudflare Tunnel service installed and started!" -ForegroundColor Green

    Write-Host "`nSETUP COMPLETE!" -ForegroundColor Green
    Write-Host "1. Your server is now accessible at https://$Domain"
    Write-Host "2. Update your agent's config.json to include this URL."

}
catch {
    Write-Host "`nAN ERROR OCCURRED:" -ForegroundColor Red
    Write-Error $_
}

Pause-Script
