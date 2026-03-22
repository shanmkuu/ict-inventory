import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import bgImage from '../assets/login_bg.png';

const Login = ({ darkMode }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    // Force a fresh session when visiting the login page
    useEffect(() => {
        logout();
    }, [logout]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const res = await fetch('/api/v1/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString(),
            });
            if (res.ok) {
                const data = await res.json();
                login(data.access_token, data.role, data.username);
                navigate('/');
            } else {
                setError('Invalid credentials');
            }
        } catch (err) {
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            overflow: 'hidden'
        }}>
            {/* Soft overlay to ensure readability */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                zIndex: 0
            }} />

            {/* Main Glass Panel */}
            <div style={{
                position: 'relative',
                zIndex: 1,
                width: '90%',
                maxWidth: '800px',
                padding: '3rem 2rem 4rem',
                background: darkMode ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: darkMode ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '24px',
                boxShadow: darkMode ? '0 30px 60px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)' : '0 30px 60px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                overflow: 'hidden'
            }}>

                {/* World Map Overlay inside the glass panel */}
                <div style={{
                    position: 'absolute',
                    top: '20%', left: 0, right: 0, bottom: 0,
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 800 400\'%3E%3Cpath fill=\'rgba(255,255,255,0.2)\' d=\'M150,150 Q180,130 200,160 T250,140 Q280,180 320,150 T400,170 Q450,120 500,150 T600,130 Q650,180 700,150 T750,180 L750,300 L50,300 Z\'/%3E%3C/svg%3E")',
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center 40px',
                    opacity: 0.6,
                    zIndex: 0,
                    pointerEvents: 'none'
                }} />

                {/* Network nodes decoration */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundImage: 'radial-gradient(circle at 25% 45%, rgba(255,255,255,0.8) 3px, transparent 4px), radial-gradient(circle at 75% 55%, rgba(255,255,255,0.8) 3px, transparent 4px), radial-gradient(circle at 50% 30%, rgba(200,230,255,0.6) 4px, transparent 5px)',
                    zIndex: 0,
                    pointerEvents: 'none',
                    opacity: 0.7
                }} />

                {/* Connecting lines decoration (simulated with SVG) */}
                <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.4 }}>
                    <path d="M 200 180 L 400 120 L 600 220" stroke="white" strokeWidth="1" fill="none" />
                    <path d="M 150 250 L 200 180 L 300 300" stroke="white" strokeWidth="0.5" fill="none" />
                    <path d="M 600 220 L 700 150 L 750 280" stroke="white" strokeWidth="0.5" fill="none" />
                </svg>


                <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                    <h1 style={{
                        color: darkMode ? '#ffffff' : '#1a2b3c',
                        fontSize: '28px',
                        fontWeight: '600',
                        letterSpacing: '2px',
                        marginBottom: '40px',
                        textShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 10px rgba(255,255,255,0.8)'
                    }}>
                        ICT INVENTORY SYSTEM
                    </h1>

                    <form onSubmit={handleLogin} style={{ width: '100%' }}>

                        {error && (
                            <div style={{
                                background: 'rgba(255, 50, 50, 0.2)',
                                border: '1px solid rgba(255, 100, 100, 0.4)',
                                color: '#fff',
                                padding: '10px',
                                borderRadius: '8px',
                                marginBottom: '15px',
                                textAlign: 'center',
                                fontSize: '14px'
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{ marginBottom: '20px' }}>
                            <input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '16px 20px',
                                    boxSizing: 'border-box',
                                    background: darkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.4)',
                                    border: darkMode ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.7)',
                                    borderRadius: '12px',
                                    color: darkMode ? '#ffffff' : '#333333',
                                    fontSize: '15px',
                                    outline: 'none',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                                    transition: 'background 0.3s, border 0.3s'
                                }}
                                onFocus={e => {
                                    e.target.style.background = darkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)';
                                    e.target.style.borderColor = darkMode ? 'rgba(255, 255, 255, 0.5)' : '#4CAF50';
                                }}
                                onBlur={e => {
                                    e.target.style.background = darkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.4)';
                                    e.target.style.borderColor = darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.7)';
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '30px' }}>
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '16px 20px',
                                    boxSizing: 'border-box',
                                    background: darkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.4)',
                                    border: darkMode ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.7)',
                                    borderRadius: '12px',
                                    color: darkMode ? '#ffffff' : '#333333',
                                    fontSize: '15px',
                                    outline: 'none',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                                    transition: 'background 0.3s, border 0.3s'
                                }}
                                onFocus={e => {
                                    e.target.style.background = darkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)';
                                    e.target.style.borderColor = darkMode ? 'rgba(255, 255, 255, 0.5)' : '#4CAF50';
                                }}
                                onBlur={e => {
                                    e.target.style.background = darkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.4)';
                                    e.target.style.borderColor = darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.7)';
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: 'linear-gradient(90deg, #9bb0d6, #d0bdf4, #9bb0d6)',
                                backgroundSize: '200% auto',
                                color: '#2a3b5c',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '15px',
                                fontWeight: '700',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                letterSpacing: '1px',
                                boxShadow: '0 8px 16px rgba(155, 176, 214, 0.3)',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '8px',
                                animation: 'gradientShift 3s ease infinite'
                            }}
                            onMouseEnter={e => {
                                if (!loading) {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 12px 20px rgba(155, 176, 214, 0.4)';
                                }
                            }}
                            onMouseLeave={e => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 8px 16px rgba(155, 176, 214, 0.3)';
                            }}
                        >
                            {loading ? 'AUTHENTICATING...' : 'LOGIN'}
                        </button>
                    </form>
                </div>
            </div>

            <style>{`
                ::placeholder {
                    color: ${darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)'};
                }
                @keyframes gradientShift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>
        </div>
    );
};

export default Login;
