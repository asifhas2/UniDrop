import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Monitor, Activity, ShieldCheck, Settings, FileText, Plus, Trash2,
  Power, LogOut, CheckCircle2, AlertTriangle, RefreshCw, HardDrive, Lock
} from 'lucide-react';
import { api } from '../services/api.js';

export const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [labComputers, setLabComputers] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComputer, setNewComputer] = useState({ computerId: '', name: '', room: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('unidrop_admin_token');
    if (!token) {
      navigate('/admin');
      return;
    }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashRes, labsRes, sessionsRes, logsRes, settingsRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/lab-computers'),
        api.get('/admin/sessions'),
        api.get('/admin/audit-logs'),
        api.get('/admin/settings'),
      ]);

      setStats(dashRes.data.data);
      setLabComputers(labsRes.data.data);
      setActiveSessions(sessionsRes.data.data);
      setAuditLogs(logsRes.data.data.logs || []);
      setSettings(settingsRes.data.data);
    } catch (err) {
      if (err.code === 'UNAUTHORIZED' || err.code === 'TOKEN_INVALID') {
        localStorage.removeItem('unidrop_admin_token');
        navigate('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddComputer = async (e) => {
    e.preventDefault();
    if (!newComputer.computerId || !newComputer.name || !newComputer.room) return;
    try {
      await api.post('/admin/lab-computers', newComputer);
      setNewComputer({ computerId: '', name: '', room: '' });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to add lab computer');
    }
  };

  const handleDeleteComputer = async (id) => {
    if (window.confirm(`Delete lab workstation ${id}?`)) {
      try {
        await api.delete(`/admin/lab-computers/${id}`);
        loadData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleEndSession = async (id) => {
    if (window.confirm(`Force terminate session ${id}?`)) {
      try {
        await api.post(`/admin/sessions/${id}/end`);
        loadData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('unidrop_admin_token');
    navigate('/');
  };

  if (loading && !stats) {
    return (
      <div className="py-20 flex justify-center items-center text-slate-400 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span>Loading Admin Console...</span>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 max-w-7xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">University Lab Admin Console</h1>
            <p className="text-xs text-slate-400">Campus IT & Laboratory Governance Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium border border-rose-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'workstations', label: 'Workstations', icon: Monitor },
          { id: 'sessions', label: 'Active Sessions', icon: HardDrive },
          { id: 'audits', label: 'Security Audits', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Lab Computers</span>
              <div className="text-2xl font-bold text-white mt-1">{stats.labComputers.total}</div>
              <div className="text-[11px] text-emerald-400 mt-1">
                {stats.labComputers.available} Available • {stats.labComputers.busy} Busy
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Active Sessions</span>
              <div className="text-2xl font-bold text-white mt-1">{stats.sessions.active}</div>
              <div className="text-[11px] text-blue-400 mt-1">Temporary ephemeral rooms</div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Total Transfers</span>
              <div className="text-2xl font-bold text-white mt-1">{stats.transfers.total}</div>
              <div className="text-[11px] text-emerald-400 mt-1">
                {stats.transfers.completed} Successful
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Relay Storage Buffer</span>
              <div className="text-2xl font-bold text-white mt-1">
                {(stats.storage.tempUsageBytes / 1024).toFixed(1)} KB
              </div>
              <div className="text-[11px] text-cyan-400 mt-1">Auto-shreds on delivery</div>
            </div>
          </div>

          {/* Recent Security Audits Table */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Recent Security Events</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 font-semibold">Event</th>
                    <th className="pb-3 font-semibold">Severity</th>
                    <th className="pb-3 font-semibold">Actor</th>
                    <th className="pb-3 font-semibold">IP Hash</th>
                    <th className="pb-3 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {stats.recentAudits.map((audit) => (
                    <tr key={audit._id}>
                      <td className="py-3 font-mono font-semibold text-blue-300">{audit.eventType}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          audit.severity === 'critical' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          audit.severity === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {audit.severity}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">{audit.actorId}</td>
                      <td className="py-3 font-mono text-slate-500">{audit.ipAddressHash}</td>
                      <td className="py-3 text-slate-400">{new Date(audit.timestamp).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Workstations Management */}
      {activeTab === 'workstations' && (
        <div className="space-y-6">
          <form onSubmit={handleAddComputer} className="glass-panel p-5 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Computer ID (e.g. LAB-02)"
              value={newComputer.computerId}
              onChange={(e) => setNewComputer({ ...newComputer, computerId: e.target.value.toUpperCase() })}
              required
              className="bg-slate-900 border border-slate-700 text-white text-xs px-3 py-2.5 rounded-xl focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Display Name"
              value={newComputer.name}
              onChange={(e) => setNewComputer({ ...newComputer, name: e.target.value })}
              required
              className="bg-slate-900 border border-slate-700 text-white text-xs px-3 py-2.5 rounded-xl focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Lab / Room Name"
              value={newComputer.room}
              onChange={(e) => setNewComputer({ ...newComputer, room: e.target.value })}
              required
              className="bg-slate-900 border border-slate-700 text-white text-xs px-3 py-2.5 rounded-xl focus:border-blue-500"
            />
            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Workstation</span>
            </button>
          </form>

          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-4 font-semibold">ID</th>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Room</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {labComputers.map((pc) => (
                  <tr key={pc._id} className="hover:bg-slate-800/20">
                    <td className="p-4 font-mono font-bold text-blue-400">{pc.computerId}</td>
                    <td className="p-4">{pc.name}</td>
                    <td className="p-4 text-slate-400">{pc.room}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        pc.status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        pc.status === 'busy' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {pc.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteComputer(pc.computerId)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Active Sessions */}
      {activeTab === 'sessions' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4 font-semibold">Session ID</th>
                <th className="p-4 font-semibold">Workstation</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Peers</th>
                <th className="p-4 font-semibold">Expires At</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {activeSessions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    No active sessions currently running.
                  </td>
                </tr>
              ) : (
                activeSessions.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-800/20">
                    <td className="p-4 font-mono text-slate-300">{s.sessionId.substring(0, 8)}...</td>
                    <td className="p-4 font-semibold text-blue-400">{s.labComputerId || 'Custom Host'}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {s.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{s.connectedDeviceIds?.length || 0}</td>
                    <td className="p-4 text-slate-400">{new Date(s.expiresAt).toLocaleTimeString()}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleEndSession(s.sessionId)}
                        className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] font-semibold transition-colors"
                      >
                        Force End
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Security Audits */}
      {activeTab === 'audits' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4 font-semibold">Event</th>
                <th className="p-4 font-semibold">Severity</th>
                <th className="p-4 font-semibold">Actor</th>
                <th className="p-4 font-semibold">IP Hash</th>
                <th className="p-4 font-semibold">Details</th>
                <th className="p-4 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {auditLogs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-800/20">
                  <td className="p-4 font-mono font-semibold text-blue-300">{log.eventType}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      log.severity === 'critical' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      log.severity === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">{log.actorId}</td>
                  <td className="p-4 font-mono text-slate-500">{log.ipAddressHash}</td>
                  <td className="p-4 text-slate-400 font-mono text-[11px] truncate max-w-xs">
                    {JSON.stringify(log.details)}
                  </td>
                  <td className="p-4 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
