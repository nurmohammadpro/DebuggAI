/**
 * Web Builder Page - DeBuggAI Design System v1.0
 *
 * Professional · Minimal · Developer-focused · Dark-first
 */

'use client';

import { ChatPanel } from '@/components/web-builder/chat-panel';
import { CodeEditor } from '@/components/web-builder/code-editor';
import { PreviewPane } from '@/components/web-builder/preview-pane';
import { useEffect } from 'react';
import { useSessionStore } from '@/store/session-store';
import { useRouter } from 'next/navigation';

export default function WebBuilderPage() {
  const { isAuthenticated, isLoading } = useSessionStore();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--ds-green)' }}></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6">
        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-80px)]">
          {/* Chat Panel */}
          <div className="lg:col-span-1">
            <ChatPanel height="calc(100vh-180px)" />
          </div>

          {/* Editor */}
          <div className="lg:col-span-1">
            <CodeEditor height="calc(100vh-180px)" />
          </div>

          {/* Preview */}
          <div className="lg:col-span-1">
            <PreviewPane height="calc(100vh-180px)" />
          </div>
        </div>
      </div>
    </div>
  );
}
