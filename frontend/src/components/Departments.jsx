import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Building2, Monitor, Laptop, Server } from 'lucide-react'

const DEPARTMENTS = [
    'Radio Services',
    'Finance and Administration',
    'Editorial Services',
    'Technical Services',
    'HR',
    'ICT',
    'Marketing & Advertising',
    'Digital',
    'Procurement',
    'Television Services',
    'Audit',
    'Corporate and Directorate',
    'Strategy & Special Projects',
    'CPRD',
]

const DEVICE_TYPES = ['All', 'Desktop', 'Laptop']

const statusColor = (device) => {
    if (!device.last_seen) return '#BDBDBD'
    const dateStr = device.last_seen.endsWith('Z') ? device.last_seen : device.last_seen + 'Z'
    const diff = new Date() - new Date(dateStr)
    return diff < 60000 * 5 ? '#4CAF50' : '#BDBDBD'
}

const DepartmentContainer = ({ name, devices, darkMode }) => {
    const [collapsed, setCollapsed] = useState(false)
    const [typeFilter, setTypeFilter] = useState('All')

    const filteredDevices = useMemo(() => {
        if (typeFilter === 'All') return devices
        return devices.filter(d =>
            (d.system_type || '').toLowerCase().includes(typeFilter.toLowerCase())
        )
    }, [devices, typeFilter])

    const bg = darkMode ? '#1e1e1e' : '#fff'
    const headerBg = darkMode ? '#252525' : '#f8f8f8'
    const border = darkMode ? '#333' : '#e8e8e8'
    const text = darkMode ? '#e0e0e0' : '#333'
    const subtle = darkMode ? '#888' : '#9e9e9e'

    const typeBtn = (type) => ({
        padding: '3px 10px',
        borderRadius: '12px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.75rem',
        fontWeight: typeFilter === type ? 'bold' : 'normal',
        backgroundColor: typeFilter === type
            ? (darkMode ? '#1a2a3a' : '#E3F2FD')
            : (darkMode ? '#2a2a2a' : '#f0f0f0'),
        color: typeFilter === type ? '#1976D2' : subtle,
        transition: 'all 0.15s',
    })

    return (
        <div style={{
            backgroundColor: bg,
            border: `1px solid ${border}`,
            borderRadius: '10px',
            marginBottom: '1rem',
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        }}>
            {/* Header */}
            <div
                onClick={() => setCollapsed(c => !c)}
                style={{
                    backgroundColor: headerBg,
                    borderBottom: collapsed ? 'none' : `1px solid ${border}`,
                    padding: '0.85rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    userSelect: 'none',
                }}
            >
                <Building2 size={17} color="#1976D2" />
                <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: text, flex: 1 }}>{name}</span>
                <span style={{
                    backgroundColor: darkMode ? '#1a2a3a' : '#E3F2FD',
                    color: '#1976D2',
                    borderRadius: '10px',
                    padding: '2px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                }}>
                    {devices.length} device{devices.length !== 1 ? 's' : ''}
                </span>
                {collapsed ? <ChevronRight size={16} color={subtle} /> : <ChevronDown size={16} color={subtle} />}
            </div>

            {/* Body */}
            {!collapsed && (
                <div style={{ padding: '0.75rem 1.25rem 1rem' }}>
                    {/* Device Type Filter */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', color: subtle, marginRight: '4px' }}>Filter:</span>
                        {DEVICE_TYPES.map(type => (
                            <button key={type} style={typeBtn(type)} onClick={() => setTypeFilter(type)}>
                                {type}
                            </button>
                        ))}
                        <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: subtle }}>
                            Showing {filteredDevices.length} of {devices.length}
                        </span>
                    </div>

                    {/* Device List */}
                    {filteredDevices.length === 0 ? (
                        <div style={{ color: subtle, fontSize: '0.85rem', padding: '0.5rem 0' }}>
                            No {typeFilter !== 'All' ? typeFilter : ''} devices in this department.
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${border}` }}>
                                    {['Hostname', 'Type', 'Owner', 'IP Address', 'Status'].map(h => (
                                        <th key={h} style={{
                                            padding: '6px 10px', textAlign: 'left',
                                            color: subtle, fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 'bold'
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDevices.map(device => {
                                    const online = statusColor(device) === '#4CAF50'
                                    return (
                                        <tr key={device.device_id} style={{ borderBottom: `1px solid ${darkMode ? '#2a2a2a' : '#f0f0f0'}` }}>
                                            <td style={{ padding: '7px 10px', fontWeight: '600', color: text }}>{device.hostname}</td>
                                            <td style={{ padding: '7px 10px', color: subtle }}>{device.system_type || '—'}</td>
                                            <td style={{ padding: '7px 10px', color: subtle }}>{device.current_user || '—'}</td>
                                            <td style={{ padding: '7px 10px', color: subtle, fontFamily: 'monospace', fontSize: '0.82rem' }}>
                                                {device.ip_address || '—'}
                                            </td>
                                            <td style={{ padding: '7px 10px' }}>
                                                <span style={{
                                                    backgroundColor: online ? '#E8F5E9' : (darkMode ? '#2a2a2a' : '#f5f5f5'),
                                                    color: online ? '#2E7D32' : subtle,
                                                    padding: '2px 8px', borderRadius: '10px',
                                                    fontSize: '0.73rem', fontWeight: 'bold'
                                                }}>
                                                    {online ? 'Online' : 'Offline'}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    )
}

const Departments = ({ devices, darkMode }) => {
    const [search, setSearch] = useState('')
    const subtle = darkMode ? '#888' : '#9e9e9e'
    const text = darkMode ? '#e0e0e0' : '#333'

    // Group devices by department
    const grouped = useMemo(() => {
        const map = {}
        devices.forEach(d => {
            const dept = d.department && d.department.trim() ? d.department.trim() : '__unassigned__'
            if (!map[dept]) map[dept] = []
            map[dept].push(d)
        })
        return map
    }, [devices])

    // Order: known departments first (in order), then unassigned last
    const orderedKeys = useMemo(() => {
        const known = DEPARTMENTS.filter(d => grouped[d] && grouped[d].length > 0)
        const unknown = Object.keys(grouped)
            .filter(k => k !== '__unassigned__' && !DEPARTMENTS.includes(k))
            .sort()
        const keys = [...known, ...unknown]
        if (grouped['__unassigned__']?.length > 0) keys.push('__unassigned__')
        return keys
    }, [grouped])

    const filteredKeys = useMemo(() => {
        if (!search.trim()) return orderedKeys
        const s = search.toLowerCase()
        return orderedKeys.filter(k => k.toLowerCase().includes(s))
    }, [orderedKeys, search])

    const totalAssigned = devices.filter(d => d.department && d.department.trim()).length

    return (
        <div>
            {/* Summary bar */}
            <div style={{
                display: 'flex', gap: '1.5rem', alignItems: 'center',
                marginBottom: '1.25rem', flexWrap: 'wrap'
            }}>
                <div style={{ fontSize: '0.9rem', color: subtle }}>
                    <span style={{ fontWeight: 'bold', color: text }}>{totalAssigned}</span> assigned &nbsp;·&nbsp;
                    <span style={{ fontWeight: 'bold', color: text }}>{devices.length - totalAssigned}</span> unassigned &nbsp;·&nbsp;
                    <span style={{ fontWeight: 'bold', color: '#1976D2' }}>{orderedKeys.filter(k => k !== '__unassigned__').length}</span> departments
                </div>
                {/* Search */}
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search department…"
                    style={{
                        marginLeft: 'auto',
                        padding: '6px 12px', borderRadius: '6px',
                        border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
                        backgroundColor: darkMode ? '#2c2c2c' : '#f9f9f9',
                        color: text, fontSize: '0.875rem', outline: 'none', width: '220px'
                    }}
                />
            </div>

            {filteredKeys.length === 0 ? (
                <div style={{ color: subtle, textAlign: 'center', padding: '3rem' }}>No departments found.</div>
            ) : (
                filteredKeys.map(key => (
                    <DepartmentContainer
                        key={key}
                        name={key === '__unassigned__' ? 'Unassigned' : key}
                        devices={grouped[key]}
                        darkMode={darkMode}
                    />
                ))
            )}
        </div>
    )
}

export default Departments
