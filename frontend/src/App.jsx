import { useState, useEffect, useMemo } from 'react'
import logo from './assets/ict_inventory_bg.png'
import './App.css'
import Sidebar from './components/Sidebar'
import DashboardCharts from './components/DashboardCharts'
import Settings from './components/Settings'
import NetworkDevices from './components/NetworkDevices'
import Records from './components/Records'
import ReassignModal from './components/ReassignModal'
import SetDepartmentModal from './components/SetDepartmentModal'
import Departments from './components/Departments'
import Footer from './components/Footer'

function App() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Reassign modal state
  const [reassignTarget, setReassignTarget] = useState(null) // device object or null
  // Department modal state
  const [deptTarget, setDeptTarget] = useState(null) // device object or null
  // All Devices dept filter
  const [deptFilter, setDeptFilter] = useState('All')

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
      if (activeTab === 'dashboard' || activeTab === 'all') {
        if (activeTab === 'all' && deptFilter !== 'All') {
          return (device.department || '') === deptFilter
        }
        return true
      }
      if (activeTab === 'desktop') return device.system_type === 'Desktop'
      if (activeTab === 'laptop') return device.system_type === 'Laptop'
      return true
    })
  }, [uniqueDevices, activeTab, deptFilter])

  // Unique departments for filter dropdown (All Devices tab)
  const uniqueDepartments = useMemo(() => {
    const depts = new Set()
    uniqueDevices.forEach(d => { if (d.department) depts.add(d.department) })
    return ['All', ...Array.from(depts).sort()]
  }, [uniqueDevices])

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'System Units Overview'
      case 'all': return 'All Devices'
      case 'departments': return 'Departments'
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

      {/* Set Department Modal */}
      {deptTarget && (
        <SetDepartmentModal
          device={deptTarget}
          darkMode={darkMode}
          onClose={() => setDeptTarget(null)}
          onSuccess={fetchDevices}
        />
      )}

      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} darkMode={darkMode} />

      {/* Main Content */}
      <div style={{
        marginLeft: '250px',
        width: 'calc(100% - 250px)',
        minHeight: '100vh',
        padding: '2rem',
        boxSizing: 'border-box',
        position: 'relative'
      }}>
        {/* Background Logo Decoration */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: '250px',
          right: 0,
          bottom: 0,
          backgroundImage: `url(${logo})`,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '60%',
          opacity: darkMode ? 0.03 : 0.02,
          pointerEvents: 'none',
          zIndex: 0
        }} />

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
            ) : activeTab === 'departments' ? (
              <Departments devices={uniqueDevices} darkMode={darkMode} />
            ) : (
              <div style={{
                backgroundColor: darkMode ? '#1e1e1e' : 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                display: ['dashboard', 'all', 'desktop', 'laptop'].includes(activeTab) ? 'block' : 'none'
              }}>
                {/* Department filter bar — All Devices tab only */}
                {activeTab === 'all' && (
                  <div style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: darkMode ? '#252525' : '#fafafa',
                    borderBottom: `1px solid ${darkMode ? '#333' : '#eee'}`,
                    display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap'
                  }}>
                    <span style={{ fontSize: '0.85rem', color: darkMode ? '#aaa' : '#666', fontWeight: 'bold' }}>Department:</span>
                    <select
                      value={deptFilter}
                      onChange={e => setDeptFilter(e.target.value)}
                      style={{
                        padding: '5px 10px', borderRadius: '6px',
                        border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
                        backgroundColor: darkMode ? '#2c2c2c' : '#fff',
                        color: darkMode ? '#e0e0e0' : '#333',
                        fontSize: '0.875rem', cursor: 'pointer', outline: 'none'
                      }}
                    >
                      {uniqueDepartments.map(d => (
                        <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
                      ))}
                    </select>
                    {deptFilter !== 'All' && (
                      <button
                        onClick={() => setDeptFilter('All')}
                        style={{
                          padding: '4px 10px', borderRadius: '6px', border: 'none',
                          backgroundColor: darkMode ? '#333' : '#eee',
                          color: darkMode ? '#ccc' : '#666',
                          cursor: 'pointer', fontSize: '0.8rem'
                        }}
                      >Clear</button>
                    )}
                    <span style={{ fontSize: '0.8rem', color: darkMode ? '#666' : '#aaa', marginLeft: 'auto' }}>
                      {filteredDevices.length} device{filteredDevices.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
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
                      return (new Date() - new Date(dateStr)) < 600000  // 10 min threshold
                    }).length}
                  </div>
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#BDBDBD' }}>Offline:</span>{' '}
                    {filteredDevices.filter(d => {
                      const dateStr = d.last_seen.endsWith('Z') ? d.last_seen : d.last_seen + 'Z'
                      return (new Date() - new Date(dateStr)) >= 600000
                    }).length}
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: darkMode ? '#2c2c2c' : '#f5f5f5', borderBottom: `2px solid ${darkMode ? '#444' : '#e0e0e0'}` }}>
                      <tr>
                        {['Hostname', 'User', 'Department', 'IP / OS / MAC', 'Hardware', 'Status', 'Asset Status', 'Last Seen', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '1rem', color: darkMode ? '#aaa' : '#616161', fontSize: '0.85rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDevices.map((device) => {
                        const dateStr = device.last_seen.endsWith('Z') ? device.last_seen : device.last_seen + 'Z'
                        const lastSeenDate = new Date(dateStr)
                        const diffMs = new Date() - lastSeenDate
                        const isOnline = diffMs < 600000  // 10 min threshold
                        const statusColor = isOnline ? '#4CAF50' : '#BDBDBD'
                        const asc = assetStatusColor(device.asset_status)

                        return (
                          <tr key={device.device_id} style={{ borderBottom: `1px solid ${darkMode ? '#333' : '#eee'}` }}>
                            <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 'bold', color: darkMode ? '#e0e0e0' : '#424242' }}>{device.hostname}</div>
                              <div style={{ fontSize: '0.8rem', color: '#9e9e9e' }}>{device.system_type || 'Unknown'}</div>
                            </td>
                            <td style={{ padding: '1rem', color: darkMode ? '#bbb' : '#616161', whiteSpace: 'nowrap' }}>{device.current_user || '—'}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              {device.department ? (
                                <span style={{
                                  backgroundColor: darkMode ? '#1a2a3a' : '#E3F2FD',
                                  color: '#1976D2',
                                  padding: '3px 8px', borderRadius: '10px',
                                  fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap'
                                }}>
                                  {device.department}
                                </span>
                              ) : (
                                <span style={{ color: darkMode ? '#555' : '#bbb', fontSize: '0.85rem' }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '1rem', color: darkMode ? '#bbb' : '#616161', whiteSpace: 'nowrap' }}>
                              <div>{device.ip_address}</div>
                              <div style={{ fontSize: '0.8rem', color: '#9e9e9e' }}>{device.os_name} {device.os_release}</div>
                              {device.mac_address && (
                                <div style={{ fontSize: '0.75rem', color: darkMode ? '#666' : '#bdbdbd', fontFamily: 'monospace', marginTop: '2px' }}>
                                  {device.mac_address}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '1rem', color: darkMode ? '#bbb' : '#616161', whiteSpace: 'nowrap' }}>
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
                            <td style={{ padding: '1rem', color: darkMode ? '#bbb' : '#616161', whiteSpace: 'nowrap' }}>
                              {lastSeenDate.toLocaleTimeString()}
                              <div style={{ fontSize: '0.8rem', color: '#9e9e9e' }}>{lastSeenDate.toLocaleDateString()}</div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', minWidth: '150px' }}>
                                <button
                                  onClick={() => setReassignTarget(device)}
                                  style={{
                                    padding: '4px 10px',
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
                                {activeTab === 'dashboard' && (
                                  <button
                                    onClick={() => setDeptTarget(device)} // Added Edit Dept button
                                    style={{
                                      padding: '4px 10px',
                                      backgroundColor: darkMode ? '#1a2a3a' : '#E3F2FD',
                                      color: '#1976D2',
                                      border: '1px solid #90CAF9',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '0.78rem',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    Edit Dept
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {filteredDevices.length === 0 && (
                        <tr>
                          <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: darkMode ? '#888' : '#9e9e9e' }}>
                            No devices found for this category.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
        {['dashboard', 'settings'].includes(activeTab) && <Footer darkMode={darkMode} />}
      </div>
    </div>
  )
}

export default App
