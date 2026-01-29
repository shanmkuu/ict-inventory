import React, { useState } from 'react'
import { Server, Download, Moon, Sun, Shield, Database, RefreshCw, Settings as SettingsIcon } from 'lucide-react'

const SettingsCard = ({ title, icon: Icon, children }) => (
    <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem',
        overflow: 'hidden'
    }}>
        <div style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #eee',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        }}>
            <Icon size={20} color="#4CAF50" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#333' }}>{title}</h3>
        </div>
        <div style={{ padding: '1.5rem' }}>
            {children}
        </div>
    </div>
)

const Settings = ({ devices }) => {
    const [darkMode, setDarkMode] = useState(false)
    const [refreshRate, setRefreshRate] = useState(30)

    const handleExportCSV = () => {
        // Generate CSV content
        const headers = ['Hostname', 'IP Address', 'OS', 'System Type', 'GPU', 'RAM (GB)', 'Disk (GB)', 'User', 'Last Seen']
        const rows = devices.map(d => [
            d.hostname,
            d.ip_address,
            `${d.os_name} ${d.os_release}`,
            d.system_type,
            d.gpu_model,
            d.ram_total_gb,
            d.disk_total_gb,
            d.current_user,
            d.last_seen
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
        ].join('\n')

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `ict_inventory_export_${new Date().toISOString().slice(0, 10)}.csv`
        link.click()
    }

    return (
        <div style={{ maxWidth: '800px' }}>

            {/* System Status */}
            <SettingsCard title="System Status" icon={Server}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>Server Address</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>10.10.6.56</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>Port</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>8000</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>Database Status</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.1rem', fontWeight: 'bold', color: '#4CAF50' }}>
                            <Database size={16} /> Connected
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>Agent Version</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>v1.2.0</div>
                    </div>
                </div>
            </SettingsCard>

            {/* Preferences */}
            <SettingsCard title="Preferences" icon={SettingsIcon}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div>
                        <div style={{ fontWeight: 'bold', color: '#333' }}>Dark Mode</div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>Switch to dark theme interface</div>
                    </div>
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: '1px solid #ddd',
                            background: darkMode ? '#333' : '#fff',
                            color: darkMode ? '#fff' : '#333',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {darkMode ? <Moon size={16} /> : <Sun size={16} />}
                        {darkMode ? 'On' : 'Off'}
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontWeight: 'bold', color: '#333' }}>Dashboard Refresh Rate</div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>How often to fetch new data (Current: {refreshRate}s)</div>
                    </div>
                    <input
                        type="range"
                        min="10"
                        max="300"
                        step="10"
                        value={refreshRate}
                        onChange={(e) => setRefreshRate(e.target.value)}
                        style={{ width: '150px' }}
                    />
                </div>
            </SettingsCard>

            {/* Data Management */}
            <SettingsCard title="Data Management" icon={Database}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={handleExportCSV}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 'bold'
                        }}
                    >
                        <Download size={18} /> Export Inventory (CSV)
                    </button>

                    <button
                        disabled
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#f5f5f5',
                            color: '#999',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            cursor: 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 'bold'
                        }}
                    >
                        <Shield size={18} /> Manage API Keys (Admin Only)
                    </button>
                </div>
            </SettingsCard>

        </div>
    )
}

export default Settings;
