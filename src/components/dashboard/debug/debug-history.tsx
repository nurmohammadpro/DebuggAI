'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Search, Clock, Bug, Trash2, RefreshCw, History } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/hooks/queries/query-keys';
import { useMyDebugSessions } from '@/hooks/queries/use-my-debug-sessions';
import { DEBUG_LANGUAGES } from '@/lib/constants';

export function DebugHistory() {
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
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Debug History</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={(data || []).length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Card className="mb-6">
          <div className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search code or errors..."
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Filter by Language</Label>
                <Select
                  value={languageFilter}
                  onValueChange={(v) => setLanguageFilter(v || 'all')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All languages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    {DEBUG_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.id} value={lang.id}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {error && (
          <Card className="p-6">
            <div className="text-sm font-medium">Failed to load history</div>
            <div className="text-xs text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'Unknown error'}
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </Card>
        )}

        {isLoading && (
          <Card>
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </Card>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <Card>
            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
              <Bug className="h-16 w-16 mb-4 opacity-20" />
              {(data || []).length === 0 ? (
                <>
                  <p className="text-lg font-medium mb-2">No debug sessions yet</p>
                  <p className="text-sm">
                    Your debugging history will appear here after you analyze code.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">No matching sessions</p>
                  <p className="text-sm">
                    Try adjusting your search or filter to find what you&apos;re looking for.
                  </p>
                </>
              )}
            </div>
          </Card>
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((session) => (
              <Card key={session.id} className="flex flex-col">
                <div className="p-4 flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className="text-xs">
                      {session.language}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(session.created_at), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>

                  {session.error_message && (
                    <div className="bg-destructive/10 rounded-md p-2 text-xs text-destructive">
                      <p className="font-medium mb-1">Error:</p>
                      <p className="line-clamp-2">{session.error_message}</p>
                    </div>
                  )}

                  <div className="bg-muted/50 rounded-md p-2">
                    <p className="text-xs font-mono line-clamp-3">{session.code}</p>
                  </div>

                  {session.tags && session.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {session.tags.map((tag, i) => (
                        <Badge key={`${session.id}:${i}`} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 pt-0 border-t border-border/40">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => toast.message('Re-run coming soon')}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Re-run
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(session.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
