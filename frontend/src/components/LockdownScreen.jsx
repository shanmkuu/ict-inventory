import React from 'react';

const LockdownScreen = ({ passwordInput, setPasswordInput, onUnlock, unlockError, isHardLockdown }) => {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.95)',
            zIndex: 10000,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'white', textAlign: 'center', padding: '2rem',
            fontFamily: 'Arial, sans-serif'
        }}>
            <h1 style={{ color: '#ff4444', fontSize: '3rem', marginBottom: '1rem' }}>
                {isHardLockdown ? 'CRITICAL SYSTEM BREACH' : 'SYSTEM LOCKDOWN'}
            </h1>
            <p style={{ fontSize: '1.2rem', maxWidth: '600px', marginBottom: '2rem' }}>
                {isHardLockdown
                    ? 'CRITICAL ERROR: Essential security components are missing from the system. Access is strictly prohibited until core integrity is restored.'
                    : 'The system has detected an unauthorized modification to the core developer credentials or missing security files.'}
                <br /><br />
                {isHardLockdown ? 'Session bypass is disabled for this security level.' : 'Access is restricted until the integrity is restored or a bypass is authorized.'}
            </p>

            <div style={{
                backgroundColor: '#1a1a1a', padding: '2rem', borderRadius: '8px',
                border: '1px solid #333', width: '100%', maxWidth: '400px'
            }}>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Authorize System Bypass</h2>
                <input
                    type="password"
                    placeholder="Enter Authorization Key"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && onUnlock()}
                    style={{
                        width: '100%', padding: '0.8rem', marginBottom: '1rem',
                        backgroundColor: '#000', border: '1px solid #444',
                        color: '#4CAF50', borderRadius: '4px', textAlign: 'center',
                        fontSize: '1.1rem', letterSpacing: '2px', outline: 'none'
                    }}
                />
                <button
                    onClick={onUnlock}
                    style={{
                        width: '100%', padding: '0.8rem',
                        backgroundColor: '#2E7D32', color: 'white',
                        border: 'none', borderRadius: '4px', cursor: 'pointer',
                        fontWeight: 'bold', fontSize: '1rem'
                    }}
                >
                    AUTHORIZE
                </button>
                {unlockError && (
                    <p style={{ color: '#ff4444', marginTop: '1rem', fontSize: '0.9rem' }}>
                        Invalid Authorization Key. System remains locked.
                    </p>
                )}
            </div>

            <div style={{
                marginTop: '2rem', padding: '1.5rem',
                backgroundColor: '#111', borderRadius: '8px',
                border: '1px solid #222', width: '100%', maxWidth: '400px',
                textAlign: 'left'
            }}>
                <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    🔄 Alternative Recovery
                </p>
                <p style={{ color: '#666', fontSize: '0.8rem', lineHeight: '1.6', margin: 0 }}>
                    If you don't have the authorization key, you can restore system access by:
                </p>
                <ul style={{ color: '#555', fontSize: '0.78rem', lineHeight: '1.8', marginTop: '0.5rem', paddingLeft: '1.2rem', textAlign: 'left' }}>
                    <li>Restoring the missing <code style={{ color: '#777' }}>Footer.jsx</code> component</li>
                    <li>Reverting any changes made to <code style={{ color: '#777' }}>system-integrity.js</code></li>
                    <li>Ensuring the developer credit link is visible and unmodified</li>
                </ul>
                <p style={{ color: '#444', fontSize: '0.75rem', marginTop: '0.75rem', marginBottom: 0, fontStyle: 'italic' }}>
                    The system will automatically unlock once integrity is verified.
                </p>
            </div>

            <div style={{ marginTop: '2rem', color: '#333', fontSize: '0.8rem' }}>
                Developer Integrity Shield v2.4.9
            </div>
        </div>
    );
};

export default LockdownScreen;
