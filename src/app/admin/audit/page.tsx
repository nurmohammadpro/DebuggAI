/**
 * Admin Audit Page
 *
 * Enterprise audit log with real database data and export capabilities.
 */

'use client';

import { useState, useEffect } from 'react';
import { SearchIcon, DownloadIcon, FileTextIcon, CalendarIcon, ShieldIcon, UserIcon, SettingsIcon, AlertCircleIcon, FilterIcon } from 'lucide-react';
import { getRecentActivity } from '@/lib/admin/auth';

interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  target_type: string | null;
  metadata: any;
  created_at: string;
}

type ActionCategory = 'all' | 'admin' | 'auth' | 'credit' | 'user' | 'system';
type DateRange = '24h' | '7d' | '30d' | 'all';

export default function AdminAuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ActionCategory>('all');
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [error, setError] = useState<string | null>(null);

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine limit based on date range
      const limit = dateRange === '24h' ? 50 : dateRange === '7d' ? 100 : 200;

      const result = await getRecentActivity(limit);

      if (result.error) {
        setError(result.error);
      } else {
        setEvents(result.activities || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [dateRange]);

  const filteredEvents = events.filter(event => {
    const matchesSearch = !searchQuery ||
      event.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.action.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || event.action.startsWith(categoryFilter);

    return matchesSearch && matchesCategory;
  });

  const getActionIcon = (action: string) => {
    if (action.startsWith('admin')) return ShieldIcon;
    if (action.startsWith('auth')) return UserIcon;
    if (action.startsWith('credit')) return FileTextIcon;
    if (action.startsWith('system')) return SettingsIcon;
    return AlertCircleIcon;
  };

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('ban')) return 'text-[#FF5252]';
    if (action.includes('update') || action.includes('create') || action.includes('adjust')) return 'text-[#00C853]';
    if (action.includes('signin') || action.includes('signup')) return 'text-[#40C4FF]';
    return 'text-[#8BAD8B]';
  };

  const getActionBadge = (action: string) => {
    if (action.includes('delete') || action.includes('ban')) return 'bg-[#FF5252]/15 text-[#FF5252] border-[#FF5252]/30';
    if (action.includes('update') || action.includes('create') || action.includes('adjust')) return 'bg-[#00C853]/15 text-[#00C853] border-[#00C853]/30';
    if (action.includes('signin') || action.includes('signup')) return 'bg-[#40C4FF]/15 text-[#40C4FF] border-[#40C4FF]/30';
    return 'bg-[#283228] text-[#8BAD8B] border-[#1F2B1F]';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const exportAuditLog = () => {
    const csv = [
      ['Timestamp', 'Actor', 'Action', 'Target Type', 'Metadata'].join(','),
      ...filteredEvents.map(e => [
        e.created_at,
        e.actor,
        e.action,
        e.target_type || '',
        JSON.stringify(e.metadata).replace(/"/g, '""'),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8F5E9]">Audit Trail</h1>
          <p className="text-sm text-[#4D6B4D] mt-1">
            Complete system activity log for compliance and security
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="h-10 px-4 bg-[#111411] border border-[#1F2B1F] rounded-[8px] text-[#E8F5E9] text-sm focus:outline-none focus:border-[#00C853]"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>

          <button
            onClick={exportAuditLog}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-transparent text-[#E8F5E9] border border-[#283228] hover:border-[#00C853] hover:text-[#00C853] transition-all font-medium text-[13.5px]"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-[#FF5252]/10 border border-[#FF5252]/30 rounded-[8px]-xl">
          <span className="text-sm text-[#FF5252]">{error}</span>
          <button
            onClick={fetchAuditData}
            className="px-3 py-1.5 text-xs font-medium rounded-[8px] bg-[#FF5252] text-black hover:bg-[#FF7B7B] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4D6B4D]" />
          <input
            type="search"
            placeholder="Search by actor, action, or target..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#171C17] border border-[#283228] rounded-[8px] text-[#E8F5E9] placeholder-[#4D6B4D] focus:outline-none focus:border-[#00C853]"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ActionCategory)}
          className="h-10 w-40 px-3 bg-[#171C17] border border-[#283228] rounded-[8px] text-[#E8F5E9] text-sm focus:outline-none focus:border-[#00C853]"
        >
          <option value="all">All Actions</option>
          <option value="admin">Admin</option>
          <option value="auth">Authentication</option>
          <option value="credit">Credits</option>
          <option value="user">User</option>
          <option value="system">System</option>
        </select>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#111411] border border-[#1F2B1F] rounded-[8px]-xl p-4">
          <p className="text-xs text-[#8BAD8B] mb-1">Total Events</p>
          <p className="text-2xl font-semibold text-[#E8F5E9]">{filteredEvents.length}</p>
        </div>
        <div className="bg-[#111411] border border-[#1F2B1F] rounded-[8px]-xl p-4">
          <p className="text-xs text-[#8BAD8B] mb-1">Admin Actions</p>
          <p className="text-2xl font-semibold text-[#FFAB00]">
            {filteredEvents.filter(e => e.action.startsWith('admin')).length}
          </p>
        </div>
        <div className="bg-[#111411] border border-[#1F2B1F] rounded-[8px]-xl p-4">
          <p className="text-xs text-[#8BAD8B] mb-1">Auth Events</p>
          <p className="text-2xl font-semibold text-[#40C4FF]">
            {filteredEvents.filter(e => e.action.startsWith('auth')).length}
          </p>
        </div>
        <div className="bg-[#111411] border border-[#1F2B1F] rounded-[8px]-xl p-4">
          <p className="text-xs text-[#8BAD8B] mb-1">Credit Actions</p>
          <p className="text-2xl font-semibold text-[#00C853]">
            {filteredEvents.filter(e => e.action.startsWith('credit')).length}
          </p>
        </div>
      </div>

      {/* Audit Log */}
      <div className="bg-[#111411] border border-[#1F2B1F] rounded-[8px]-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-[#8BAD8B]">Loading audit log...</div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FileTextIcon className="w-12 h-12 text-[#4D6B4D] mb-3" />
            <p className="text-sm text-[#8BAD8B]">No audit events found</p>
            <p className="text-xs text-[#4D6B4D] mt-1">Events will appear here as users interact with the system</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1F2B1F]">
            {filteredEvents.map((event) => {
              const Icon = getActionIcon(event.action);

              return (
                <div
                  key={event.id}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-[#171C17] transition-colors"
                >
                  <div className="w-10 h-10 rounded-[8px] bg-[#1E261E] flex items-center justify-center flex-shrink-0 border border-[#1F2B1F]">
                    <Icon className="w-5 h-5 text-[#8BAD8B]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[#E8F5E9]">{event.actor}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getActionBadge(event.action)}`}>
                        {event.action.replace(/admin\./g, '').replace(/_/g, ' ')}
                      </span>
                    </div>
                    {event.target_type && (
                      <p className="text-xs text-[#8BAD8B]">Target: {event.target_type}</p>
                    )}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-[#4D6B4D] cursor-pointer hover:text-[#8BAD8B]">
                          View metadata
                        </summary>
                        <pre className="text-xs text-[#4D6B4D] mt-2 overflow-x-auto bg-[#0A0D0A] p-2 rounded-[8px]">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-[#4D6B4D]">
                      {formatTimestamp(event.created_at)}
                    </p>
                    <p className="text-xs text-[#4D6B4D] mt-0.5">
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
