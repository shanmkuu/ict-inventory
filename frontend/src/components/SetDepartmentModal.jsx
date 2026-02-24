import React, { useState } from 'react'
import { X, Building2 } from 'lucide-react'

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

const SetDepartmentModal = ({ device, darkMode, onClose, onSuccess }) => {
    const [department, setDepartment] = useState(device.department || '')
    const [adminUser, setAdminUser] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const bg = darkMode ? '#1e1e1e' : '#fff'
    const text = darkMode ? '#e0e0e0' : '#333'
    const border = darkMode ? '#444' : '#ddd'
    const inputBg = darkMode ? '#2c2c2c' : '#f9f9f9'
    const labelColor = darkMode ? '#aaa' : '#555'

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!department) {
            setError('Please select a department.')
            return
        }
        if (!adminUser.trim()) {
            setError('Admin name is required for audit purposes.')
            return
        }
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(
                `/api/v1/devices/${device.device_id}?admin=${encodeURIComponent(adminUser.trim())}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ department }),
                }
            )
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.detail || 'Failed to update department')
            }
            onSuccess()
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                backgroundColor: bg, borderRadius: '12px', width: '460px', maxWidth: '95vw',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)', padding: '2rem', color: text, position: 'relative'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Building2 size={22} color="#1976D2" />
                        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Set Department</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: labelColor }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Device Info */}
                <div style={{
                    backgroundColor: darkMode ? '#1a2a3a' : '#E3F2FD', borderRadius: '8px',
                    padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.9rem'
                }}>
                    <div style={{ fontWeight: 'bold', color: '#1976D2' }}>{device.hostname}</div>
                    <div style={{ color: labelColor, marginTop: '2px' }}>
                        {device.system_type || 'Unknown'} &nbsp;·&nbsp; {device.ip_address || 'No IP'}
                        {device.current_user && <>&nbsp;·&nbsp; {device.current_user}</>}
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Current Department (read-only) */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: labelColor }}>
                            Current Department
                        </label>
                        <input
                            value={device.department || '(not set)'}
                            readOnly
                            style={{
                                width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px',
                                border: `1px solid ${border}`, backgroundColor: darkMode ? '#252525' : '#f0f0f0',
                                color: labelColor, fontSize: '0.9rem', boxSizing: 'border-box', cursor: 'not-allowed'
                            }}
                        />
                    </div>

                    {/* New Department Dropdown */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: labelColor }}>
                            New Department <span style={{ color: '#E53935' }}>*</span>
                        </label>
                        <select
                            value={department}
                            onChange={e => setDepartment(e.target.value)}
                            style={{
                                width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px',
                                border: `1px solid ${border}`, backgroundColor: inputBg,
                                color: text, fontSize: '0.95rem', boxSizing: 'border-box',
                                cursor: 'pointer', outline: 'none'
                            }}
                        >
                            <option value="">— Select a department —</option>
                            {DEPARTMENTS.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>

                    {/* Admin Name */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: labelColor }}>
                            Admin / Your Name <span style={{ color: '#E53935' }}>*</span>
                        </label>
                        <input
                            value={adminUser}
                            onChange={e => setAdminUser(e.target.value)}
                            placeholder="Your name for the audit log"
                            style={{
                                width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px',
                                border: `1px solid ${border}`, backgroundColor: inputBg,
                                color: text, fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none'
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            backgroundColor: '#FFEBEE', color: '#B71C1C', padding: '0.6rem 0.75rem',
                            borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} style={{
                            padding: '0.6rem 1.25rem', borderRadius: '6px',
                            border: `1px solid ${border}`, backgroundColor: 'transparent',
                            color: text, cursor: 'pointer', fontSize: '0.9rem'
                        }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} style={{
                            padding: '0.6rem 1.5rem', borderRadius: '6px', border: 'none',
                            backgroundColor: loading ? '#90CAF9' : '#1976D2',
                            color: 'white', cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold', fontSize: '0.9rem'
                        }}>
                            {loading ? 'Saving…' : 'Save Department'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default SetDepartmentModal
