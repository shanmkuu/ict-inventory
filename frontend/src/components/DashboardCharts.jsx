import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#EF5350', '#FFA726', '#66BB6A', '#42A5F5', '#AB47BC', '#8D6E63']

const ChartCard = ({ title, children }) => (
    <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        flex: 1,
        minWidth: '300px'
    }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#424242' }}>{title}</h3>
        <div style={{ height: '200px' }}>
            {children}
        </div>
    </div>
)

const DashboardCharts = ({ devices }) => {
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

    const brandData = useMemo(() => {
        // We don't have explicit manufacturer yet, using OS/System Type as proxy or just Placeholders if empty
        // Ideally we update agent to collect 'wmic csproduct get vendor'
        const counts = {}
        devices.forEach(d => {
            // Fallback to splitting hostname or just "Unknown" if real brand missing
            // For visual demo, let's group by System Type if Brand missing
            const brand = d.system_type || 'Unknown'
            counts[brand] = (counts[brand] || 0) + 1
        })
        return Object.keys(counts).map(name => ({ name, value: counts[name] }))
    }, [devices])


    return (
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <ChartCard title="System Types (Brands)">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={brandData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {brandData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="middle" align="left" layout="vertical" />
                    </PieChart>
                </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="RAM Distribution">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={ramData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {ramData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="middle" align="left" layout="vertical" />
                    </PieChart>
                </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Storage Capacity">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={storageData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {storageData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="middle" align="left" layout="vertical" />
                    </PieChart>
                </ResponsiveContainer>
            </ChartCard>
        </div>
    )
}

export default DashboardCharts
