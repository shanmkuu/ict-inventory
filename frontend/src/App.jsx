import { useState, useEffect } from 'react'

const DeviceCard = ({ device }) => {
  return (
    <div className="device-card">
      <div className="device-header">
        <div>
          <h3 className="device-hostname">{device.hostname}</h3>
          <span className="device-ip">{device.ip_address}</span>
        </div>
        <div className={`status-badge status-${device.status || 'unknown'}`}>
          <div className="status-dot"></div>
          {device.status || 'Unknown'}
        </div>
      </div>

      <div className="device-details">
        <div className="detail-item">
          <span className="detail-label">Type</span>
          <span className="detail-value">{device.system_type || 'PC'}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">OS</span>
          <span className="detail-value" title={`${device.os_name} ${device.os_version}`}>
            {device.os_name} {device.os_release}
          </span>
        </div>
        <div className="detail-item col-span-2">
          <span className="detail-label">CPU</span>
          <span className="detail-value" title={device.cpu_model}>
            {device.cpu_model || 'Unknown'}
          </span>
        </div>
        <div className="detail-item col-span-2">
          <span className="detail-label">GPU</span>
          <span className="detail-value" title={device.gpu_model}>
            {device.gpu_model || 'N/A'}
          </span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Memory</span>
          <span className="detail-value">{device.ram_total_gb?.toFixed(1)} GB</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Disk</span>
          <span className="detail-value">{device.disk_total_gb?.toFixed(0)} GB</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">User</span>
          <span className="detail-value">{device.current_user}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Last Seen</span>
          <span className="detail-value">
            {new Date(device.last_seen || Date.now()).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDevices = async () => {
    try {
      const response = await fetch('http://10.10.6.56:8000/api/v1/devices')
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
    const interval = setInterval(fetchDevices, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="app-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">ICT Inventory</h1>
        <div className="stats" style={{ display: 'flex', gap: '2rem' }}>
          <div className="stat">
            <span style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }}>Total</span>
            <span style={{ fontWeight: 'bold' }}>{devices.length}</span>
          </div>
          <div className="stat">
            <span style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }}>Online</span>
            <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>
              {devices.filter(d => d.status === 'online').length}
            </span>
          </div>
        </div>
      </div>

      {loading && devices.length === 0 ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : error ? (
        <div style={{ padding: '2rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: '8px' }}>
          {error}
        </div>
      ) : (
        <div className="device-grid">
          {devices.map(device => (
            <DeviceCard key={device.device_id} device={device} />
          ))}
        </div>
      )}

      <footer>
        System v1.0 • Realtime Monitoring Active
      </footer>
    </div>
  )
}

export default App
