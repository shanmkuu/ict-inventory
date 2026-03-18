import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const UserManagement = ({ darkMode }) => {
    const { token, user: currentUser } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('User');
    const [submitError, setSubmitError] = useState('');

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/v1/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (err) {
            console.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [token]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setSubmitError('');
        try {
            const res = await fetch('/api/v1/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole })
            });
            if (res.ok) {
                setShowModal(false);
                setNewUsername('');
                setNewPassword('');
                setNewRole('User');
                fetchUsers();
            } else {
                const errData = await res.json();
                setSubmitError(errData.detail || 'Failed to create user');
            }
        } catch (err) {
            setSubmitError('Connection failed');
        }
    };

    const handleDeleteUser = async (userId, username) => {
        if (username === currentUser.username) {
            alert("You cannot delete your own session!");
            return;
        }
        if (!window.confirm(`Are you sure you want to delete user '${username}'?`)) return;

        try {
            const res = await fetch(`/api/v1/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok || res.status === 204) {
                fetchUsers();
            } else {
                alert("Failed to delete user");
            }
        } catch (err) {
            alert("Failed to delete user");
        }
    };

    if (loading) return <div style={{ color: darkMode ? '#aaa' : '#666' }}>Loading users...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: darkMode ? '#e0e0e0' : '#333', fontSize: '1.4rem', margin: 0 }}>Administrative Users</h2>
                <button
                    onClick={() => setShowModal(true)}
                    style={{
                        padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white',
                        border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer'
                    }}
                >
                    + Create User
                </button>
            </div>

            <div style={{
                backgroundColor: darkMode ? '#1e1e1e' : '#fff',
                borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: darkMode ? '#2c2c2c' : '#f5f5f5', borderBottom: `2px solid ${darkMode ? '#444' : '#e0e0e0'}` }}>
                        <tr>
                            <th style={{ padding: '1rem', color: darkMode ? '#aaa' : '#616161' }}>ID</th>
                            <th style={{ padding: '1rem', color: darkMode ? '#aaa' : '#616161' }}>Username</th>
                            <th style={{ padding: '1rem', color: darkMode ? '#aaa' : '#616161' }}>Role</th>
                            <th style={{ padding: '1rem', color: darkMode ? '#aaa' : '#616161', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} style={{ borderBottom: `1px solid ${darkMode ? '#333' : '#eee'}` }}>
                                <td style={{ padding: '1rem', color: darkMode ? '#bbb' : '#616161' }}>{u.id}</td>
                                <td style={{ padding: '1rem', fontWeight: 'bold', color: darkMode ? '#e0e0e0' : '#424242' }}>
                                    {u.username} {u.username === currentUser.username && <span style={{ color: '#4CAF50', fontSize: '0.8rem', marginLeft: '8px' }}>(You)</span>}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold',
                                        backgroundColor: u.role === 'Admin' ? (darkMode ? '#3a2a1a' : '#FFF3E0') : (darkMode ? '#1a2a3a' : '#E3F2FD'),
                                        color: u.role === 'Admin' ? '#E65100' : '#1565C0'
                                    }}>
                                        {u.role}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    <button
                                        onClick={() => handleDeleteUser(u.id, u.username)}
                                        disabled={u.username === currentUser.username}
                                        style={{
                                            padding: '4px 10px', backgroundColor: u.username === currentUser.username ? (darkMode ? '#333' : '#ccc') : (darkMode ? '#3a1a1a' : '#FFEBEE'),
                                            color: u.username === currentUser.username ? (darkMode ? '#666' : '#999') : '#C62828',
                                            border: `1px solid ${u.username === currentUser.username ? 'transparent' : '#EF9A9A'}`,
                                            borderRadius: '4px', cursor: u.username === currentUser.username ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.8rem'
                                        }}
                                    >
                                        🗑 Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: darkMode ? '#1e1e1e' : '#fff', padding: '2rem', borderRadius: '8px',
                        width: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', color: darkMode ? '#e0e0e0' : '#333'
                    }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Create New User</h3>
                        {submitError && <div style={{ color: '#D32F2F', marginBottom: '1rem', fontSize: '0.9rem' }}>{submitError}</div>}
                        <form onSubmit={handleCreateUser}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 'bold' }}>Username</label>
                                <input
                                    type="text" required value={newUsername} onChange={e => setNewUsername(e.target.value)}
                                    style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: `1px solid ${darkMode ? '#444' : '#ccc'}`, backgroundColor: darkMode ? '#2c2c2c' : '#fff', color: darkMode ? '#fff' : '#000' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 'bold' }}>Password</label>
                                <input
                                    type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                    style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: `1px solid ${darkMode ? '#444' : '#ccc'}`, backgroundColor: darkMode ? '#2c2c2c' : '#fff', color: darkMode ? '#fff' : '#000' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 'bold' }}>Role</label>
                                <select
                                    value={newRole} onChange={e => setNewRole(e.target.value)}
                                    style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: `1px solid ${darkMode ? '#444' : '#ccc'}`, backgroundColor: darkMode ? '#2c2c2c' : '#fff', color: darkMode ? '#fff' : '#000' }}
                                >
                                    <option value="User">User</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', backgroundColor: darkMode ? '#333' : '#e0e0e0', color: darkMode ? '#ccc' : '#333', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                                <button type="submit" style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', backgroundColor: '#4CAF50', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>Create User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
