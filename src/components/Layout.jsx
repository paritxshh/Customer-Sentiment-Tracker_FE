import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, MessageSquare, Users, Mail, Activity, LogOut, Mic, PhoneCall } from 'lucide-react';
import { useState } from 'react';
import { triggerMailScan } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/priority', label: 'Priority Queue', icon: AlertTriangle },
  { to: '/feedback', label: 'Feedback', icon: MessageSquare },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/voice-bot', label: 'Voice Bot', icon: Mic },
  { to: '/call-log', label: 'Call Logs', icon: PhoneCall },
];

export default function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await triggerMailScan(20);
      setScanResult({ ok: true, message: res.message });
    } catch {
      setScanResult({ ok: false, message: 'Scan failed' });
    } finally {
      setScanning(false);
      setTimeout(() => setScanResult(null), 4000);
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-400" />
            <h1 className="text-lg font-bold tracking-tight">Sentinel AI</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">Customer Early Warning System</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800 space-y-2">
          <button
            onClick={handleScan}
            disabled={scanning}
            className={clsx(
              'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              scanning
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            )}
          >
            <Mail className="w-4 h-4" />
            {scanning ? 'Scanning...' : 'Scan Emails'}
          </button>
          {user && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-800/50">
              <span className="text-sm text-gray-400 truncate">{user.username}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
          {scanResult && (
            <p className={clsx('text-xs mt-2 text-center', scanResult.ok ? 'text-emerald-400' : 'text-red-400')}>
              {scanResult.message}
            </p>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
