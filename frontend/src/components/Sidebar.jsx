import React from 'react'
import { LayoutDashboard, Monitor, Laptop, Server, Printer, Settings } from 'lucide-react'

const Sidebar = ({ activeTab, onTabChange }) => {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { type: 'external', label: 'EQUIPMENTS', href: 'http://172.16.1.18/auth/login/', isHeader: true },
        { id: 'all', label: 'All Devices', icon: Server },
        { id: 'desktop', label: 'System Units', icon: Monitor }, // Filter: System Type = Desktop
        { id: 'laptop', label: 'Laptops', icon: Laptop }, // Filter: System Type = Laptop
        // { id: 'mac', label: 'Mac Desktops', icon: Monitor }, // Placeholder for future
        { type: 'external', label: 'Static Inventory', href: 'http://172.16.1.18/dashboard/system-units/', isHeader: true },
        { id: 'settings', label: 'Settings', icon: Settings },
    ]

    return (
        <div className="sidebar" style={{
            width: '250px',
            height: '100vh',
            backgroundColor: '#f5f5f5', // Light gray background like image
            borderRight: '1px solid #e0e0e0',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            left: 0,
            top: 0
        }}>
            <div style={{ padding: '1.5rem', fontWeight: 'bold', fontSize: '1.2rem', color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#EF5350', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>K</div>
                ICT Inventory
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {menuItems.map((item, index) => {
                    if (item.type === 'divider') {
                        return (
                            <div key={index} style={{
                                padding: '1rem 1.5rem 0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                color: '#9e9e9e',
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
                                    color: '#9e9e9e',
                                    textTransform: 'uppercase',
                                    textDecoration: 'none',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => e.target.style.color = '#4CAF50'}
                                onMouseLeave={(e) => e.target.style.color = '#9e9e9e'}
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
                                color: isActive ? '#4CAF50' : '#616161',
                                backgroundColor: isActive ? '#E8F5E9' : 'transparent',
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
        </div>
    )
}

export default Sidebar
