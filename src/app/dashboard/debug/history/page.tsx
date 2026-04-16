/**
 * Debug History Page
 *
 * View past debugging sessions with filter and re-run options.
 */

'use client';

import { useState } from 'react';
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
import { Search, Clock, Bug, Trash2, RefreshCw, History } from 'lucide-react';
import { useDebugStore, Language } from '@/store/debug-store';
import { DEBUG_LANGUAGES } from '@/lib/constants';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function DebugHistoryPage() {
  const { sessions, clearSessions, deleteSession } = useDebugStore();
  const [search, setSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState<'all' | Language>('all');

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      !search ||
      session.code.toLowerCase().includes(search.toLowerCase()) ||
      (session.errorMessage && session.errorMessage.toLowerCase().includes(search.toLowerCase())) ||
      (session.explanation && session.explanation.toLowerCase().includes(search.toLowerCase()));

    const matchesLanguage = languageFilter === 'all' || session.language === languageFilter;

    return matchesSearch && matchesLanguage;
  });

  const handleReRun = () => {
    // Populate the debug screen with this session's data
    // For now, just show a toast
    toast.success('Session loaded - navigate to Debug screen to re-run');
  };

  const handleDelete = (sessionId: string) => {
    deleteSession(sessionId);
    toast.success('Session deleted');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Debug History</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSessions}
            disabled={sessions.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Filters */}
        <Card className="mb-6">
          <div className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Search */}
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

              {/* Language Filter */}
              <div className="space-y-2">
                <Label>Filter by Language</Label>
                <Select value={languageFilter} onValueChange={(v) => setLanguageFilter(v as Language)}>
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

        {/* Sessions List */}
        {filteredSessions.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
              <Bug className="h-16 w-16 mb-4 opacity-20" />
              {sessions.length === 0 ? (
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
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSessions.map((session) => (
              <Card key={session.id} className="flex flex-col">
                <div className="p-4 flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className="text-xs">
                      {session.language}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(session.timestamp, { addSuffix: true })}
                    </div>
                  </div>

                  {/* Error Message */}
                  {session.errorMessage && (
                    <div className="bg-destructive/10 rounded-md p-2 text-xs text-destructive">
                      <p className="font-medium mb-1">Error:</p>
                      <p className="line-clamp-2">{session.errorMessage}</p>
                    </div>
                  )}

                  {/* Code Preview */}
                  <div className="bg-muted/50 rounded-md p-2">
                    <p className="text-xs font-mono line-clamp-3">
                      {session.code}
                    </p>
                  </div>

                  {/* Tags */}
                  {session.tags && session.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {session.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-4 pt-0 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleReRun()}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Re-run
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(session.id)}
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
