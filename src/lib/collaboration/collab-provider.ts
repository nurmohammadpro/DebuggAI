/**
 * Collaborative Editing Provider
 *
 * Lightweight operational transform via Supabase Realtime.
 * For production, consider Yjs with supabase-realtime provider.
 */

import { supabase } from '@/lib/supabase';

type EditPayload = {
  userId: string;
  filePath: string;
  content: string;
  timestamp: number;
};

type EditHandler = (payload: EditPayload) => void;

const handlers = new Set<EditHandler>();

export function subscribeToEdits(
  workspaceId: string,
  onEdit: EditHandler
): () => void {
  handlers.add(onEdit);

  const channel = supabase.channel(`collab:${workspaceId}`, {
    config: { broadcast: { self: false } },
  });

  channel
    .on('broadcast', { event: 'edit' }, (payload: any) => {
      for (const handler of handlers) {
        handler(payload.payload as EditPayload);
      }
    })
    .subscribe();

  return () => {
    handlers.delete(onEdit);
    supabase.removeChannel(channel);
  };
}

export async function broadcastEdit(
  workspaceId: string,
  filePath: string,
  content: string
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return;

  await supabase.channel(`collab:${workspaceId}`).send({
    type: 'broadcast',
    event: 'edit',
    payload: {
      userId: session.user.id,
      filePath,
      content,
      timestamp: Date.now(),
    } as EditPayload,
  });
}
