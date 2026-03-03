import React, { useState } from 'react';
import { Save, Monitor, Network, Tag, Cpu, Info } from 'lucide-react';

const ManualEntry = ({ darkMode, onSuccess }) => {
    const [formData, setFormData] = useState({
        hostname: '',
        os_name: '',
        os_version: '',
        system_type: 'Desktop',
        ip_address: '',
        mac_address: '',
        current_user: '',
        department: '',
        asset_tag: '',
        serial_number: '',
        asset_status: 'Assigned',
        condition: 'Functioning',
        cpu_model: '',
        ram_total_gb: '',
        disk_total_gb: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const generateDeviceId = () => {
        return 'manual-' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.hostname.trim()) {
            setError('Hostname is required.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMsg('');

        try {
            const payload = {
                ...formData,
                device_id: generateDeviceId(),
                ram_total_gb: formData.ram_total_gb ? parseFloat(formData.ram_total_gb) : null,
                disk_total_gb: formData.disk_total_gb ? parseFloat(formData.disk_total_gb) : null,
                mac_address: formData.mac_address.trim() || null,
                ip_address: formData.ip_address.trim() || null,
            };

            const res = await fetch('/api/v1/devices?admin=admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Failed to add device');
            }

            setSuccessMsg(`Device ${formData.hostname} added successfully!`);

            setFormData({
                hostname: '',
                os_name: '',
                os_version: '',
                system_type: 'Desktop',
                ip_address: '',
                mac_address: '',
                current_user: '',
                department: '',
                asset_tag: '',
                serial_number: '',
                asset_status: 'Assigned',
                condition: 'Functioning',
                cpu_model: '',
                ram_total_gb: '',
                disk_total_gb: ''
            });

            setTimeout(() => {
                if (onSuccess) onSuccess();
            }, 1500);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const sectionStyle = {
        backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
        padding: '1.5rem',
        borderRadius: '10px',
        boxShadow: darkMode ? '0 4px 6px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
        marginBottom: '1.5rem',
        border: `1px solid ${darkMode ? '#333' : '#f0f0f0'}`
    };

    const labelStyle = {
        display: 'block',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        color: darkMode ? '#aaa' : '#666',
        marginBottom: '0.4rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    };

    const inputStyle = {
        width: '100%',
        padding: '0.75rem',
        borderRadius: '6px',
        border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
        backgroundColor: darkMode ? '#2c2c2c' : '#fafafa',
        color: darkMode ? '#eee' : '#333',
        boxSizing: 'border-box',
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'border-color 0.2s'
    };

    const iconColor = darkMode ? '#4CAF50' : '#2E7D32';

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

            {error && (
                <div style={{ backgroundColor: '#FFEBEE', color: '#B71C1C', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #FFCDD2', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Info size={20} /> {error}
                </div>
            )}

            {successMsg && (
                <div style={{ backgroundColor: '#E8F5E9', color: '#2E7D32', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #C8E6C9', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Save size={20} /> {successMsg}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Basic Information */}
                <div style={sectionStyle}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', color: darkMode ? '#eee' : '#333', fontSize: '1.2rem' }}>
                        <Monitor size={22} color={iconColor} /> Basic Information
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
                        <div>
                            <label style={labelStyle}>Hostname *</label>
                            <input style={inputStyle} name="hostname" value={formData.hostname} onChange={handleChange} required placeholder="e.g. MacBook-Pro" />
                        </div>
                        <div>
                            <label style={labelStyle}>System Type</label>
                            <select style={inputStyle} name="system_type" value={formData.system_type} onChange={handleChange}>
                                <option value="Desktop">Desktop</option>
                                <option value="Laptop">Laptop</option>
                                <option value="MacBook">MacBook</option>
                                <option value="Server">Server</option>
                                <option value="Virtual Machine">Virtual Machine</option>
                                <option value="Mobile Device">Mobile Device</option>
                                <option value="Printer">Printer</option>
                                <option value="Network Equipment">Network Equipment</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>OS Name</label>
                            <input style={inputStyle} name="os_name" value={formData.os_name} onChange={handleChange} placeholder="e.g. macOS Sequoia" />
                        </div>
                    </div>
                </div>

                {/* Network & Connectivity */}
                <div style={sectionStyle}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', color: darkMode ? '#eee' : '#333', fontSize: '1.2rem' }}>
                        <Network size={22} color={iconColor} /> Network & Connectivity
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
                        <div>
                            <label style={labelStyle}>IP Address</label>
                            <input style={inputStyle} name="ip_address" value={formData.ip_address} onChange={handleChange} placeholder="e.g. 192.168.1.50" />
                        </div>
                        <div>
                            <label style={labelStyle}>MAC Address</label>
                            <input style={inputStyle} name="mac_address" value={formData.mac_address} onChange={handleChange} placeholder="e.g. 00:1A:2B:3C:4D:5E" />
                        </div>
                    </div>
                </div>

                {/* Lifecycle & Assignment */}
                <div style={sectionStyle}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', color: darkMode ? '#eee' : '#333', fontSize: '1.2rem' }}>
                        <Tag size={22} color={iconColor} /> Lifecycle & Assignment
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
                        <div>
                            <label style={labelStyle}>Owner / User</label>
                            <input style={inputStyle} name="current_user" value={formData.current_user} onChange={handleChange} placeholder="e.g. John Doe" />
                        </div>
                        <div>
                            <label style={labelStyle}>Department</label>
                            <input style={inputStyle} name="department" value={formData.department} onChange={handleChange} placeholder="e.g. IT, Design" />
                        </div>
                        <div>
                            <label style={labelStyle}>Asset Tag</label>
                            <input style={inputStyle} name="asset_tag" value={formData.asset_tag} onChange={handleChange} placeholder="e.g. MAC-001" />
                        </div>
                        <div>
                            <label style={labelStyle}>Serial Number</label>
                            <input style={inputStyle} name="serial_number" value={formData.serial_number} onChange={handleChange} placeholder="Hardware Serial" />
                        </div>
                        <div>
                            <label style={labelStyle}>Asset Status</label>
                            <select style={inputStyle} name="asset_status" value={formData.asset_status} onChange={handleChange}>
                                <option value="Available">Available</option>
                                <option value="Assigned">Assigned</option>
                                <option value="Under Repair">Under Repair</option>
                                <option value="Retired">Retired</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Condition</label>
                            <select style={inputStyle} name="condition" value={formData.condition} onChange={handleChange}>
                                <option value="Functioning">Functioning</option>
                                <option value="Faulty">Faulty</option>
                                <option value="Decommissioned">Decommissioned</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Hardware details */}
                <div style={sectionStyle}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', color: darkMode ? '#eee' : '#333', fontSize: '1.2rem' }}>
                        <Cpu size={22} color={iconColor} /> Hardware Specs (Optional)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>CPU Model</label>
                            <input style={inputStyle} name="cpu_model" value={formData.cpu_model} onChange={handleChange} placeholder="e.g. Apple M2 Pro" />
                        </div>
                        <div>
                            <label style={labelStyle}>RAM Total (GB)</label>
                            <input type="number" step="0.1" style={inputStyle} name="ram_total_gb" value={formData.ram_total_gb} onChange={handleChange} placeholder="e.g. 16" />
                        </div>
                        <div>
                            <label style={labelStyle}>Disk Total (GB)</label>
                            <input type="number" step="0.1" style={inputStyle} name="disk_total_gb" value={formData.disk_total_gb} onChange={handleChange} placeholder="e.g. 512" />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '0.8rem 2rem',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 6px rgba(76, 175, 80, 0.3)',
                            transition: 'background-color 0.2s',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Saving...' : <><Save size={20} /> Save Device</>}
                    </button>
                </div>
            </form>

        </div>
    );
};

export default ManualEntry;
