import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Wifi, WifiOff, Activity, Clock, Radio } from 'lucide-react';

// ── Status Bar ────────────────────────────────────────────────────────────────

const ScanStatusBar = ({ darkMode, scanStatus, onScanNow, scanning }) => {
    const bg = darkMode ? '#1a2433' : '#f0f7ff';
    const border = darkMode ? '#2a3a4a' : '#bfdbfe';
    const textMuted = darkMode ? '#8899aa' : '#6b7280';

    const formatTime = (isoStr) => {
        if (!isoStr) return '—';
        const d = new Date(isoStr);
        return d.toLocaleTimeString();
    };

    return (
        <div style={{
            backgroundColor: bg,
            border: `1px solid ${border}`,
            borderRadius: '8px',
            padding: '10px 16px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
        }}>
            {/* Scan indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {scanStatus?.running ? (
                    <>
                        <Radio size={16} style={{ color: '#22c55e', animation: 'pulse 1.2s infinite' }} />
                        <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '0.85rem' }}>
                            Scanning…
                        </span>
                    </>
                ) : (
                    <>
                        <Activity size={16} style={{ color: textMuted }} />
                        <span style={{ color: textMuted, fontSize: '0.85rem' }}>Idle</span>
                    </>
                )}
            </div>

            {/* Subnets */}
            {scanStatus?.subnets?.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <Wifi size={14} style={{ color: textMuted }} />
                    {scanStatus.subnets.map(s => (
                        <span key={s} style={{
                            fontSize: '0.78rem',
                            padding: '2px 8px',
                            backgroundColor: darkMode ? '#223344' : '#dbeafe',
                            color: darkMode ? '#7dd3fc' : '#1d4ed8',
                            borderRadius: '9999px',
                            fontFamily: 'monospace',
                        }}>{s}</span>
                    ))}
                </div>
            )}

            {/* Devices found */}
            {scanStatus?.running && (
                <span style={{ fontSize: '0.82rem', color: textMuted }}>
                    {scanStatus.devices_found} device{scanStatus.devices_found !== 1 ? 's' : ''} found
                </span>
            )}

            {/* Last scan */}
            {scanStatus?.finished_at && !scanStatus?.running && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} style={{ color: textMuted }} />
                    <span style={{ fontSize: '0.82rem', color: textMuted }}>
                        Last scan: {formatTime(scanStatus.finished_at)}
                    </span>
                </div>
            )}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Scan Now button */}
            <button
                onClick={onScanNow}
                disabled={scanning || scanStatus?.running}
                style={{
                    padding: '6px 14px',
                    backgroundColor: (scanning || scanStatus?.running) ? (darkMode ? '#334' : '#d1d5db') : '#22c55e',
                    color: (scanning || scanStatus?.running) ? textMuted : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: (scanning || scanStatus?.running) ? 'not-allowed' : 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background-color 0.2s',
                }}
            >
                <RefreshCw size={13} style={{ animation: (scanning || scanStatus?.running) ? 'spin 1s linear infinite' : 'none' }} />
                {scanStatus?.running ? 'Scanning…' : 'Scan Now'}
            </button>
        </div>
    );
};

// ── Type Badge ────────────────────────────────────────────────────────────────

const TYPE_COLORS = {
    router: { bg: '#fef3c7', text: '#92400e' },
    switch: { bg: '#dbeafe', text: '#1e40af' },
    printer: { bg: '#fce7f3', text: '#9d174d' },
    camera: { bg: '#f3e8ff', text: '#6b21a8' },
    smart_tv: { bg: '#d1fae5', text: '#065f46' },
    projector: { bg: '#ffedd5', text: '#9a3412' },
    network_appliance: { bg: '#e0f2fe', text: '#075985' },
    media_player: { bg: '#fef9c3', text: '#713f12' },
    unknown: { bg: '#f3f4f6', text: '#374151' },
};

const TypeBadge = ({ type, darkMode }) => {
    const c = TYPE_COLORS[type] || TYPE_COLORS.unknown;
    return (
        <span style={{
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : c.bg,
            color: darkMode ? '#aac' : c.text,
            whiteSpace: 'nowrap',
        }}>
            {type?.replace(/_/g, ' ') || 'unknown'}
        </span>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────

const NetworkDevices = ({ darkMode }) => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [scanStatus, setScanStatus] = useState(null);

    const fetchDevices = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/network/devices');
            if (!res.ok) throw new Error('Failed to fetch network devices');
            const data = await res.json();
            setDevices(data);
            setError(null);
        } catch (err) {
            setError(`Cannot connect to inventory server: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchScanStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/network/scan-status');
            if (res.ok) {
                const data = await res.json();
                setScanStatus(data);
            }
        } catch (_) { }
    }, []);

    // Initial load
    useEffect(() => {
        fetchDevices();
        fetchScanStatus();
    }, [fetchDevices, fetchScanStatus]);

    // Poll scan status every 3 s
    useEffect(() => {
        const id = setInterval(fetchScanStatus, 3000);
        return () => clearInterval(id);
    }, [fetchScanStatus]);

    // Poll devices: every 5 s while scanning, every 30 s otherwise
    useEffect(() => {
        const interval = scanStatus?.running ? 5000 : 30000;
        const id = setInterval(fetchDevices, interval);
        return () => clearInterval(id);
    }, [fetchDevices, scanStatus?.running]);

    const handleScanNow = async () => {
        setScanning(true);
        try {
            const res = await fetch('/api/v1/network/scan', { method: 'POST' });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.detail || 'Failed to start scan');
            }
            // Immediately refresh status
            await fetchScanStatus();
        } catch (err) {
            setError(`Scan failed: ${err.message}`);
        } finally {
            setScanning(false);
        }
    };

    if (selectedDevice) {
        return (
            <DeviceDetails
                device={selectedDevice}
                onBack={() => setSelectedDevice(null)}
                darkMode={darkMode}
            />
        );
    }

    return (
        <div style={{ color: darkMode ? '#e0e0e0' : '#333' }}>
            {/* Pulse / spin keyframes injected once */}
            <style>{`
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
                @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
            `}</style>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Network Devices</h2>
                <button
                    onClick={fetchDevices}
                    title="Refresh device list"
                    style={{
                        padding: '6px 10px',
                        backgroundColor: darkMode ? '#333' : '#eee',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: darkMode ? '#fff' : '#333',
                    }}
                >
                    <RefreshCw size={15} />
                </button>
            </div>

            {/* Status bar with Scan Now button */}
            <ScanStatusBar
                darkMode={darkMode}
                scanStatus={scanStatus}
                onScanNow={handleScanNow}
                scanning={scanning}
            />

            {/* Error */}
            {error && (
                <div style={{
                    padding: '10px 16px', marginBottom: '1rem', borderRadius: '6px',
                    backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '0.88rem',
                }}>{error}</div>
            )}

            {/* Device table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>Loading…</div>
            ) : (
                <div style={{
                    backgroundColor: darkMode ? '#1e1e1e' : 'white',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    overflow: 'hidden',
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{
                            backgroundColor: darkMode ? '#2c2c2c' : '#f5f5f5',
                            borderBottom: `2px solid ${darkMode ? '#444' : '#e0e0e0'}`,
                        }}>
                            <tr>
                                <th style={{ padding: '0.85rem 1rem' }}>Name / IP</th>
                                <th style={{ padding: '0.85rem 1rem' }}>Type</th>
                                <th style={{ padding: '0.85rem 1rem' }}>MAC</th>
                                <th style={{ padding: '0.85rem 1rem' }}>Open Ports</th>
                                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {devices.map(device => {
                                // Primary: use system_status from DB (set by the scanner).
                                // Fallback: time-based check if system_status is missing.
                                const isOnline = device.system_status
                                    ? device.system_status === 'online'
                                    : (() => {
                                        const ms = device.last_seen
                                            ? new Date(device.last_seen.endsWith('Z') ? device.last_seen : device.last_seen + 'Z').getTime()
                                            : 0;
                                        return ms > 0 && (Date.now() - ms) < 900000; // 15-min fallback
                                    })();
                                return (
                                    <tr
                                        key={device.id}
                                        onClick={() => setSelectedDevice(device)}
                                        style={{
                                            borderBottom: `1px solid ${darkMode ? '#333' : '#eee'}`,
                                            cursor: 'pointer',
                                            transition: 'background-color 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = darkMode ? '#252525' : '#f9f9f9'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <td style={{ padding: '0.85rem 1rem' }}>
                                            <div style={{ fontWeight: 600 }}>{device.hostname || device.ip_address}</div>
                                            {device.hostname && (
                                                <div style={{ fontSize: '0.78rem', color: '#888' }}>{device.ip_address}</div>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem' }}>
                                            <TypeBadge type={device.device_type} darkMode={darkMode} />
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                                            {device.mac_address || '—'}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', color: '#888', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {device.open_ports || '—'}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {isOnline
                                                    ? <Wifi size={13} style={{ color: '#22c55e' }} />
                                                    : <WifiOff size={13} style={{ color: '#9ca3af' }} />
                                                }
                                                <span style={{ color: isOnline ? '#22c55e' : '#9ca3af', fontWeight: 600, fontSize: '0.82rem' }}>
                                                    {isOnline ? 'Online' : 'Offline'}
                                                </span>
                                            </div>
                                            {!isOnline && device.last_seen && (
                                                <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '2px' }}>
                                                    Last seen: {new Date(device.last_seen.endsWith('Z') ? device.last_seen : device.last_seen + 'Z').toLocaleString()}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {devices.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                                        No network devices found yet. A scan will start automatically, or click <strong>Scan Now</strong>.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// ── Device Details ────────────────────────────────────────────────────────────

const DeviceDetails = ({ device, onBack, darkMode }) => {
    let openPorts = [];
    let snmpData = {};
    try { openPorts = JSON.parse(device.open_ports); } catch (e) { }
    try { snmpData = JSON.parse(device.raw_snmp_data); } catch (e) { }

    const isOnline = device.system_status
        ? device.system_status === 'online'
        : (() => {
            const ms = device.last_seen
                ? new Date(device.last_seen.endsWith('Z') ? device.last_seen : device.last_seen + 'Z').getTime()
                : 0;
            return ms > 0 && (Date.now() - ms) < 900000;
        })();

    return (
        <div style={{ color: darkMode ? '#e0e0e0' : '#333' }}>
            <div style={{ marginBottom: '1rem' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', fontWeight: 'bold' }}>
                    ← Back to List
                </button>
            </div>
            <div style={{ padding: '1.5rem', backgroundColor: darkMode ? '#1e1e1e' : 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h2 style={{ marginTop: 0 }}>{device.hostname || device.ip_address}</h2>
                <div style={{ color: '#888', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    {device.device_type?.replace(/_/g, ' ')} • {device.ip_address} • {device.mac_address || 'MAC unknown'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div>
                        <h3 style={{ borderBottom: `1px solid ${darkMode ? '#444' : '#e5e7eb'}`, paddingBottom: '0.5rem' }}>Basic Info</h3>
                        <p><strong>Vendor:</strong> {device.vendor || '—'}</p>
                        <p><strong>Model:</strong> {device.model || '—'}</p>
                        <p><strong>Serial:</strong> {device.serial_number || '—'}</p>
                        <p><strong>Uptime:</strong> {device.uptime || snmpData.uptime || '—'}</p>
                        <p><strong>Firmware:</strong> {device.firmware_version || '—'}</p>
                    </div>
                    <div>
                        <h3 style={{ borderBottom: `1px solid ${darkMode ? '#444' : '#e5e7eb'}`, paddingBottom: '0.5rem' }}>Network</h3>
                        <p><strong>DNS Name:</strong> {device.dns_name || '—'}</p>
                        <p>
                            <strong>Status:</strong>{' '}
                            <span style={{ color: isOnline ? '#22c55e' : '#9ca3af', fontWeight: 600 }}>
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        </p>
                        <p><strong>Last Seen:</strong> {device.last_seen ? new Date(device.last_seen.endsWith('Z') ? device.last_seen : device.last_seen + 'Z').toLocaleString() : '—'}</p>
                        <div>
                            <strong>Open Ports:</strong>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                                {openPorts.length > 0
                                    ? openPorts.map(p => (
                                        <span key={p} style={{ padding: '2px 8px', backgroundColor: '#22c55e', color: 'white', borderRadius: '4px', fontSize: '0.78rem' }}>
                                            {p}
                                        </span>
                                    ))
                                    : <span style={{ color: '#888', fontSize: '0.85rem' }}>None detected</span>
                                }
                            </div>
                        </div>
                    </div>
                </div>

                <h3 style={{ borderBottom: `1px solid ${darkMode ? '#444' : '#e5e7eb'}`, paddingBottom: '0.5rem', marginTop: '2rem' }}>Raw SNMP Data</h3>
                <pre style={{
                    backgroundColor: darkMode ? '#111' : '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflowX: 'auto',
                    fontSize: '0.78rem',
                    margin: 0,
                }}>
                    {JSON.stringify(snmpData, null, 2)}
                </pre>
            </div>
        </div>
    );
};

export default NetworkDevices;
