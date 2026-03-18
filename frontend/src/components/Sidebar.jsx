import React, { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import logo from '../assets/icon_logo.png'
import { LayoutDashboard, Monitor, Laptop, Server, Settings, Network, ClipboardList, Building2, PlusCircle, Users, LogOut } from 'lucide-react'

const Sidebar = ({ activeTab, onTabChange, darkMode }) => {
    const { user, logout } = useContext(AuthContext);
    const isAdmin = user?.role === 'Admin';
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'all', label: 'All Devices', icon: Server },
        { id: 'departments', label: 'Departments', icon: Building2 },
        { id: 'desktop', label: 'System Units', icon: Monitor },
        { id: 'laptop', label: 'Laptops', icon: Laptop },
        { id: 'network-devices', label: 'Network Devices', icon: Network },
        isAdmin ? { id: 'manual-entry', label: 'Add Device', icon: PlusCircle } : null,
        { id: 'records', label: 'Records', icon: ClipboardList },
        isAdmin ? { id: 'users', label: 'Manage Users', icon: Users } : null,
        isAdmin ? { id: 'settings', label: 'Settings', icon: Settings } : null,
    ].filter(Boolean)

    return (
        <div className="sidebar" style={{
            width: '250px',
            height: '100vh',
            backgroundColor: darkMode ? '#181818' : '#f5f5f5', // Darker gray for dark mode
            borderRight: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            left: 0,
            top: 0
        }}>
            <div style={{ padding: '1.25rem 1.5rem', fontWeight: 'bold', fontSize: '1.1rem', color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={logo} alt="Logo" style={{ width: 60, height: 60, objectFit: 'contain' }} />
                <span>ICT Inventory <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>v1.1</span></span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {menuItems.map((item, index) => {
                    if (item.type === 'divider') {
                        return (
                            <div key={index} style={{
                                padding: '1rem 1.5rem 0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                color: darkMode ? '#888' : '#9e9e9e',
                                textTransform: 'uppercase'
                            }}>
                                {item.title}
                            </div>
                        )
                    }

                    if (item.type === 'external') {
                        return (
                            <a
                                key={index}
                                href={item.href}
                                style={{
                                    display: 'block',
                                    padding: '1rem 1.5rem 0.5rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    color: darkMode ? '#888' : '#9e9e9e',
                                    textTransform: 'uppercase',
                                    textDecoration: 'none',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => e.target.style.color = '#4CAF50'}
                                onMouseLeave={(e) => e.target.style.color = darkMode ? '#888' : '#9e9e9e'}
                            >
                                {item.label}
                            </a>
                        )
                    }

                    const Icon = item.icon
                    const isActive = activeTab === item.id

                    return (
                        <div
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            style={{
                                padding: '0.75rem 1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                cursor: 'pointer',
                                color: isActive ? '#4CAF50' : (darkMode ? '#ddd' : '#616161'),
                                backgroundColor: isActive ? (darkMode ? '#2c3e2e' : '#E8F5E9') : 'transparent',
                                borderLeft: isActive ? '4px solid #4CAF50' : '4px solid transparent',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Icon size={20} />
                            <span>{item.label}</span>
                        </div>
                    )
                })}
            </div>

            {/* Logout Button */}
            <div style={{ padding: '1rem', borderTop: `1px solid ${darkMode ? '#333' : '#e0e0e0'}` }}>
                <div
                    onClick={logout}
                    style={{
                        padding: '0.75rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        color: '#F44336',
                        borderRadius: '6px',
                        transition: 'all 0.2s ease',
                        fontWeight: 'bold'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? '#3a1a1a' : '#FFEBEE'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </div>
            </div>
        </div>
    )
}

export default Sidebar
