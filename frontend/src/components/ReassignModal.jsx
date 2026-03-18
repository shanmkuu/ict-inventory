import React, { useState, useContext } from 'react'
import { X, UserCheck } from 'lucide-react'
import { AuthContext } from '../context/AuthContext'

const ReassignModal = ({ device, darkMode, onClose, onSuccess }) => {
    const { token } = useContext(AuthContext)
    const [newUser, setNewUser] = useState('')
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!newUser.trim()) {
            setError('New Owner field is required.')
            return
        }
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/v1/devices/${device.device_id}/reassign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ new_user: newUser.trim(), reason: reason.trim() || null }),
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.detail || 'Reassignment failed')
            }
            onSuccess()
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const bg = darkMode ? '#1e1e1e' : '#fff'
    const text = darkMode ? '#e0e0e0' : '#333'
    const border = darkMode ? '#444' : '#ddd'
    const inputBg = darkMode ? '#2c2c2c' : '#f9f9f9'
    const labelColor = darkMode ? '#aaa' : '#555'

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                backgroundColor: bg, borderRadius: '12px', width: '480px', maxWidth: '95vw',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)', padding: '2rem', color: text, position: 'relative'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <UserCheck size={22} color="#4CAF50" />
                        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Reassign Device</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: labelColor }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Device Info */}
                <div style={{
                    backgroundColor: darkMode ? '#2c3e2e' : '#E8F5E9', borderRadius: '8px',
                    padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.9rem'
                }}>
                    <div style={{ fontWeight: 'bold', color: '#4CAF50' }}>{device.hostname}</div>
                    <div style={{ color: labelColor, marginTop: '2px' }}>
                        {device.system_type || 'Unknown'} &nbsp;·&nbsp; {device.ip_address || 'No IP'}
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Previous User (read only) */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: labelColor }}>
                            Previous Owner
                        </label>
                        <input
                            value={device.current_user || '(unassigned)'}
                            readOnly
                            style={{
                                width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px',
                                border: `1px solid ${border}`, backgroundColor: darkMode ? '#252525' : '#f0f0f0',
                                color: labelColor, fontSize: '0.95rem', boxSizing: 'border-box', cursor: 'not-allowed'
                            }}
                        />
                    </div>

                    {/* New User */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: labelColor }}>
                            New Owner <span style={{ color: '#E53935' }}>*</span>
                        </label>
                        <input
                            value={newUser}
                            onChange={e => setNewUser(e.target.value)}
                            placeholder="Enter new owner's name"
                            style={{
                                width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px',
                                border: `1px solid ${border}`, backgroundColor: inputBg,
                                color: text, fontSize: '0.95rem', boxSizing: 'border-box',
                                outline: 'none'
                            }}
                        />
                    </div>



                    {/* Reason */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: labelColor }}>
                            Reason <span style={{ color: labelColor, fontWeight: 'normal' }}>(optional)</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="e.g. Employee transferred to another department"
                            rows={3}
                            style={{
                                width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px',
                                border: `1px solid ${border}`, backgroundColor: inputBg,
                                color: text, fontSize: '0.9rem', boxSizing: 'border-box',
                                resize: 'vertical', fontFamily: 'inherit'
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
                            backgroundColor: loading ? '#81C784' : '#4CAF50',
                            color: 'white', cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold', fontSize: '0.9rem'
                        }}>
                            {loading ? 'Reassigning…' : 'Confirm Reassignment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ReassignModal
