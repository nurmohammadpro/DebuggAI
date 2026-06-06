/**
 * Client-side analytics & usage logging
 *
 * Lightweight event logger that writes to analytics_usage_logs.
 * Non-blocking — fires and forgets.
 */

import { supabase } from '@/lib/supabase';

type AnalyticsEvent = {
  action_type: string;
  metadata?: Record<string, unknown>;
  credits_used?: number;
};

export function trackEvent(event: AnalyticsEvent): void {
  // Fire and forget — don't block the UI
  void (async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      await supabase.from('analytics_usage_logs').insert({
        user_id: session.user.id,
        action_type: event.action_type,
        credits_used: event.credits_used ?? 0,
        model_used: event.metadata?.model as string | undefined,
      });
    } catch {
      // Analytics should never break the app
    }
  })();
}

export function trackPageView(page: string): void {
  trackEvent({ action_type: `page_view:${page}` });
}

export function trackFeatureUse(feature: string, meta?: Record<string, unknown>): void {
  trackEvent({ action_type: `feature:${feature}`, metadata: meta });
}
