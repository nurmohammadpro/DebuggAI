'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Search, Clock, Bug, Trash2, RefreshCw, ArrowLeft } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/hooks/queries/query-keys';
import { useMyDebugSessions } from '@/hooks/queries/use-my-debug-sessions';
import { DEBUG_LANGUAGES } from '@/lib/constants';
import { useDebugStore, type Language } from '@/store/debug-store';
import { ReactSelect } from '@/components/ui/react-select';

export function DebugHistory() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState<'all' | string>('all');

  const { data, isLoading, error, refetch } = useMyDebugSessions(100, true);

  const filtered = useMemo(() => {
    const list = data || [];
    const q = search.trim().toLowerCase();
    return list.filter((s) => {
      const matchesSearch =
        !q ||
        s.code.toLowerCase().includes(q) ||
        (s.error_message || '').toLowerCase().includes(q) ||
        (s.explanation || '').toLowerCase().includes(q);
      const matchesLang = languageFilter === 'all' || s.language === languageFilter;
      return matchesSearch && matchesLang;
    });
  }, [data, languageFilter, search]);

  const handleDelete = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('debug_sessions')
        .delete()
        .eq('id', id);
      if (deleteError) throw deleteError;
      toast.success('Session deleted');
      await queryClient.invalidateQueries({ queryKey: queryKeys.myDebugSessions });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete session');
    }
  };

  const handleClearAll = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Please sign in again');
        return;
      }
      const { error: deleteError } = await supabase
        .from('debug_sessions')
        .delete()
        .eq('user_id', session.user.id);
      if (deleteError) throw deleteError;
      toast.success('History cleared');
      await queryClient.invalidateQueries({ queryKey: queryKeys.myDebugSessions });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to clear history');
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <button
              onClick={() => router.push('/dashboard/debug')}
              className="inline-flex items-center gap-2 text-[12px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Debugger
            </button>
            <h1 className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)]">Debug History</h1>
            <p className="text-[13px] text-[var(--app-text-muted)] mt-1">
              View and manage your past debugging sessions
            </p>
          </div>
          <button
            onClick={handleClearAll}
            disabled={(data || []).length === 0}
            className="inline-flex items-center gap-2 rounded-[6px] border border-[var(--app-danger)]/25 bg-[var(--app-danger-soft)] px-3 py-1.5 text-[13px] text-[var(--app-danger)] transition-colors hover:bg-[color-mix(in_srgb,var(--app-danger-soft)_70%,black)] disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Clear All
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-[6px] bg-[var(--app-panel)] backdrop-blur-xl p-4 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="search" className="text-[13px] font-medium text-[var(--app-text-muted)]">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--app-text-dim)]" />
              <input
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code or errors..."
                className="w-full h-9 pl-10 rounded-[6px] border-0 bg-[var(--app-panel-2)] text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[var(--app-text-muted)]">Filter by Language</label>
            <ReactSelect
              value={languageFilter === 'all' ? { value: 'all', label: 'All Languages' } : { value: languageFilter, label: DEBUG_LANGUAGES.find(l => l.id === languageFilter)?.name || languageFilter }}
              onChange={(opt) => setLanguageFilter(opt?.value || 'all')}
              options={[
                { value: 'all', label: 'All Languages' },
                ...DEBUG_LANGUAGES.map((lang) => ({ value: lang.id, label: lang.name })),
              ]}
              placeholder="All languages"
              isSearchable
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[6px] bg-[var(--app-panel)] backdrop-blur-xl p-6">
          <div className="text-[13px] font-medium text-[var(--app-text)]">Failed to load history</div>
          <div className="text-xs text-[var(--app-text-muted)] mt-1">
            {error instanceof Error ? error.message : 'Unknown error'}
          </div>
          <div className="mt-4">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-[6px] border border-[var(--app-border)] bg-transparent px-3 py-1.5 text-[13px] text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="rounded-[6px] bg-[var(--app-panel)] backdrop-blur-xl">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-[var(--app-text-dim)]" />
          </div>
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="rounded-[6px] bg-[var(--app-panel)] backdrop-blur-xl">
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Bug className="h-16 w-16 mb-4 text-[var(--app-text-dim)]" />
            {(data || []).length === 0 ? (
              <>
                <p className="text-[16px] font-medium text-[var(--app-text)] mb-2">No debug sessions yet</p>
                <p className="text-[13px] text-[var(--app-text-muted)]">
                  Your debugging history will appear here after you analyze code.
                </p>
              </>
            ) : (
              <>
                <p className="text-[16px] font-medium text-[var(--app-text)] mb-2">No matching sessions</p>
                <p className="text-[13px] text-[var(--app-text-muted)]">
                  Try adjusting your search or filter to find what you&apos;re looking for.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((session) => (
            <div key={session.id} className="rounded-[6px] bg-[var(--app-panel)] backdrop-blur-xl flex flex-col overflow-hidden">
              <div className="p-4 flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="inline-flex rounded-[6px] border border-[var(--app-border)] px-2 py-0.5 text-[11px] font-normal text-[var(--app-text-muted)]">
                    {session.language}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-[var(--app-text-dim)]">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(session.created_at), {
                      addSuffix: true,
                    })}
                  </div>
                </div>

                {session.error_message && (
                  <div className="bg-[var(--app-danger-soft)] rounded-[6px] p-2 text-xs text-[var(--app-danger)]">
                    <p className="font-medium mb-1">Error:</p>
                    <p className="line-clamp-2">{session.error_message}</p>
                  </div>
                )}

                <div className="bg-[var(--app-surface)] rounded-[6px] p-2">
                  <p className="text-xs font-mono line-clamp-3 text-[var(--app-text)]">{session.code}</p>
                </div>

                {session.tags && session.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {session.tags.map((tag, i) => (
                      <span key={`${session.id}:${i}`} className="inline-flex rounded-[6px] border border-[var(--app-border)] px-2 py-0.5 text-[11px] font-normal text-[var(--app-text-muted)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 pt-0 border-t border-[var(--app-border)]">
                <div className="flex gap-2">
                  <button
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[6px] border border-[var(--app-border)] bg-transparent px-3 py-1.5 text-[13px] text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                    onClick={() => {
                      const store = useDebugStore.getState();
                      store.setCurrentCode(session.code);
                      if (session.language) store.setCurrentLanguage(session.language as Language);
                      if (session.error_message) store.setCurrentError(session.error_message);
                      router.push('/dashboard/debug');
                    }}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Re-run
                  </button>
                  <button
                    onClick={() => handleDelete(session.id)}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-[6px] text-[var(--app-text-dim)] transition-colors hover:bg-[var(--app-danger-soft)] hover:text-[var(--app-danger)]"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
