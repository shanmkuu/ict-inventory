import React, { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Search, Download, Filter, X } from 'lucide-react'

const ASSET_STATUS_COLORS = {
    Assigned: '#4CAF50',
    Available: '#2196F3',
    'Under Repair': '#FF9800',
    Retired: '#9E9E9E',
}

const Records = ({ darkMode }) => {
    const [records, setRecords] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterDevice, setFilterDevice] = useState('')
    const [filterUser, setFilterUser] = useState('')
    const [filterDept, setFilterDept] = useState('')
    const [filterDateFrom, setFilterDateFrom] = useState('')
    const [filterDateTo, setFilterDateTo] = useState('')
    const [filterType, setFilterType] = useState('All') // All | REASSIGN | DEPT_CHANGE

    const bg = darkMode ? '#1e1e1e' : '#fff'
    const surfaceBg = darkMode ? '#252525' : '#f5f5f5'
    const border = darkMode ? '#333' : '#e0e0e0'
    const text = darkMode ? '#e0e0e0' : '#333'
    const muted = darkMode ? '#888' : '#9e9e9e'
    const inputBg = darkMode ? '#2c2c2c' : '#fff'

    const fetchRecords = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (filterDevice) params.set('device_id', filterDevice)
            if (filterUser) params.set('user', filterUser)
            if (filterDept) params.set('department', filterDept)
            if (filterDateFrom) params.set('date_from', filterDateFrom)
            if (filterDateTo) params.set('date_to', filterDateTo)
            const res = await fetch(`/api/v1/records?${params.toString()}`)
            if (!res.ok) throw new Error('Failed to fetch records')
            const data = await res.json()
            setRecords(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [filterDevice, filterUser, filterDept, filterDateFrom, filterDateTo])

    useEffect(() => { fetchRecords() }, [fetchRecords])

    const handleExport = () => {
        const params = new URLSearchParams()
        if (filterDevice) params.set('device_id', filterDevice)
        if (filterUser) params.set('user', filterUser)
        if (filterDept) params.set('department', filterDept)
        if (filterDateFrom) params.set('date_from', filterDateFrom)
        if (filterDateTo) params.set('date_to', filterDateTo)
        window.open(`/api/v1/records/export?${params.toString()}`, '_blank')
    }

    const clearFilters = () => {
        setFilterDevice(''); setFilterUser(''); setFilterDept('')
        setFilterDateFrom(''); setFilterDateTo(''); setSearch('')
        setFilterType('All')
    }

    const displayed = records.filter(r => {
        if (filterType !== 'All' && r.record_type !== filterType) return false
        if (!search) return true
        const s = search.toLowerCase()
        return (
            (r.hostname || '').toLowerCase().includes(s) ||
            (r.previous_user || '').toLowerCase().includes(s) ||
            (r.new_user || '').toLowerCase().includes(s) ||
            (r.admin_user || '').toLowerCase().includes(s) ||
            (r.reason || '').toLowerCase().includes(s) ||
            (r.department || '').toLowerCase().includes(s)
        )
    })

    const inputStyle = {
        padding: '0.45rem 0.7rem', borderRadius: '6px',
        border: `1px solid ${border}`, backgroundColor: inputBg,
        color: text, fontSize: '0.85rem', outline: 'none'
    }

    return (
        <div>
            {/* Stats row */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ backgroundColor: bg, borderRadius: '8px', padding: '1rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1, minWidth: '140px' }}>
                    <div style={{ fontSize: '0.8rem', color: muted, textTransform: 'uppercase' }}>Total Records</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4CAF50' }}>{records.length}</div>
                </div>
                <div style={{ backgroundColor: bg, borderRadius: '8px', padding: '1rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1, minWidth: '140px' }}>
                    <div style={{ fontSize: '0.8rem', color: muted, textTransform: 'uppercase' }}>Reassignments</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#2196F3' }}>
                        {records.filter(r => r.record_type === 'REASSIGN' || !r.record_type).length}
                    </div>
                </div>
                <div style={{ backgroundColor: bg, borderRadius: '8px', padding: '1rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1, minWidth: '140px' }}>
                    <div style={{ fontSize: '0.8rem', color: muted, textTransform: 'uppercase' }}>Dept. Changes</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1976D2' }}>
                        {records.filter(r => r.record_type === 'DEPT_CHANGE').length}
                    </div>
                </div>
                <div style={{ backgroundColor: bg, borderRadius: '8px', padding: '1rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1, minWidth: '140px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#C62828', textTransform: 'uppercase' }}>Deletions</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#C62828' }}>
                        {records.filter(r => r.record_type === 'DEVICE_DELETED').length}
                    </div>
                </div>
                <div style={{ backgroundColor: bg, borderRadius: '8px', padding: '1rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1, minWidth: '140px' }}>
                    <div style={{ fontSize: '0.8rem', color: muted, textTransform: 'uppercase' }}>Showing</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: text }}>{displayed.length}</div>
                </div>
            </div>

            {/* Filter bar */}
            <div style={{
                backgroundColor: bg, borderRadius: '8px', padding: '1rem 1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                    <Filter size={16} color={muted} />
                    <span style={{ fontSize: '0.85rem', color: muted, fontWeight: 'bold' }}>FILTERS</span>
                    <button onClick={clearFilters} style={{
                        marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                        color: muted, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                        <X size={13} /> Clear
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Record type quick filter */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        {['All', 'REASSIGN', 'DEPT_CHANGE', 'DEVICE_DELETED'].map(t => (
                            <button key={t} onClick={() => setFilterType(t)} style={{
                                padding: '4px 12px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                                fontSize: '0.78rem', fontWeight: filterType === t ? 'bold' : 'normal',
                                backgroundColor: filterType === t
                                    ? (t === 'DEPT_CHANGE' ? '#1976D2' : t === 'REASSIGN' ? '#4CAF50' : t === 'DEVICE_DELETED' ? '#C62828' : (darkMode ? '#444' : '#555'))
                                    : (darkMode ? '#2a2a2a' : '#eee'),
                                color: filterType === t ? 'white' : muted,
                                whiteSpace: 'nowrap'
                            }}>
                                {t === 'All' ? 'All Records' : t === 'REASSIGN' ? 'User Reassignments' : t === 'DEPT_CHANGE' ? 'Dept. Changes' : '🗑 Deletions'}
                            </button>
                        ))}
                    </div>
                    <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: muted }} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search records…"
                            style={{ ...inputStyle, width: '100%', paddingLeft: '28px', boxSizing: 'border-box' }}
                        />
                    </div>
                    <input value={filterUser} onChange={e => setFilterUser(e.target.value)} placeholder="User…" style={{ ...inputStyle, width: '100px' }} />
                    <input value={filterDept} onChange={e => setFilterDept(e.target.value)} placeholder="Dept…" style={{ ...inputStyle, width: '100px' }} />
                    <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={{ ...inputStyle, width: '120px' }} title="From" />
                    <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} style={{ ...inputStyle, width: '120px' }} title="To" />
                    <button onClick={fetchRecords} style={{
                        padding: '0.45rem 1rem', borderRadius: '6px', backgroundColor: '#4CAF50',
                        color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold'
                    }}>Apply</button>
                    <button onClick={handleExport} style={{
                        padding: '0.45rem 1rem', borderRadius: '6px',
                        backgroundColor: 'transparent', border: `1px solid ${border}`,
                        color: text, cursor: 'pointer', fontSize: '0.85rem',
                        display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <Download size={14} /> Export
                    </button>
                </div>
            </div>

            {/* Table */}
            <div style={{ backgroundColor: bg, borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: muted }}>Loading records…</div>
                ) : displayed.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: muted }}>
                        <ClipboardList size={40} color={muted} style={{ marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
                        No assignment records found.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ backgroundColor: surfaceBg, borderBottom: `2px solid ${border}` }}>
                                <tr>
                                    {['Type', 'Device', 'Serial No.', 'Previous User / Dept', 'New User / Dept', 'Date & Time', 'Admin', 'Department', 'Reason'].map(h => (
                                        <th key={h} style={{ padding: '0.85rem 1rem', color: muted, fontSize: '0.78rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {displayed.map((r, i) => {
                                    const isDept = r.record_type === 'DEPT_CHANGE'
                                    return (
                                        <tr key={r.id} style={{
                                            borderBottom: `1px solid ${border}`,
                                            backgroundColor: i % 2 === 0 ? 'transparent' : (darkMode ? '#1a1a1a' : '#fafafa')
                                        }}>
                                            {/* Type badge */}
                                            <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                                                {(() => {
                                                    const isDeleted = r.record_type === 'DEVICE_DELETED'
                                                    const isDept = r.record_type === 'DEPT_CHANGE'
                                                    if (isDeleted) return (
                                                        <span style={{
                                                            backgroundColor: darkMode ? '#3a1a1a' : '#FFEBEE',
                                                            color: '#C62828',
                                                            padding: '3px 8px', borderRadius: '10px', fontSize: '0.73rem', fontWeight: 'bold'
                                                        }}>🗑 Deleted</span>
                                                    )
                                                    return (
                                                        <span style={{
                                                            backgroundColor: isDept ? (darkMode ? '#1a2a3a' : '#E3F2FD') : (darkMode ? '#2c3e2e' : '#E8F5E9'),
                                                            color: isDept ? '#1976D2' : '#2E7D32',
                                                            padding: '3px 8px', borderRadius: '10px', fontSize: '0.73rem', fontWeight: 'bold'
                                                        }}>
                                                            {isDept ? '🏢 Dept. Change' : '👤 Reassignment'}
                                                        </span>
                                                    )
                                                })()}
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem' }}>
                                                <div style={{ fontWeight: 'bold', color: text }}>{r.hostname || r.device_id}</div>
                                                <div style={{ fontSize: '0.75rem', color: muted }}>{r.device_id}</div>
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', color: muted, fontSize: '0.85rem' }}>{r.serial_number || '—'}</td>
                                            <td style={{ padding: '0.85rem 1rem' }}>
                                                <span style={{
                                                    backgroundColor: isDept ? (darkMode ? '#2a2a3a' : '#EEF2FF') : (darkMode ? '#3c2c2c' : '#FFEBEE'),
                                                    color: isDept ? '#5C6BC0' : '#C62828',
                                                    padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem'
                                                }}>
                                                    {r.previous_user || '(none)'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem' }}>
                                                <span style={{
                                                    backgroundColor: isDept ? (darkMode ? '#1a2a3a' : '#E3F2FD') : (darkMode ? '#2c3e2e' : '#E8F5E9'),
                                                    color: isDept ? '#1976D2' : '#2E7D32',
                                                    padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem'
                                                }}>
                                                    {r.new_user}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: text, whiteSpace: 'nowrap' }}>
                                                {new Date(r.reassigned_at + (r.reassigned_at.endsWith('Z') ? '' : 'Z')).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: text }}>{r.admin_user}</td>
                                            <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: muted }}>{r.department || '—'}</td>
                                            <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: muted, maxWidth: '200px' }}>
                                                {r.reason || <span style={{ fontStyle: 'italic' }}>—</span>}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Records
