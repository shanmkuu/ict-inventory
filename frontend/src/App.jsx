import { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react'
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
import DeleteConfirmModal from './components/DeleteConfirmModal'

import ManualEntry from './components/ManualEntry'
import LockdownScreen from './components/LockdownScreen'
import ErrorBoundary from './components/ErrorBoundary'

import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from './context/AuthContext'
import Login from './components/Login'
import UserManagement from './components/UserManagement'

// Use import.meta.glob so Vite doesn't pre-resolve the path at build time.
// This means a missing Footer.jsx won't crash the dev server, but will
// be caught at runtime by our ErrorBoundary -> Lockdown pipeline.
const footerModules = import.meta.glob('./components/Footer.jsx');
const SafeFooter = lazy(() => {
  const importer = footerModules['./components/Footer.jsx'];
  if (!importer) return Promise.reject(new Error('Footer Missing'));
  return importer();
});

// Fallback footer shown when Footer.jsx is missing but user is bypassed.
// This ensures the dev credit link is always visible.
const FallbackFooter = ({ darkMode }) => {
  const yr = new Date().getFullYear();
  const _0x = { gA: () => atob('RW1tYW51ZWwgTGVzaGFu'), gU: () => atob('aHR0cHM6Ly9zaGFubWt1dS52ZXJjZWwuYXBw') };
  return (
    <footer style={{
      marginTop: '2rem', padding: '1rem 0',
      borderTop: `1px solid ${darkMode ? '#222' : '#f0f0f0'}`,
      textAlign: 'center', color: darkMode ? '#555' : '#aaa',
      fontSize: '0.75rem', opacity: 0.8
    }}>
      <p style={{ margin: 0 }}>
        &copy; {yr} All Rights Reserved. Made with love by{' '}
        <a id="dev-credit-link" href={_0x.gU()} target="_blank" rel="noopener noreferrer"
          style={{ color: '#4CAF50', textDecoration: 'none', fontWeight: '500' }}>
          {_0x.gA()}
        </a>
      </p>
    </footer>
  );
};


function App() {
  const { token, user, logout, loading: authLoading } = useContext(AuthContext)
  const location = useLocation()
  const navigate = useNavigate()

  const activeTab = location.pathname === '/' ? 'dashboard' : location.pathname.substring(1)
  const setActiveTab = (tab) => navigate(tab === 'dashboard' ? '/' : `/${tab}`)

  const [devices, setDevices] = useState([])
  const [networkDevices, setNetworkDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Reassign modal state
  const [reassignTarget, setReassignTarget] = useState(null) // device object or null
  // Department modal state
  const [deptTarget, setDeptTarget] = useState(null) // device object or null
  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState(null) // device to confirm delete
  // All Devices filters
  const [deptFilter, setDeptFilter] = useState('All')
  const [conditionFilter, setConditionFilter] = useState('All')

  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

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
    if (!token) return;
    try {
      const response = await fetch('/api/v1/devices?limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch devices')
      const data = await response.json()
      setDevices(data)

      const netResponse = await fetch('/api/v1/network/devices', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (netResponse.ok) {
        const netData = await netResponse.json()
        setNetworkDevices(netData)
      }

      setError(null)
    } catch (err) {
      console.error(err)
      setError('Could not connect to inventory server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      setLoading(true)
      fetchDevices()
      const interval = setInterval(fetchDevices, 30000)
      return () => clearInterval(interval)
    }
  }, [token])

  // We no longer deduplicate here since the backend now merges duplicates by MAC.
  // We want admins to see all actual DB records so they can delete old phantom ones.
  const uniqueDevices = useMemo(() => {
    const knownNetworkDevices = networkDevices.filter(d => (d.device_type || '').toLowerCase() !== 'unknown');
    return [...devices, ...knownNetworkDevices]
  }, [devices, networkDevices])

  // Filtering Logic
  const filteredDevices = useMemo(() => {
    return uniqueDevices.filter(device => {
      if (activeTab === 'dashboard') {
        const dType = (device.system_type || device.device_type || '').toLowerCase();
        const isLaptopOrDesktop = dType === 'laptop' || dType === 'desktop';
        if (!isLaptopOrDesktop) return false;

        // "Recent Activity" -> show devices last seen >= 3 hours ago AND < 24 hours ago, OR currently online (<10 mins)
        const dateStr = device.last_seen.endsWith('Z') || device.last_seen.includes('+') ? device.last_seen : device.last_seen + 'Z';
        const diffMs = Date.now() - new Date(dateStr).getTime();
        return (diffMs >= 10800000 && diffMs < 86400000) || diffMs < 600000; // 3-24 hrs OR < 10 mins (online)
      }
      if (activeTab === 'all') {
        const matchesDept = deptFilter === 'All' || (device.department || '') === deptFilter;
        const matchesCondition = conditionFilter === 'All' || (device.condition || 'Functioning') === conditionFilter;

        const dType = (device.system_type || device.device_type || '').toLowerCase();
        const isLaptopOrDesktop = dType === 'laptop' || dType === 'desktop';

        return matchesDept && matchesCondition && isLaptopOrDesktop;
      }
      if (activeTab === 'desktop') return device.system_type === 'Desktop'
      if (activeTab === 'laptop') return device.system_type === 'Laptop'
      return true
    })
  }, [uniqueDevices, activeTab, deptFilter, conditionFilter])

  // Sorting Logic
  const sortedAndFilteredDevices = useMemo(() => {
    let sortableItems = [...filteredDevices]
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key]
        let bValue = b[sortConfig.key]

        if (sortConfig.key === 'last_seen') {
          const aDateStr = aValue.endsWith('Z') || aValue.includes('+') ? aValue : aValue + 'Z'
          const bDateStr = bValue.endsWith('Z') || bValue.includes('+') ? bValue : bValue + 'Z'
          aValue = new Date(aDateStr).getTime()
          bValue = new Date(bDateStr).getTime()
        } else if (sortConfig.key === 'status') {
          const isOnlineA = (Date.now() - new Date(a.last_seen.endsWith('Z') || a.last_seen.includes('+') ? a.last_seen : a.last_seen + 'Z').getTime()) < 600000
          const isOnlineB = (Date.now() - new Date(b.last_seen.endsWith('Z') || b.last_seen.includes('+') ? b.last_seen : b.last_seen + 'Z').getTime()) < 600000
          aValue = isOnlineA ? 1 : 0
          bValue = isOnlineB ? 1 : 0
        } else if (sortConfig.key === 'hardware') {
          aValue = (a.ram_total_gb || 0) + (a.disk_total_gb || 0)
          bValue = (b.ram_total_gb || 0) + (b.disk_total_gb || 0)
        } else if (sortConfig.key === 'ip_os_mac') {
          aValue = a.ip_address || ''
          bValue = b.ip_address || ''
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase()
          bValue = (bValue || '').toLowerCase()
        }

        if (aValue === undefined || aValue === null) aValue = ''
        if (bValue === undefined || bValue === null) bValue = ''

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }
    return sortableItems
  }, [filteredDevices, sortConfig])

  const requestSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const exportToCSV = () => {
    if (sortedAndFilteredDevices.length === 0) {
      alert('No devices to export.');
      return;
    }

    const headers = [
      'Hostname', 'Owner', 'Department', 'IP Address', 'OS', 'MAC',
      'System Type', 'Hardware', 'Condition', 'Asset Status', 'Last Seen'
    ];

    const rows = sortedAndFilteredDevices.map(d => {
      const hdwr = [
        d.gpu_model || '',
        d.ram_total_gb ? Math.round(d.ram_total_gb) + 'GB RAM' : '',
        d.disk_total_gb ? Math.round(d.disk_total_gb) + 'GB Disk' : ''
      ].filter(Boolean).join(' | ');

      const dateStr = d.last_seen.endsWith('Z') || d.last_seen.includes('+') ? d.last_seen : d.last_seen + 'Z';
      const lastSeenFormatted = new Date(dateStr).toLocaleString();

      return [
        `"${d.hostname || ''}"`,
        `"${d.current_user || ''}"`,
        `"${d.department || ''}"`,
        `"${d.ip_address || ''}"`,
        `"${d.os_name || ''} ${d.os_release || ''}"`,
        `"${d.mac_address || ''}"`,
        `"${d.system_type || d.device_type || ''}"`,
        `"${hdwr}"`,
        `"${d.condition || 'Functioning'}"`,
        `"${d.asset_status || 'Assigned'}"`,
        `"${lastSeenFormatted}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const today = new Date().toISOString().slice(0, 10);
    link.download = `ict_inventory_export_${today}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Unique departments for filter dropdown (All Devices tab)
  const uniqueDepartments = useMemo(() => {
    const depts = new Set()
    uniqueDevices.forEach(d => { if (d.department) depts.add(d.department) })
    return ['All', ...Array.from(depts).sort()]
  }, [uniqueDevices])

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Overview'
      case 'all': return 'All Devices'
      case 'departments': return 'Departments'
      case 'desktop': return 'System Units (Desktops)'
      case 'laptop': return 'Laptops'
      case 'network-devices': return 'Network Devices'
      case 'manual-entry': return 'Add Device (Manual Entry)'
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

  // Condition badge colors
  const conditionColor = (condition) => {
    switch (condition) {
      case 'Faulty': return { bg: '#FFEBEE', text: '#C62828' }
      case 'Decommissioned': return { bg: '#F5F5F5', text: '#757575' }
      default: return { bg: '#E8F5E9', text: '#2E7D32' } // Functioning
    }
  }

  // Ultra-Hardened Security State
  const [isSecurityValid, setIsSecurityValid] = useState(true);
  const [isCriticalMissing, setIsCriticalMissing] = useState(false);
  const [isSecurityBooted, setIsSecurityBooted] = useState(false);
  const [isBypassed, setIsBypassed] = useState(() => {
    return sessionStorage.getItem('security_bypass') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState(false);
  const [securityEngine, setSecurityEngine] = useState(null);
  const lastPulse = useRef(Date.now());
  const hasReceivedFirstPulse = useRef(false);

  // Gated Startup: Load Security Core Dynamically
  useEffect(() => {
    const bootSecurity = async () => {
      try {
        // 1. Check Security Core
        const core = await import('./utils/system-integrity');
        setSecurityEngine(core);

        // 2. Check Footer Existence (Critical for Pulse system)
        // Use the glob map — if the key doesn't exist, the file is missing
        if (!footerModules['./components/Footer.jsx']) {
          throw new Error('Footer Missing');
        }

        // 3. Initial integrity check
        if (!core.validateSystemIntegrity(core._0xsystem.gA(), core._0xsystem.gU())) {
          throw new Error('Integrity Failed');
        }

        setIsSecurityBooted(true);
      } catch (e) {
        console.error('Security Breach: Core modules missing or tampered', e);
        if (e.message.includes('Missing')) {
          setIsCriticalMissing(true);
          setIsBypassed(false); // Force re-authorization on critical module failure
          sessionStorage.removeItem('security_bypass');
        }
        setIsSecurityValid(false);
        setIsSecurityBooted(true); // Allow showing lockdown screen
      }
    };
    bootSecurity();
  }, []);

  // Heartbeat & Global Module Integrity monitoring
  useEffect(() => {
    if (!isSecurityBooted || !securityEngine) return;

    const { _0xsystem, validateSystemIntegrity, verifyPulse } = securityEngine;

    // 1. Periodic Module Integrity Check + Auto-Recovery
    const runCheck = () => {
      try {
        const isValid = validateSystemIntegrity(_0xsystem.gA(), _0xsystem.gU());
        if (!isValid) throw new Error();
        // ✅ Credentials restored — auto-recover
        setIsSecurityValid(true);
      } catch (e) {
        setTimeout(() => {
          setIsSecurityValid(false);
          setIsBypassed(false); // Revoke authorization on integrity failure
          sessionStorage.removeItem('security_bypass');
        }, Math.random() * 3000);
      }
    };
    const checkInterval = setInterval(runCheck, 8000);

    // 2. Heartbeat Receiver + Footer Auto-Recovery
    const handlePulse = (e) => {
      const { pulse } = e.detail;
      if (verifyPulse(pulse)) {
        lastPulse.current = Date.now();
        hasReceivedFirstPulse.current = true; // ← mark that Footer is alive
        // ✅ Footer is back and sending valid pulses — auto-recover
        setIsSecurityValid(true);
        setIsCriticalMissing(false); // Clear hard lockdown flag
      }
    };
    window.addEventListener('system-pulse', handlePulse);

    const watchdog = setInterval(() => {
      // Only trigger lockdown AFTER we've confirmed Footer was alive at least once.
      // This prevents false lockdowns on a normal page refresh / slow boot.
      if (!hasReceivedFirstPulse.current) return;
      if (Date.now() - lastPulse.current > 12000) {
        // Pulse stopped AFTER first contact — genuine tampering detected
        setIsSecurityValid((prev) => {
          if (prev === true) {
            setIsBypassed(false);
            sessionStorage.removeItem('security_bypass');
          }
          return false;
        });
      }
    }, 5000);

    // 3. Global DOM Sentinel
    // Only active after the Footer has proven it's alive (hasReceivedFirstPulse).
    // Before that, a missing link just means the Footer hasn't rendered yet — not tampering.
    const sentinel = new MutationObserver(() => {
      if (!hasReceivedFirstPulse.current) return; // Boot grace — ignore pre-render state
      const link = document.getElementById('dev-credit-link');
      if (!link) {
        setIsSecurityValid(false);
      } else {
        const style = window.getComputedStyle(link);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          setIsSecurityValid(false);
        }
      }
    });
    sentinel.observe(document.body, { childList: true, subtree: true, attributes: true });

    // 4. Central Tamper Listener
    const handleTamper = () => setTimeout(() => setIsSecurityValid(false), Math.random() * 2000);
    window.addEventListener('security-tamper', handleTamper);

    return () => {
      clearInterval(checkInterval);
      clearInterval(watchdog);
      window.removeEventListener('system-pulse', handlePulse);
      window.removeEventListener('security-tamper', handleTamper);
      sentinel.disconnect();
    };
  }, [isSecurityBooted, securityEngine, isBypassed]);

  const handleUnlock = () => {
    if (securityEngine?.authorizeBypass(passwordInput)) {
      setIsBypassed(true);
      sessionStorage.setItem('security_bypass', 'true');
      setUnlockError(false);
      lastPulse.current = Date.now(); // Reset watchdog
    } else {
      setUnlockError(true);
      setTimeout(() => setUnlockError(false), 2000);
    }
    setPasswordInput('');
  };

  if (!isSecurityBooted || authLoading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#121212', color: '#4CAF50'
      }}>
        Loading Security Core...
      </div>
    );
  }

  if (!token) {
    return <Login darkMode={darkMode} />
  }

  const isLockdownActive = !isSecurityValid && !isBypassed;

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      backgroundColor: darkMode ? '#121212' : '#f9f9f9',
      fontFamily: 'Arial, sans-serif', color: darkMode ? '#e0e0e0' : '#333'
    }}>

      {/* 
      */}
      <div style={{ display: 'none' }}>
        <ErrorBoundary
          fallback={null}
          onCatch={() => setIsSecurityValid(false)}
        >
          <Suspense fallback={null}>
            <SafeFooter darkMode={darkMode} isBypassed={isBypassed} />
          </Suspense>
        </ErrorBoundary>
      </div>

      {isLockdownActive ? (
        <LockdownScreen
          passwordInput={passwordInput}
          setPasswordInput={setPasswordInput}
          onUnlock={handleUnlock}
          unlockError={unlockError}
          isHardLockdown={isCriticalMissing}
        />
      ) : (
        <>
          {/* Modals & Overlays */}
          {reassignTarget && (
            <ReassignModal
              device={reassignTarget}
              darkMode={darkMode}
              onClose={() => setReassignTarget(null)}
              onSuccess={fetchDevices}
            />
          )}

          {deptTarget && (
            <SetDepartmentModal
              device={deptTarget}
              darkMode={darkMode}
              onClose={() => setDeptTarget(null)}
              onSuccess={fetchDevices}
            />
          )}

          {deleteTarget && (
            <DeleteConfirmModal
              device={deleteTarget}
              darkMode={darkMode}
              onCancel={() => setDeleteTarget(null)}
              onConfirm={async () => {
                const device = deleteTarget
                setDeleteTarget(null)
                try {
                  const res = await fetch(`/api/v1/devices/${device.device_id}?admin=admin`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                  })
                  if (res.ok || res.status === 204) {
                    fetchDevices()
                  } else {
                    alert('Delete failed: ' + (await res.text()))
                  }
                } catch (e) {
                  alert('Delete failed: ' + e.message)
                }
              }}
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
                    <DashboardCharts devices={devices} networkDevices={networkDevices} darkMode={darkMode} />
                    <h2 style={{ fontSize: '1.2rem', color: darkMode ? '#bbb' : '#555', marginTop: '2rem', marginBottom: '1rem' }}>Recent Activity</h2>
                  </>
                )}

                {/* Tab Routing */}
                {activeTab === 'users' ? (
                  <UserManagement darkMode={darkMode} />
                ) : activeTab === 'settings' ? (
                  <Settings devices={devices} darkMode={darkMode} toggleTheme={toggleTheme} />
                ) : activeTab === 'manual-entry' ? (
                  <ManualEntry darkMode={darkMode} onSuccess={() => { fetchDevices(); setActiveTab('all'); }} />
                ) : activeTab === 'network-devices' ? (
                  <NetworkDevices darkMode={darkMode} />
                ) : activeTab === 'records' ? (
                  <Records darkMode={darkMode} />
                ) : activeTab === 'departments' ? (
                  <Departments
                    devices={uniqueDevices.filter(d => {
                      const dType = (d.system_type || d.device_type || '').toLowerCase();
                      return dType === 'laptop' || dType === 'desktop';
                    })}
                    darkMode={darkMode}
                  />
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
                        <span style={{ fontSize: '0.85rem', color: darkMode ? '#aaa' : '#666', fontWeight: 'bold', marginLeft: '0.5rem' }}>Condition:</span>
                        <select
                          value={conditionFilter}
                          onChange={e => setConditionFilter(e.target.value)}
                          style={{
                            padding: '5px 10px', borderRadius: '6px',
                            border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
                            backgroundColor: darkMode ? '#2c2c2c' : '#fff',
                            color: darkMode ? '#e0e0e0' : '#333',
                            fontSize: '0.875rem', cursor: 'pointer', outline: 'none'
                          }}
                        >
                          <option value="All">All Conditions</option>
                          <option value="Functioning">Functioning</option>
                          <option value="Faulty">Faulty</option>
                          <option value="Decommissioned">Decommissioned</option>
                        </select>
                        {(deptFilter !== 'All' || conditionFilter !== 'All') && (
                          <button
                            onClick={() => { setDeptFilter('All'); setConditionFilter('All'); }}
                            style={{
                              padding: '4px 10px', borderRadius: '6px', border: 'none',
                              backgroundColor: darkMode ? '#333' : '#eee',
                              color: darkMode ? '#ccc' : '#666',
                              cursor: 'pointer', fontSize: '0.8rem', marginLeft: '0.5rem'
                            }}
                          >Clear</button>
                        )}
                        <span style={{ fontSize: '0.8rem', color: darkMode ? '#666' : '#aaa', marginLeft: 'auto' }}>
                          {sortedAndFilteredDevices.length} device{sortedAndFilteredDevices.length !== 1 ? 's' : ''}
                        </span>
                        <button
                          onClick={exportToCSV}
                          title="Export all currently filtered devices to a CSV file"
                          style={{
                            padding: '6px 12px', borderRadius: '6px', border: 'none',
                            backgroundColor: darkMode ? '#2c3e2e' : '#E8F5E9',
                            color: '#4CAF50', fontWeight: 'bold',
                            cursor: 'pointer', fontSize: '0.85rem', marginLeft: '0.75rem',
                            display: 'flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          ⬇ Export CSV
                        </button>
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
                      <div><span style={{ fontWeight: 'bold', color: darkMode ? '#fff' : '#333' }}>Total:</span> {sortedAndFilteredDevices.length}</div>
                      <div>
                        <span style={{ fontWeight: 'bold', color: '#4CAF50' }}>Online:</span>{' '}
                        {sortedAndFilteredDevices.filter(d => {
                          const dateStr = d.last_seen.endsWith('Z') || d.last_seen.includes('+') ? d.last_seen : d.last_seen + 'Z'
                          return (new Date() - new Date(dateStr)) < 600000  // 10 min threshold
                        }).length}
                      </div>
                      <div>
                        <span style={{ fontWeight: 'bold', color: '#BDBDBD' }}>Offline:</span>{' '}
                        {sortedAndFilteredDevices.filter(d => {
                          const dateStr = d.last_seen.endsWith('Z') || d.last_seen.includes('+') ? d.last_seen : d.last_seen + 'Z'
                          return (new Date() - new Date(dateStr)) >= 600000
                        }).length}
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: darkMode ? '#2c2c2c' : '#f5f5f5', borderBottom: `2px solid ${darkMode ? '#444' : '#e0e0e0'}` }}>
                          <tr>
                            {[
                              { key: 'hostname', label: 'Hostname' },
                              { key: 'current_user', label: 'Owner' },
                              { key: 'department', label: 'Department' },
                              { key: 'ip_os_mac', label: 'IP / OS / MAC' },
                              { key: 'hardware', label: 'Hardware' },
                              { key: 'status', label: 'Status' },
                              { key: 'condition', label: 'Condition' },
                              { key: 'asset_status', label: 'Asset Status' },
                              { key: 'last_seen', label: 'Last Seen' },
                              { key: 'actions', label: 'Actions' }
                            ].map(col => (
                              <th
                                key={col.key}
                                onClick={() => col.key !== 'actions' ? requestSort(col.key) : null}
                                style={{
                                  padding: '1rem',
                                  color: darkMode ? '#aaa' : '#616161',
                                  fontSize: '0.85rem',
                                  textTransform: 'uppercase',
                                  whiteSpace: 'nowrap',
                                  cursor: col.key !== 'actions' ? 'pointer' : 'default',
                                  userSelect: 'none'
                                }}
                              >
                                {col.label}
                                {sortConfig.key === col.key && (
                                  <span style={{ marginLeft: '4px' }}>
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedAndFilteredDevices.map((device) => {
                            const dateStr = device.last_seen.endsWith('Z') || device.last_seen.includes('+') ? device.last_seen : device.last_seen + 'Z'
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
                                    backgroundColor: darkMode ? '#333' : conditionColor(device.condition || 'Functioning').bg,
                                    color: conditionColor(device.condition || 'Functioning').text,
                                    padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold'
                                  }}>
                                    {device.condition || 'Functioning'}
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
                                  {user?.role === 'Admin' && (
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
                                      {(activeTab === 'dashboard' || activeTab === 'all') && (
                                        <button
                                          onClick={() => setDeptTarget(device)}
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
                                          Edit Info
                                        </button>
                                      )}
                                      {activeTab === 'all' && (
                                        <button
                                          onClick={() => setDeleteTarget(device)}
                                          title="Permanently delete this device (use for duplicates / phantom entries)"
                                          style={{
                                            padding: '4px 10px',
                                            backgroundColor: darkMode ? '#3a1a1a' : '#FFEBEE',
                                            color: '#C62828',
                                            border: '1px solid #EF9A9A',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.78rem',
                                            fontWeight: 'bold'
                                          }}
                                        >
                                          🗑 Delete
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                          {sortedAndFilteredDevices.length === 0 && (
                            <tr>
                              <td colSpan="10" style={{ padding: '2rem', textAlign: 'center', color: darkMode ? '#888' : '#9e9e9e' }}>
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
            {['dashboard', 'settings'].includes(activeTab) && (
              isCriticalMissing && isBypassed
                ? <FallbackFooter darkMode={darkMode} />
                : (
                  <ErrorBoundary
                    fallback={null}
                    onCatch={() => setIsSecurityValid(false)}
                  >
                    <Suspense fallback={null}>
                      <SafeFooter darkMode={darkMode} isBypassed={isBypassed} />
                    </Suspense>
                  </ErrorBoundary>
                )
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App
