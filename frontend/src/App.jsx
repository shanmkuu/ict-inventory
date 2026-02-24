import { useState, useEffect, useMemo } from 'react'
import './App.css'
import Sidebar from './components/Sidebar'
import DashboardCharts from './components/DashboardCharts'
import Settings from './components/Settings'
import NetworkDevices from './components/NetworkDevices'
import Records from './components/Records'
import ReassignModal from './components/ReassignModal'

function App() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Reassign modal state
  const [reassignTarget, setReassignTarget] = useState(null) // device object or null

  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark'
  })

  const toggleTheme = () => {
    setDarkMode(prev => {
      const newMode = !prev
      localStorage.setItem('theme', newMode ? 'dark' : 'light')
      return newMode
    })
  }

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/v1/devices?limit=1000')
      if (!response.ok) throw new Error('Failed to fetch devices')
      const data = await response.json()
      setDevices(data)
      setError(null)
    } catch (err) {
      console.error(err)
      setError('Could not connect to inventory server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
    const interval = setInterval(fetchDevices, 30000)
    return () => clearInterval(interval)
  }, [])

  // Deduplicate devices by hostname (keep most recent)
  const uniqueDevices = useMemo(() => {
    const map = new Map()
    devices.forEach(d => {
      const hostname = d.hostname
      const existing = map.get(hostname)
      if (!existing) {
        map.set(hostname, d)
      } else {
        const dTime = new Date(d.last_seen.endsWith('Z') ? d.last_seen : d.last_seen + 'Z').getTime()
        const eTime = new Date(existing.last_seen.endsWith('Z') ? existing.last_seen : existing.last_seen + 'Z').getTime()
        if (dTime > eTime) map.set(hostname, d)
      }
    })
    return Array.from(map.values())
  }, [devices])

  // Filtering Logic
  const filteredDevices = useMemo(() => {
    return uniqueDevices.filter(device => {
      if (activeTab === 'dashboard' || activeTab === 'all') return true
      if (activeTab === 'desktop') return device.system_type === 'Desktop'
      if (activeTab === 'laptop') return device.system_type === 'Laptop'
      return true
    })
  }, [uniqueDevices, activeTab])

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'System Units Overview'
      case 'all': return 'All Devices'
      case 'desktop': return 'System Units (Desktops)'
      case 'laptop': return 'Laptops'
      case 'network-devices': return 'Network Devices'
      case 'records': return 'Records – Assignment History'
      case 'settings': return 'Settings'
      default: return 'Dashboard'
    }
  }

  // Asset status badge colors
  const assetStatusColor = (status) => {
    switch (status) {
      case 'Available': return { bg: '#E3F2FD', text: '#1565C0' }
      case 'Under Repair': return { bg: '#FFF3E0', text: '#E65100' }
      case 'Retired': return { bg: '#F5F5F5', text: '#757575' }
      default: return { bg: '#E8F5E9', text: '#2E7D32' } // Assigned
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: darkMode ? '#121212' : '#f9f9f9', fontFamily: 'Arial, sans-serif', color: darkMode ? '#e0e0e0' : '#333' }}>
      {/* Reassign Modal */}
      {reassignTarget && (
        <ReassignModal
          device={reassignTarget}
          darkMode={darkMode}
          onClose={() => setReassignTarget(null)}
          onSuccess={fetchDevices}
        />
      )}

      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} darkMode={darkMode} />

      {/* Main Content */}
      <div style={{ marginLeft: '250px', flex: 1, padding: '2rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '2rem', color: darkMode ? '#fff' : '#333' }}>{getPageTitle()}</h1>
        </div>

        {loading && <div style={{ color: darkMode ? '#aaa' : '#666' }}>Loading inventory data...</div>}

        {error && (
          <div style={{
            backgroundColor: '#FFEBEE', color: '#B71C1C', padding: '1rem',
            borderRadius: '4px', marginBottom: '1rem', border: '1px solid #FFCDD2'
          }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Dashboard Charts */}
            {activeTab === 'dashboard' && (
              <>
                <DashboardCharts devices={devices} darkMode={darkMode} />
                <h2 style={{ fontSize: '1.2rem', color: darkMode ? '#bbb' : '#555', marginTop: '2rem', marginBottom: '1rem' }}>Recent Activity</h2>
              </>
            )}

            {/* Tab Routing */}
            {activeTab === 'settings' ? (
              <Settings devices={devices} darkMode={darkMode} toggleTheme={toggleTheme} />
            ) : activeTab === 'network-devices' ? (
              <NetworkDevices darkMode={darkMode} />
            ) : activeTab === 'records' ? (
              <Records darkMode={darkMode} />
            ) : (
              <div style={{
                backgroundColor: darkMode ? '#1e1e1e' : 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                display: ['dashboard', 'all', 'desktop', 'laptop'].includes(activeTab) ? 'block' : 'none'
              }}>
                {/* Device Counts Summary */}
                <div style={{
                  padding: '1rem',
                  backgroundColor: darkMode ? '#252525' : '#fff',
                  borderBottom: `1px solid ${darkMode ? '#333' : '#eee'}`,
                  display: 'flex', gap: '2rem',
                  color: darkMode ? '#bbb' : '#666', fontSize: '0.9rem'
                }}>
                  <div><span style={{ fontWeight: 'bold', color: darkMode ? '#fff' : '#333' }}>Total:</span> {filteredDevices.length}</div>
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#4CAF50' }}>Online:</span>{' '}
                    {filteredDevices.filter(d => {
                      const dateStr = d.last_seen.endsWith('Z') ? d.last_seen : d.last_seen + 'Z'
                      return (new Date() - new Date(dateStr)) < 300000
                    }).length}
                  </div>
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#BDBDBD' }}>Offline:</span>{' '}
                    {filteredDevices.filter(d => {
                      const dateStr = d.last_seen.endsWith('Z') ? d.last_seen : d.last_seen + 'Z'
                      return (new Date() - new Date(dateStr)) >= 300000
                    }).length}
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: darkMode ? '#2c2c2c' : '#f5f5f5', borderBottom: `2px solid ${darkMode ? '#444' : '#e0e0e0'}` }}>
                    <tr>
                      {['Hostname', 'User', 'IP / OS', 'Hardware', 'Status', 'Asset Status', 'Last Seen', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '1rem', color: darkMode ? '#aaa' : '#616161', fontSize: '0.85rem', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDevices.map((device) => {
                      const dateStr = device.last_seen.endsWith('Z') ? device.last_seen : device.last_seen + 'Z'
                      const lastSeenDate = new Date(dateStr)
                      const diffMs = new Date() - lastSeenDate
                      const isOnline = diffMs < 60000 * 5
                      const statusColor = isOnline ? '#4CAF50' : '#BDBDBD'
                      const asc = assetStatusColor(device.asset_status)

                      return (
                        <tr key={device.device_id} style={{ borderBottom: `1px solid ${darkMode ? '#333' : '#eee'}` }}>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 'bold', color: darkMode ? '#e0e0e0' : '#424242' }}>{device.hostname}</div>
                            <div style={{ fontSize: '0.8rem', color: '#9e9e9e' }}>{device.system_type || 'Unknown'}</div>
                          </td>
                          <td style={{ padding: '1rem', color: darkMode ? '#bbb' : '#616161' }}>{device.current_user || '—'}</td>
                          <td style={{ padding: '1rem', color: darkMode ? '#bbb' : '#616161' }}>
                            <div>{device.ip_address}</div>
                            <div style={{ fontSize: '0.8rem', color: '#9e9e9e' }}>{device.os_name} {device.os_release}</div>
                          </td>
                          <td style={{ padding: '1rem', color: darkMode ? '#bbb' : '#616161' }}>
                            <div style={{ fontSize: '0.9rem', color: darkMode ? '#ddd' : '#424242' }}>{device.gpu_model || 'No GPU Info'}</div>
                            <div style={{ fontSize: '0.8rem', color: darkMode ? '#888' : '#757575' }}>
                              {device.ram_total_gb ? Math.round(device.ram_total_gb) + 'GB RAM' : '—'} · {device.disk_total_gb ? Math.round(device.disk_total_gb) + 'GB Disk' : '—'}
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              backgroundColor: statusColor, color: 'white',
                              padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold'
                            }}>
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              backgroundColor: darkMode ? '#333' : asc.bg, color: asc.text,
                              padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold'
                            }}>
                              {device.asset_status || 'Assigned'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', color: darkMode ? '#bbb' : '#616161' }}>
                            {lastSeenDate.toLocaleTimeString()}
                            <div style={{ fontSize: '0.8rem', color: '#9e9e9e' }}>{lastSeenDate.toLocaleDateString()}</div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <button
                              onClick={() => setReassignTarget(device)}
                              style={{
                                padding: '4px 12px',
                                backgroundColor: darkMode ? '#2c3e2e' : '#E8F5E9',
                                color: '#2E7D32',
                                border: '1px solid #A5D6A7',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                fontWeight: 'bold'
                              }}
                            >
                              Reassign
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredDevices.length === 0 && (
                      <tr>
                        <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: darkMode ? '#888' : '#9e9e9e' }}>
                          No devices found for this category.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default App
