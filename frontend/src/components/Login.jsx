import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = ({ darkMode }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

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
                setError('Invalid username or password');
            }
        } catch (err) {
            setError('Connection failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: darkMode ? '#121212' : '#f5f5f5', color: darkMode ? '#e0e0e0' : '#333'
        }}>
            <form onSubmit={handleLogin} style={{
                padding: '2.5rem', backgroundColor: darkMode ? '#1e1e1e' : '#fff',
                borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '350px'
            }}>
                <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 'bold' }}>ICT Inventory</h2>
                {error && <div style={{ color: '#D32F2F', backgroundColor: '#FFEBEE', padding: '10px', borderRadius: '4px', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>{error}</div>}
                <div style={{ marginBottom: '1.2rem' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 'bold', color: darkMode ? '#bbb' : '#555' }}>Username</label>
                    <input
                        type="text"
                        required
                        autoComplete="username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        style={{ width: '100%', padding: '12px', boxSizing: 'border-box', borderRadius: '6px', border: `1px solid ${darkMode ? '#444' : '#ddd'}`, backgroundColor: darkMode ? '#2c2c2c' : '#fafafa', color: darkMode ? '#fff' : '#000', outline: 'none' }}
                    />
                </div>
                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 'bold', color: darkMode ? '#bbb' : '#555' }}>Password</label>
                    <input
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={{ width: '100%', padding: '12px', boxSizing: 'border-box', borderRadius: '6px', border: `1px solid ${darkMode ? '#444' : '#ddd'}`, backgroundColor: darkMode ? '#2c2c2c' : '#fafafa', color: darkMode ? '#fff' : '#000', outline: 'none' }}
                    />
                </div>
                <button type="submit" disabled={loading} style={{
                    width: '100%', padding: '14px', boxSizing: 'border-box',
                    backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '6px',
                    fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem',
                    boxShadow: '0 2px 4px rgba(76, 175, 80, 0.3)'
                }}>
                    {loading ? 'Authenticating...' : 'Sign In'}
                </button>
            </form>
        </div>
    );
};
export default Login;
