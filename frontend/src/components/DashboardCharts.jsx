import React, { useMemo } from 'react'
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'

const PIE_COLORS = ['#EF5350', '#FFA726', '#66BB6A', '#42A5F5', '#AB47BC', '#8D6E63', '#26C6DA', '#D4E157']
const STATUS_COLORS = {
    Assigned: '#4CAF50',
    Available: '#2196F3',
    'Under Repair': '#FF9800',
    Retired: '#9E9E9E',
}

const CircularProgress = ({ percentage, color, label, size = 110, strokeWidth = 10, glow = false, darkMode }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    const trackColor = darkMode ? '#2a2e35' : '#e2e8f0';
    const textColor = darkMode ? '#fff' : '#1e293b';
    const labelColor = darkMode ? '#a0aabf' : '#64748b';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: size, height: size }}>
                <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                    {glow && (
                        <circle
                            cx={size / 2} cy={size / 2} r={radius}
                            stroke={color} strokeWidth={strokeWidth} fill="none"
                            strokeDasharray={circumference} strokeDashoffset={offset}
                            strokeLinecap="round"
                            style={{ filter: `drop-shadow(0 0 10px ${color})`, opacity: 0.8 }}
                        />
                    )}
                    <circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        stroke={color} strokeWidth={strokeWidth} fill="none"
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                    />
                </svg>
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '1.25rem', fontWeight: 'bold', color: textColor
                }}>
                    {Math.round(percentage)}%
                </div>
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: labelColor }}>{label}</div>
        </div>
    );
};

const MiniStatCard = ({ label, value, color, isAlert = false, extra, darkMode }) => {
    const bgColor = darkMode ? '#1c1f26' : '#ffffff';
    const borderColor = darkMode ? '#2d323b' : '#e2e8f0';
    const labelColor = darkMode ? '#a0aabf' : '#64748b';
    const valueColor = darkMode ? '#e2e8f0' : '#1e293b';
    const shadowColor = darkMode ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)';

    return (
        <div style={{
            backgroundColor: bgColor,
            padding: '1rem',
            borderRadius: '8px',
            border: isAlert ? `1px solid ${color}` : `1px solid ${borderColor}`,
            boxShadow: isAlert ? `0 0 16px ${color}30` : `0 2px 4px ${shadowColor}`,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center',
            minWidth: '120px',
            flex: 1,
            transition: 'all 0.3s ease'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '8px', height: '8px', backgroundColor: color, borderRadius: '2px', boxShadow: `0 0 8px ${color}` }} />
                <span style={{ fontSize: '0.65rem', color: labelColor, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</span>
            </div>
            <div style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: valueColor,
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1.2
            }}>
                {value}
            </div>
            {extra && (
                <div style={{ fontSize: '0.7rem', color: labelColor, marginTop: '4px', lineHeight: 1.4 }}>
                    {extra}
                </div>
            )}
        </div>
    );
};

const ChartCard = ({ title, children, darkMode, height = 220 }) => (
    <div style={{
        backgroundColor: darkMode ? '#1e1e1e' : 'white',
        padding: '1.5rem', borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1, minWidth: '300px'
    }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: darkMode ? '#e0e0e0' : '#424242' }}>{title}</h3>
        <div style={{ height }}>{children}</div>
    </div>
)

const DashboardCharts = ({ devices, networkDevices: rawNetworkDevices = [], darkMode }) => {
    const networkDevices = useMemo(() =>
        rawNetworkDevices.filter(d => (d.device_type || '').toLowerCase() !== 'unknown'),
        [rawNetworkDevices])

    const now = new Date()

    const computerOnlineCount = useMemo(() =>
        devices.filter(d => {
            const ds = d.last_seen.endsWith('Z') ? d.last_seen : d.last_seen + 'Z'
            // Computers: 10-min grace
            return (now - new Date(ds)) < 600000
        }).length, [devices])

    const networkOnlineCount = useMemo(() =>
        networkDevices.filter(d => {
            // NetDevs: Primary: use system_status
            if (d.system_status) return d.system_status === 'online'
            // Fallback: 15-min grace
            const ds = d.last_seen.endsWith('Z') ? d.last_seen : d.last_seen + 'Z'
            return (now - new Date(ds)) < 900000
        }).length, [networkDevices])

    const onlineDeviceCounts = useMemo(() => {
        const counts = { desktop: 0, laptop: 0, mac: 0, printer: 0, switch: 0, router: 0, tv: 0 }
        devices.forEach(d => {
            const ds = d.last_seen.endsWith('Z') ? d.last_seen : d.last_seen + 'Z'
            if ((now - new Date(ds)) < 600000) {
                const sysType = (d.system_type || '').toLowerCase()
                const os = (d.os_type || d.os_name || '').toLowerCase()
                if (os.includes('mac') || os.includes('darwin') || sysType.includes('mac')) counts.mac++
                else if (sysType === 'desktop') counts.desktop++
                else if (sysType === 'laptop') counts.laptop++
                else counts.desktop++
            }
        })
        networkDevices.forEach(d => {
            let isOnline = false
            if (d.system_status) isOnline = d.system_status === 'online'
            else {
                const ds = d.last_seen.endsWith('Z') ? d.last_seen : d.last_seen + 'Z'
                isOnline = (now - new Date(ds)) < 900000
            }
            if (isOnline) {
                const type = (d.device_type || '').toLowerCase()
                if (type === 'printer') counts.printer++
                else if (type === 'switch') counts.switch++
                else if (type === 'router') counts.router++
                else if (type === 'smart_tv' || type === 'tv') counts.tv++
            }
        })
        return counts
    }, [devices, networkDevices, now])

    const totalDevices = devices.length + networkDevices.length
    const totalOnline = computerOnlineCount + networkOnlineCount

    const deviceCounts = useMemo(() => {
        const counts = { desktop: 0, laptop: 0, mac: 0, printer: 0, switch: 0, router: 0, tv: 0 }
        devices.forEach(d => {
            const sysType = (d.system_type || '').toLowerCase()
            const os = (d.os_type || d.os_name || '').toLowerCase()
            if (os.includes('mac') || os.includes('darwin') || sysType.includes('mac')) counts.mac++
            else if (sysType === 'desktop') counts.desktop++
            else if (sysType === 'laptop') counts.laptop++
            else counts.desktop++
        })
        networkDevices.forEach(d => {
            const type = (d.device_type || '').toLowerCase()
            if (type === 'printer') counts.printer++
            else if (type === 'switch') counts.switch++
            else if (type === 'router') counts.router++
            else if (type === 'smart_tv' || type === 'tv') counts.tv++
        })
        return counts
    }, [devices, networkDevices])

    const systemTypeData = useMemo(() => {
        const counts = {}
        devices.forEach(d => {
            const t = d.system_type || 'Unknown'
            counts[t] = (counts[t] || 0) + 1
        })
        return Object.keys(counts).map(name => ({ name, value: counts[name] }))
    }, [devices])

    const assetStatusData = useMemo(() => {
        const counts = { Assigned: 0, Available: 0, 'Under Repair': 0, Retired: 0 }
        devices.forEach(d => {
            const s = d.asset_status || 'Assigned'
            counts[s] = (counts[s] || 0) + 1
        })
        return Object.keys(counts).filter(k => counts[k] > 0).map(name => ({ name, value: counts[name] }))
    }, [devices])

    const departmentData = useMemo(() => {
        const counts = {}
        devices.forEach(d => {
            const dept = d.department || 'Unassigned'
            counts[dept] = (counts[dept] || 0) + 1
        })
        return Object.keys(counts)
            .map(name => ({ name, value: counts[name] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8)
    }, [devices])

    const tooltipStyle = { backgroundColor: darkMode ? '#333' : '#fff', borderColor: darkMode ? '#555' : '#ccc', color: darkMode ? '#fff' : '#000' }
    const legendFormatter = (value) => <span style={{ color: darkMode ? '#bbb' : '#333', fontSize: '0.8rem' }}>{value}</span>
    const axisColor = darkMode ? '#888' : '#9e9e9e'

    return (
        <div>
            {/* Sector 1: Asset Inventory */}
            <div style={{
                backgroundColor: darkMode ? '#0f1219' : '#f8fafc',
                padding: '2rem',
                borderRadius: '16px',
                marginBottom: '1.5rem',
                border: darkMode ? '1px solid #1f232b' : '1px solid #e2e8f0',
                boxShadow: darkMode ? '0 10px 30px rgba(0,0,0,0.2)' : '0 10px 30px rgba(0,0,0,0.05)'
            }}>
                <h2 style={{ margin: '0 0 2rem 0', color: darkMode ? '#fff' : '#1e293b', fontSize: '1.35rem', fontWeight: 600 }}>Asset Inventory</h2>

                <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                        {/* Total Assets compact card */}
                        <div style={{
                            backgroundColor: darkMode ? '#1c1f26' : '#ffffff',
                            padding: '1rem',
                            borderRadius: '8px',
                            border: `1px solid #6366f1`,
                            boxShadow: `0 0 16px #6366f130`,
                            display: 'flex', flexDirection: 'column',
                            justifyContent: 'center',
                            transition: 'all 0.3s ease'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <div style={{ width: '8px', height: '8px', backgroundColor: '#6366f1', borderRadius: '2px', boxShadow: '0 0 8px #6366f1' }} />
                                <span style={{ fontSize: '0.65rem', color: darkMode ? '#a0aabf' : '#64748b', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Total Assets</span>
                            </div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: darkMode ? '#e2e8f0' : '#1e293b', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2 }}>
                                {totalDevices}
                            </div>
                        </div>
                        <MiniStatCard label="System Units" value={deviceCounts.desktop} color="#8b5cf6" darkMode={darkMode} />
                        <MiniStatCard label="Laptops" value={deviceCounts.laptop} color="#ec4899" darkMode={darkMode} />
                        <MiniStatCard label="MacBooks" value={deviceCounts.mac} color="#94a3b8" darkMode={darkMode} />
                        <MiniStatCard label="Printers" value={deviceCounts.printer} color="#94a3b8" darkMode={darkMode} />
                        <MiniStatCard label="Switches" value={deviceCounts.switch} color="#f97316" darkMode={darkMode} />
                        <MiniStatCard label="Routers" value={deviceCounts.router} color="#64748b" darkMode={darkMode} />
                        <MiniStatCard label="Smart TV" value={deviceCounts.tv} color="#0ea5e9" darkMode={darkMode} />

                        {/* Multi-Condition Card */}
                        <div style={{
                            backgroundColor: darkMode ? '#1c1f26' : '#ffffff',
                            padding: '1rem',
                            borderRadius: '8px',
                            border: darkMode ? `1px solid #2d323b` : `1px solid #e2e8f0`,
                            gridColumn: 'span 1',
                            display: 'flex', flexDirection: 'column',
                            justifyContent: 'center',
                            transition: 'all 0.3s ease'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <div style={{ width: '8px', height: '8px', backgroundColor: '#f59e0b', borderRadius: '2px', boxShadow: `0 0 8px #f59e0b` }} />
                                <span style={{ fontSize: '0.65rem', color: darkMode ? '#a0aabf' : '#64748b', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Computer Conditions</span>
                            </div>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.55rem', color: darkMode ? '#a0aabf' : '#64748b', textTransform: 'uppercase', marginBottom: '2px', fontWeight: 600 }}>Functioning</span>
                                    <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.1rem', fontFamily: "'JetBrains Mono', monospace" }}>{devices.filter(d => (d.condition || '').toLowerCase() === 'functioning').length}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.55rem', color: darkMode ? '#a0aabf' : '#64748b', textTransform: 'uppercase', marginBottom: '2px', fontWeight: 600 }}>Faulty</span>
                                    <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1.1rem', fontFamily: "'JetBrains Mono', monospace" }}>{devices.filter(d => (d.condition || '').toLowerCase() === 'faulty').length}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.55rem', color: darkMode ? '#a0aabf' : '#64748b', textTransform: 'uppercase', marginBottom: '2px', fontWeight: 600 }}>Decommissioned</span>
                                    <span style={{ color: '#64748b', fontWeight: 'bold', fontSize: '1.1rem', fontFamily: "'JetBrains Mono', monospace" }}>{devices.filter(d => (d.condition || '').toLowerCase() === 'decommissioned').length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sector 2: Online Status */}
            <div style={{
                backgroundColor: darkMode ? '#0f1219' : '#f8fafc',
                padding: '2rem',
                borderRadius: '16px',
                marginBottom: '2rem',
                border: darkMode ? '1px solid #1f232b' : '1px solid #e2e8f0',
                boxShadow: darkMode ? '0 10px 30px rgba(0,0,0,0.2)' : '0 10px 30px rgba(0,0,0,0.05)'
            }}>
                <h2 style={{ margin: '0 0 2rem 0', color: darkMode ? '#fff' : '#1e293b', fontSize: '1.35rem', fontWeight: 600 }}>Online Status</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: darkMode ? '#a0aabf' : '#64748b', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%' }} />
                                Computers Online
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: darkMode ? '#fff' : '#1e293b', marginBottom: '8px' }}>
                                {computerOnlineCount} <span style={{ fontSize: '0.85rem', color: darkMode ? '#64748b' : '#94a3b8', fontWeight: 400 }}>of {devices.length}</span>
                            </div>
                            <div style={{
                                display: 'flex', flexWrap: 'wrap', gap: '12px',
                                fontSize: '0.85rem', color: darkMode ? '#e2e8f0' : '#1e293b', fontWeight: 500
                            }}>
                                <span>Desktops: <strong style={{ color: darkMode ? '#fff' : '#000' }}>{onlineDeviceCounts.desktop}</strong></span>
                                <span style={{ color: darkMode ? '#4b5563' : '#cbd5e1' }}>|</span>
                                <span>Laptops: <strong style={{ color: darkMode ? '#fff' : '#000' }}>{onlineDeviceCounts.laptop}</strong></span>
                                <span style={{ color: darkMode ? '#4b5563' : '#cbd5e1' }}>|</span>
                                <span>Macs: <strong style={{ color: darkMode ? '#fff' : '#000' }}>{onlineDeviceCounts.mac}</strong></span>
                            </div>
                        </div>

                        <div>
                            <div style={{ fontSize: '0.85rem', color: darkMode ? '#a0aabf' : '#64748b', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', backgroundColor: '#0ea5e9', borderRadius: '50%' }} />
                                Network Online
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: darkMode ? '#fff' : '#1e293b', marginBottom: '8px' }}>
                                {networkOnlineCount} <span style={{ fontSize: '0.85rem', color: darkMode ? '#64748b' : '#94a3b8', fontWeight: 400 }}>of {networkDevices.length}</span>
                            </div>
                            <div style={{
                                display: 'flex', flexWrap: 'wrap', gap: '12px',
                                fontSize: '0.85rem', color: darkMode ? '#e2e8f0' : '#1e293b', fontWeight: 500
                            }}>
                                <span>Routers: <strong style={{ color: darkMode ? '#fff' : '#000' }}>{onlineDeviceCounts.router}</strong></span>
                                <span style={{ color: darkMode ? '#4b5563' : '#cbd5e1' }}>|</span>
                                <span>Switches: <strong style={{ color: darkMode ? '#fff' : '#000' }}>{onlineDeviceCounts.switch}</strong></span>
                                <span style={{ color: darkMode ? '#4b5563' : '#cbd5e1' }}>|</span>
                                <span>Smart TV: <strong style={{ color: darkMode ? '#fff' : '#000' }}>{onlineDeviceCounts.tv}</strong></span>
                                <span style={{ color: darkMode ? '#4b5563' : '#cbd5e1' }}>|</span>
                                <span>Printers: <strong style={{ color: darkMode ? '#fff' : '#000' }}>{onlineDeviceCounts.printer}</strong></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 1: Pie charts */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <ChartCard title="System Types" darkMode={darkMode}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={systemTypeData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value">
                                {systemTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend verticalAlign="middle" align="right" layout="vertical" formatter={legendFormatter} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Asset Status Distribution" darkMode={darkMode}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={assetStatusData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value">
                                {assetStatusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || PIE_COLORS[i]} />)}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend verticalAlign="middle" align="right" layout="vertical" formatter={legendFormatter} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Devices per Department" darkMode={darkMode} height={240}>
                    <ResponsiveContainer width="100%" height="100%">
                        {departmentData.length > 0 ? (
                            <BarChart data={departmentData} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#333' : '#eee'} />
                                <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                                <YAxis tick={{ fill: axisColor, fontSize: 11 }} allowDecimals={false} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Bar dataKey="value" fill="#4CAF50" radius={[4, 4, 0, 0]} name="Devices" />
                            </BarChart>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: axisColor, fontSize: '0.85rem' }}>
                                No department data yet.<br />Assign departments via device edit.
                            </div>
                        )}
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    )
}

export default DashboardCharts
