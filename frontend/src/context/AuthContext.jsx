import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [user, setUser] = useState(() => {
        const role = localStorage.getItem('role');
        const username = localStorage.getItem('username');
        return role && username ? { role, username } : null;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode(token);
                if (decoded.exp * 1000 < Date.now()) {
                    logout();
                }
            } catch (err) {
                logout();
            }
        }
        setLoading(false);
    }, [token]);

    const login = (jwtToken, role, username) => {
        setToken(jwtToken);
        setUser({ role, username });
        localStorage.setItem('token', jwtToken);
        localStorage.setItem('role', role);
        localStorage.setItem('username', username);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('username');
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
