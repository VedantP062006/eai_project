import React, { useState, useEffect } from 'react';
import { History, Search, Trash2, Download, RefreshCw, Filter, ShieldCheck, AlertCircle } from 'lucide-react';

export const HistoryPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResult, setFilterResult] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/command_history?limit=200');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to load command history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  const clearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all command history logs from the SQLite database?')) {
      return;
    }
    try {
      await fetch('http://localhost:8000/api/command_history', { method: 'DELETE' });
      setLogs([]);
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  const exportCSV = () => {
    if (!logs.length) return;
    const headers = ['ID', 'Timestamp', 'Gesture', 'Command', 'Confidence', 'Result', 'Source', 'Notes'];
    const rows = logs.map((l) => [
      l.id,
      l.timestamp,
      l.gesture,
      l.command,
      l.confidence,
      l.execution_result,
      l.source,
      `"${l.notes || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aura_vehicle_command_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.command.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.gesture.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesResult = filterResult === 'ALL' || log.execution_result === filterResult;
    const matchesSource = filterSource === 'ALL' || log.source === filterSource;

    return matchesSearch && matchesResult && matchesSource;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-hud)', fontSize: '1.4rem', color: '#fff', letterSpacing: '0.04em' }}>
            COMMAND <span style={{ color: 'var(--accent-cyan)' }}>HISTORY & AUDIT</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Persistent SQLite database log of recognized hand gestures, safety gates, and vehicle operations
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchHistory} className="btn-secondary" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            REFRESH
          </button>
          <button onClick={exportCSV} className="btn-secondary">
            <Download size={16} />
            EXPORT CSV
          </button>
          <button
            onClick={clearHistory}
            className="btn-secondary"
            style={{ color: '#ff3366', borderColor: 'rgba(255, 51, 102, 0.4)' }}
          >
            <Trash2 size={16} />
            CLEAR ALL
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by command, gesture name, or notes..."
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Filter Result */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} color="var(--text-muted)" />
          <select
            value={filterResult}
            onChange={(e) => setFilterResult(e.target.value)}
            style={{
              padding: '10px 14px',
              background: '#0e1628',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: '#fff',
              fontSize: '0.85rem',
            }}
          >
            <option value="ALL">All Results</option>
            <option value="SUCCESS">Success Only</option>
            <option value="SAFETY_BLOCKED">Safety Blocked</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Filter Source */}
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          style={{
            padding: '10px 14px',
            background: '#0e1628',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            color: '#fff',
            fontSize: '0.85rem',
          }}
        >
          <option value="ALL">All Sources</option>
          <option value="GESTURE">Gesture Only</option>
          <option value="MANUAL">Manual Cockpit</option>
          <option value="DEMO">Demo Simulator</option>
          <option value="SYSTEM">System Deadman</option>
        </select>
      </div>

      {/* Table Card */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '14px 18px', fontFamily: 'var(--font-hud)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>TIME</th>
              <th style={{ padding: '14px 18px', fontFamily: 'var(--font-hud)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>GESTURE</th>
              <th style={{ padding: '14px 18px', fontFamily: 'var(--font-hud)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>EXECUTED COMMAND</th>
              <th style={{ padding: '14px 18px', fontFamily: 'var(--font-hud)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>CONFIDENCE</th>
              <th style={{ padding: '14px 18px', fontFamily: 'var(--font-hud)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>STATUS</th>
              <th style={{ padding: '14px 18px', fontFamily: 'var(--font-hud)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>SOURCE</th>
              <th style={{ padding: '14px 18px', fontFamily: 'var(--font-hud)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>NOTES</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
                  No command logs match your filters.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isEstop = log.command === 'EMERGENCY_STOP';
                const isSuccess = log.execution_result === 'SUCCESS';
                const isBlocked = log.execution_result === 'SAFETY_BLOCKED';

                return (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 18px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 18px', fontWeight: 600 }}>{log.gesture}</td>
                    <td style={{ padding: '12px 18px' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-hud)',
                          fontWeight: 700,
                          color: isEstop ? '#ff3366' : 'var(--accent-cyan)',
                        }}
                      >
                        {log.command}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', fontFamily: 'var(--font-hud)' }}>
                      {Math.round(log.confidence * 100)}%
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span className={`badge ${isSuccess ? 'badge-green' : isBlocked ? 'badge-amber' : 'badge-red'}`}>
                        {log.execution_result}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {log.source}
                    </td>
                    <td style={{ padding: '12px 18px', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                      {log.notes || '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
