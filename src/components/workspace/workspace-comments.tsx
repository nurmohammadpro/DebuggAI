'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSessionStore } from '@/store/session-store';

interface Comment {
  id: string;
  content: string;
  author: { email: string; display_name: string };
  created_at: string;
}

export function WorkspaceComments({
  workspaceId,
  filePath,
}: {
  workspaceId: string;
  filePath?: string;
}) {
  const { user } = useSessionStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workspace_comments')
        .select('*, author:profiles(email, display_name)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });

      if (!error) setComments(data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const sendComment = async () => {
    if (!text.trim() || !user) return;
    setSending(true);

    try {
      const { error } = await supabase.from('workspace_comments').insert({
        workspace_id: workspaceId,
        user_id: user.id,
        content: text.trim(),
        file_path: filePath || null,
      });

      if (!error) {
        setText('');
        fetchComments();
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-[var(--app-border)]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-muted)]">
          Comments
        </span>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--app-text-dim)]" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-6">
            <MessageSquare className="h-6 w-6 text-[var(--app-text-dim)] mx-auto mb-2" />
            <p className="text-[12px] text-[var(--app-text-muted)]">No comments yet</p>
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
                style={{ background: 'var(--app-accent-soft)', color: 'var(--app-accent)' }}
              >
                {(c.author?.display_name || c.author?.email || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-[var(--app-text)]">
                    {c.author?.display_name || c.author?.email || 'Unknown'}
                  </span>
                  <span className="text-[10px] text-[var(--app-text-dim)]">
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--app-text-muted)] mt-0.5">{c.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-[var(--app-border)] flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendComment()}
          placeholder="Write a comment..."
          className="flex-1 h-8 rounded-[6px] bg-[var(--app-panel-2)] border border-[var(--app-border)] px-3 text-[12px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:border-[var(--app-accent)]/30"
        />
        <button
          onClick={sendComment}
          disabled={sending || !text.trim()}
          className="h-8 w-8 rounded-[6px] bg-[var(--app-accent)] text-black flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
