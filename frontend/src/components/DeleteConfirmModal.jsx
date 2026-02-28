import { useEffect, useRef } from 'react'

/**
 * DeleteConfirmModal
 * Props:
 *   device   – device object (hostname, ip_address, current_user, department)
 *   onConfirm – called when admin clicks "Delete"
 *   onCancel  – called when admin clicks "Cancel" or clicks outside
 *   darkMode  – boolean
 */
export default function DeleteConfirmModal({ device, onConfirm, onCancel, darkMode }) {
    const overlayRef = useRef(null)

    // Close on Escape key
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onCancel() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onCancel])

    const bg = darkMode ? '#1e1e1e' : '#fff'
    const textMain = darkMode ? '#e0e0e0' : '#333'
    const textSub = darkMode ? '#aaa' : '#666'
    const border = darkMode ? '#333' : '#eee'
    const overlayBg = 'rgba(0,0,0,0.55)'

    return (
        <div
            ref={overlayRef}
            onClick={(e) => { if (e.target === overlayRef.current) onCancel() }}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                backgroundColor: overlayBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(3px)',
            }}
        >
            <div style={{
                backgroundColor: bg,
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                width: '100%', maxWidth: '420px',
                padding: '2rem',
                border: `1px solid ${border}`,
                animation: 'fadeSlideIn 0.18s ease',
            }}>
                {/* Icon */}
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '2.5rem' }}>🗑️</span>
                </div>

                {/* Title */}
                <h2 style={{
                    margin: '0 0 0.5rem', textAlign: 'center',
                    fontSize: '1.25rem', color: '#C62828', fontWeight: 700,
                }}>
                    Delete Device?
                </h2>

                {/* Device info */}
                <div style={{
                    backgroundColor: darkMode ? '#2a1a1a' : '#FFF8F8',
                    border: '1px solid #EF9A9A',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    marginBottom: '1rem',
                }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#C62828', marginBottom: '4px' }}>
                        {device.hostname}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: textSub, lineHeight: 1.7 }}>
                        {device.ip_address && <div>IP: <strong style={{ color: textMain }}>{device.ip_address}</strong></div>}
                        {device.current_user && <div>Owner: <strong style={{ color: textMain }}>{device.current_user}</strong></div>}
                        {device.department && <div>Dept: <strong style={{ color: textMain }}>{device.department}</strong></div>}
                    </div>
                </div>

                <p style={{ margin: '0 0 1.5rem', fontSize: '0.87rem', color: textSub, textAlign: 'center', lineHeight: 1.6 }}>
                    This will <strong>permanently remove</strong> the device from inventory.
                    A deletion record will be stored in <em>Records</em> for audit purposes.
                </p>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            flex: 1, padding: '0.7rem',
                            borderRadius: '8px',
                            border: `1px solid ${border}`,
                            backgroundColor: darkMode ? '#2c2c2c' : '#f5f5f5',
                            color: textMain,
                            fontSize: '0.9rem', fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            flex: 1, padding: '0.7rem',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: '#C62828',
                            color: '#fff',
                            fontSize: '0.9rem', fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(198,40,40,0.3)',
                        }}
                    >
                        Yes, Delete
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
      `}</style>
        </div>
    )
}
