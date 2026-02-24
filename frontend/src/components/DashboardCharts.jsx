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

const StatCard = ({ label, value, color, darkMode }) => (
    <div style={{
        backgroundColor: darkMode ? '#1e1e1e' : '#fff',
        borderRadius: '8px', padding: '1rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1, minWidth: '130px'
    }}>
        <div style={{ fontSize: '0.78rem', color: darkMode ? '#888' : '#9e9e9e', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: color }}>{value}</div>
    </div>
)

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

const DashboardCharts = ({ devices, darkMode }) => {
    const now = new Date()

    const onlineCount = useMemo(() =>
        devices.filter(d => {
            const ds = d.last_seen.endsWith('Z') ? d.last_seen : d.last_seen + 'Z'
            return (now - new Date(ds)) < 300000
        }).length, [devices])

    const ramData = useMemo(() => {
        const counts = {}
        devices.forEach(d => {
            const ram = d.ram_total_gb ? `${Math.round(d.ram_total_gb)}GB` : 'Unknown'
            counts[ram] = (counts[ram] || 0) + 1
        })
        return Object.keys(counts).map(name => ({ name, value: counts[name] }))
    }, [devices])

    const storageData = useMemo(() => {
        const counts = {}
        devices.forEach(d => {
            const disk = d.disk_total_gb ? `${Math.round(d.disk_total_gb)}GB` : 'Unknown'
            counts[disk] = (counts[disk] || 0) + 1
        })
        return Object.keys(counts).map(name => ({ name, value: counts[name] }))
    }, [devices])

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
            {/* Stat Cards */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <StatCard label="Total Devices" value={devices.length} color={darkMode ? '#e0e0e0' : '#333'} darkMode={darkMode} />
                <StatCard label="Online Now" value={onlineCount} color="#4CAF50" darkMode={darkMode} />
                <StatCard label="Offline" value={devices.length - onlineCount} color="#BDBDBD" darkMode={darkMode} />
                <StatCard label="Assigned" value={devices.filter(d => (d.asset_status || 'Assigned') === 'Assigned').length} color="#2196F3" darkMode={darkMode} />
                <StatCard label="Under Repair" value={devices.filter(d => d.asset_status === 'Under Repair').length} color="#FF9800" darkMode={darkMode} />
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

                <ChartCard title="RAM Distribution" darkMode={darkMode}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={ramData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value">
                                {ramData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend verticalAlign="middle" align="right" layout="vertical" formatter={legendFormatter} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* Row 2: Bar charts */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
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

                <ChartCard title="Storage Capacity Distribution" darkMode={darkMode} height={240}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={storageData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value">
                                {storageData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend verticalAlign="middle" align="right" layout="vertical" formatter={legendFormatter} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    )
}

export default DashboardCharts
