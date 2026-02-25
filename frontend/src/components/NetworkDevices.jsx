import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Server, Cpu, Activity, Shield, Wifi, Globe, HardDrive, AlertCircle, CheckCircle, Smartphone } from 'lucide-react';

const NetworkDevices = ({ darkMode }) => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [scanSubnet, setScanSubnet] = useState('192.168.1.0/24');
    const [showScanModal, setShowScanModal] = useState(false);

    const fetchNetworkDevices = async () => {
        setLoading(true);
        try {
            console.log('Fetching network devices...');
            const response = await fetch('/api/v1/network/devices');
            console.log('Response status:', response.status);
            if (!response.ok) throw new Error('Failed to fetch network devices');
            const data = await response.json();
            console.log('Data received:', data);
            setDevices(data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError(`Could not connect to inventory server: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNetworkDevices();
        const interval = setInterval(fetchNetworkDevices, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const handleScan = async () => {
        setScanning(true);
        try {
            await fetch(`/api/v1/network/scan?subnet=${encodeURIComponent(scanSubnet)}`, {
                method: 'POST'
            });
            // Scan runs in background, we just close modal and wait/poll
            setShowScanModal(false);
            alert(`Scan started for ${scanSubnet}. Results will appear as they are found.`);
        } catch (err) {
            alert('Failed to start scan: ' + err.message);
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Network Devices</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setShowScanModal(true)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <RefreshCw size={16} /> Scan Network
                    </button>
                    <button
                        onClick={fetchNetworkDevices}
                        style={{
                            padding: '8px',
                            backgroundColor: darkMode ? '#333' : '#eee',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: darkMode ? '#fff' : '#333'
                        }}
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {showScanModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: darkMode ? '#2c2c2c' : 'white',
                        padding: '2rem', borderRadius: '8px', minWidth: '300px'
                    }}>
                        <h3>Scan Network</h3>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Subnet (CIDR)</label>
                            <input
                                type="text"
                                value={scanSubnet}
                                onChange={(e) => setScanSubnet(e.target.value)}
                                style={{
                                    width: '100%', padding: '8px',
                                    backgroundColor: darkMode ? '#1e1e1e' : '#fff',
                                    color: darkMode ? '#fff' : '#000',
                                    border: `1px solid ${darkMode ? '#444' : '#ccc'}`
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button onClick={() => setShowScanModal(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #aaa', color: darkMode ? '#aaa' : '#666', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleScan} disabled={scanning} style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                {scanning ? 'Starting...' : 'Start Scan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? <div>Loading...</div> : (
                <div style={{
                    backgroundColor: darkMode ? '#1e1e1e' : 'white',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    overflow: 'hidden'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: darkMode ? '#2c2c2c' : '#f5f5f5', borderBottom: `2px solid ${darkMode ? '#444' : '#e0e0e0'}` }}>
                            <tr>
                                <th style={{ padding: '1rem' }}>Name/IP</th>
                                <th style={{ padding: '1rem' }}>Type</th>
                                <th style={{ padding: '1rem' }}>MAC</th>
                                <th style={{ padding: '1rem' }}>Open Ports</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {devices.map(device => {
                                const lastSeenMs = device.last_seen ? new Date(device.last_seen.endsWith('Z') ? device.last_seen : device.last_seen + 'Z').getTime() : 0;
                                const isOnline = lastSeenMs > 0 && (Date.now() - lastSeenMs) < 600000; // 10-min threshold
                                return (
                                    <tr
                                        key={device.id}
                                        onClick={() => setSelectedDevice(device)}
                                        style={{
                                            borderBottom: `1px solid ${darkMode ? '#333' : '#eee'}`,
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? '#252525' : '#f9f9f9'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 'bold' }}>{device.hostname || device.ip_address}</div>
                                            {device.hostname && <div style={{ fontSize: '0.8rem', color: '#888' }}>{device.ip_address}</div>}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '4px 8px', borderRadius: '4px',
                                                backgroundColor: darkMode ? '#333' : '#eee', fontSize: '0.8rem'
                                            }}>
                                                {device.device_type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{device.mac_address}</td>
                                        <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#888', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {device.open_ports}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ color: isOnline ? '#4CAF50' : '#BDBDBD', fontWeight: 'bold' }}>
                                                {isOnline ? 'Online' : 'Offline'}
                                            </span>
                                            {!isOnline && device.last_seen && (
                                                <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '2px' }}>
                                                    Last seen: {new Date(device.last_seen.endsWith('Z') ? device.last_seen : device.last_seen + 'Z').toLocaleString()}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {devices.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                                        No network devices found. Click "Scan Network" to discover devices.
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

const DeviceDetails = ({ device, onBack, darkMode }) => {
    // Parse open ports and snmp data safely
    let openPorts = [];
    let snmpData = {};
    try { openPorts = JSON.parse(device.open_ports); } catch (e) { }
    try { snmpData = JSON.parse(device.raw_snmp_data); } catch (e) { }

    return (
        <div style={{ color: darkMode ? '#e0e0e0' : '#333' }}>
            <div style={{ marginBottom: '1rem' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#4CAF50', cursor: 'pointer', fontWeight: 'bold' }}>
                    ← Back to List
                </button>
            </div>
            <div style={{ padding: '1rem', backgroundColor: darkMode ? '#1e1e1e' : 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h2 style={{ marginTop: 0 }}>{device.hostname || device.ip_address}</h2>
                <div style={{ color: '#888', marginBottom: '1rem' }}>
                    {device.device_type} • {device.ip_address} • {device.mac_address}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div>
                        <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '0.5rem' }}>Basic Info</h3>
                        <p><strong>Vendor:</strong> {device.vendor || '-'}</p>
                        <p><strong>Model:</strong> {device.model || '-'}</p>
                        <p><strong>Serial:</strong> {device.serial_number || '-'}</p>
                        <p><strong>Uptime:</strong> {device.uptime || snmpData.uptime || '-'}</p>
                        <p><strong>Firmware:</strong> {device.firmware_version || '-'}</p>
                    </div>
                    <div>
                        <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '0.5rem' }}>Network</h3>
                        <p><strong>DNS Name:</strong> {device.dns_name || '-'}</p>
                        <p>
                            <strong>Status:</strong>{' '}
                            {(() => {
                                const ms = device.last_seen ? new Date(device.last_seen.endsWith('Z') ? device.last_seen : device.last_seen + 'Z').getTime() : 0;
                                const online = ms > 0 && (Date.now() - ms) < 600000;
                                return <span style={{ color: online ? '#4CAF50' : '#BDBDBD', fontWeight: 'bold' }}>{online ? 'Online' : 'Offline'}</span>;
                            })()}
                        </p>
                        <p><strong>Last Seen:</strong> {device.last_seen ? new Date(device.last_seen.endsWith('Z') ? device.last_seen : device.last_seen + 'Z').toLocaleString() : '—'}</p>
                        <div>
                            <strong>Open Ports:</strong>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                {openPorts.map(p => (
                                    <span key={p} style={{ padding: '2px 8px', backgroundColor: '#4CAF50', color: 'white', borderRadius: '4px', fontSize: '0.8rem' }}>
                                        {p}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* SNMP Data Section */}
                <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '0.5rem', marginTop: '2rem' }}>Raw SNMP Data</h3>
                <pre style={{
                    backgroundColor: darkMode ? '#111' : '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflowX: 'auto',
                    fontSize: '0.8rem'
                }}>
                    {JSON.stringify(snmpData, null, 2)}
                </pre>
            </div>
        </div>
    );
};

export default NetworkDevices;
