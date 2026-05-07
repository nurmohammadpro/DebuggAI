/**
 * Account Deletion Page
 */

'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useSessionStore } from '@/store/session-store';

export default function DangerPage() {
  const router = useRouter();
  const { logout } = useSessionStore();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Anonymize profile data
      await supabase
        .from('profiles')
        .update({
          display_name: 'Deleted User',
          email: `deleted_${session.user.id}@anonymous.local`,
          avatar_url: null,
        })
        .eq('id', session.user.id);

      // Sign out
      await supabase.auth.signOut();
      logout();
      toast.success('Account deleted');
      router.push('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)]">
          Danger Zone
        </h1>
        <p className="text-[13px] text-[var(--app-text-muted)] mt-2">
          Irreversible account actions
        </p>
      </div>

      <section className="rounded-[8px] border border-[var(--app-danger)]/30 bg-[var(--app-panel)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-[8px] bg-[var(--app-danger)]/10 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-[var(--app-danger)]" />
          </div>
          <div>
            <h2 className="text-[13px] font-medium text-[var(--app-text)]">
              Delete Account
            </h2>
            <p className="text-[12px] text-[var(--app-text-muted)]">
              This will anonymize your data and permanently sign you out
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[12px] text-[var(--app-danger)]">
            Type DELETE to confirm:
          </p>
          <div className="flex items-center gap-3 max-w-sm">
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="flex-1 h-9 rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 text-[13px] text-[var(--app-text)] outline-none focus:border-[var(--app-danger)]"
            />
            <button
              onClick={handleDelete}
              disabled={confirmText !== 'DELETE' || loading}
              className="h-9 px-5 rounded-[8px] bg-[var(--app-danger)] text-white text-[13px] font-medium hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete Account
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
