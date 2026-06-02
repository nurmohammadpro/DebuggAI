'use client';

import { useGenerationStore } from '@/store/generation-store';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Info,
  Maximize2,
  Minimize2,
  Monitor,
  Play,
  RefreshCw,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { useCallback, useState } from 'react';

interface EnhancedPreviewPaneProps {
  height?: string;
  className?: string;
  chromeless?: boolean;
  sandboxUrl?: string | null;
  onRefresh?: () => void;
  sandboxError?: string | null;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const DEVICE_CONFIG: Record<DeviceMode, { width: string; label: string }> = {
  desktop: { width: '100%', label: 'Desktop' },
  tablet: { width: '768px', label: 'Tablet' },
  mobile: { width: '375px', label: 'Mobile' },
};

export function EnhancedPreviewPane({
  className,
  chromeless = false,
  sandboxUrl,
  onRefresh,
  sandboxError = null,
}: EnhancedPreviewPaneProps) {
  const { lastError, setLastError } = useGenerationStore();
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentDevice = DEVICE_CONFIG[deviceMode];
  const previewViewportClassName =
    deviceMode === 'desktop'
      ? 'flex-1 min-h-0 bg-[#F0F0F0] dark:bg-[#1A1A1A] flex items-stretch justify-stretch p-0'
      : 'flex-1 min-h-0 bg-[#F0F0F0] dark:bg-[#1A1A1A] flex items-center justify-center p-4';

  const handleRefresh = useCallback(() => {
    setLastError(null);
    onRefresh?.();
  }, [onRefresh, setLastError]);

  return (
    <div
      className={cn(
        'flex flex-col bg-[var(--app-panel)] flex-1 min-h-0',
        isFullscreen && 'fixed inset-0 z-50',
        className
      )}
    >
      {!chromeless && (
        <PreviewHeader
          deviceMode={deviceMode}
          setDeviceMode={setDeviceMode}
          onRefresh={handleRefresh}
          isFullscreen={isFullscreen}
          setIsFullscreen={setIsFullscreen}
          hasError={!!lastError || !!sandboxError}
        />
      )}

      {!chromeless && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--app-accent)]/5 border-b border-[var(--app-border)] shrink-0">
          <Info className="h-3 w-3 text-[var(--app-accent)] shrink-0" />
          <span className="text-[10px] text-[var(--app-text-muted)] leading-tight">
            Docker preview — renders the generated Next.js app directly
          </span>
        </div>
      )}

      <div className={previewViewportClassName}>
        <div
          className="bg-white rounded-[4px] shadow-lg overflow-hidden transition-all duration-300 flex flex-col flex-1 min-h-0"
          style={{ width: currentDevice.width, maxWidth: '100%' }}
        >
          {sandboxError ? (
            <ErrorState message={sandboxError} onRetry={onRefresh} />
          ) : sandboxUrl ? (
            <iframe
              src={sandboxUrl}
              className="h-full w-full border-0"
              title="Docker Live Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            />
          ) : (
            <StartingState label="Docker Sandbox" />
          )}
        </div>
      </div>

      {lastError && (
        <div className="border-t border-[var(--app-danger)]/25 p-3 bg-[var(--app-danger-soft)] shrink-0">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-[var(--app-danger)] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[var(--app-danger)] uppercase tracking-wider mb-1">
                Runtime Error
              </p>
              <p className="text-[12px] text-[var(--app-text)] font-mono leading-relaxed break-words">
                {lastError.message}
              </p>
            </div>
            <button
              onClick={() => setLastError(null)}
              className="text-[10px] uppercase font-semibold text-[var(--app-danger)] hover:opacity-75 transition-opacity px-2 py-1 rounded shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <PreviewStatusBar deviceMode={deviceMode} engine="Docker/Next.js" />
    </div>
  );
}

function PreviewHeader({
  deviceMode,
  setDeviceMode,
  onRefresh,
  isFullscreen,
  setIsFullscreen,
  hasError,
}: {
  deviceMode: DeviceMode;
  setDeviceMode: (m: DeviceMode) => void;
  onRefresh: () => void;
  isFullscreen: boolean;
  setIsFullscreen: (v: boolean) => void;
  hasError: boolean;
}) {
  return (
    <div className="h-11 flex items-center gap-1.5 px-3 shrink-0 border-b border-[var(--app-border)] bg-[var(--app-panel)]">
      <div className="flex items-center gap-2.5">
        <Play className="h-3.5 w-3.5 text-[var(--app-accent)]" />
        <h3 className="text-[13px] font-semibold tracking-tight uppercase text-[var(--app-text)]">
          Live Preview
        </h3>
        {hasError && (
          <span className="inline-flex text-[9px] h-4 px-1.5 uppercase font-black rounded-[6px] bg-[var(--app-danger-soft)] text-[var(--app-danger)]">
            Runtime Error
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 ml-2">
        <button
          onClick={() => setDeviceMode('desktop')}
          className={cn(
            'h-7 w-7 rounded-[5px] flex items-center justify-center transition-colors',
            deviceMode === 'desktop'
              ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
              : 'text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
          )}
          title="Desktop"
        >
          <Monitor className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setDeviceMode('tablet')}
          className={cn(
            'h-7 w-7 rounded-[5px] flex items-center justify-center transition-colors',
            deviceMode === 'tablet'
              ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
              : 'text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
          )}
          title="Tablet"
        >
          <Tablet className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setDeviceMode('mobile')}
          className={cn(
            'h-7 w-7 rounded-[5px] flex items-center justify-center transition-colors',
            deviceMode === 'mobile'
              ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
              : 'text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
          )}
          title="Mobile"
        >
          <Smartphone className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <button
          onClick={onRefresh}
          className="h-7 w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
          title="Refresh preview"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="h-7 w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

function StartingState({ label }: { label: string }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-[var(--app-bg)]">
      <div className="relative mb-8">
        <div className="w-16 h-16 rounded-[6px] border-2 border-[var(--app-accent)]/25 animate-spin [animation-duration:3s]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="h-6 w-6 text-[var(--app-accent)] animate-pulse" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-[11px] font-semibold text-[var(--app-accent)] uppercase tracking-[0.3em] animate-pulse">
          Starting {label}
        </span>
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-[var(--app-accent)]/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1 h-1 bg-[var(--app-accent)]/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1 h-1 bg-[var(--app-accent)]/40 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: (() => void) | undefined }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-[var(--app-bg)] p-6 text-center">
      <div className="text-[12px] font-semibold text-[var(--app-danger)] mb-2">Preview Failed</div>
      <div className="text-[11px] text-[var(--app-text-dim)] max-w-[520px] mb-4 break-words">
        {message}
      </div>
      {onRetry && (
        <button
          className="h-8 px-3 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)] text-[11px] font-semibold uppercase tracking-tight hover:bg-[var(--app-panel-2)]"
          onClick={onRetry}
        >
          Retry
        </button>
      )}
    </div>
  );
}

function PreviewStatusBar({
  deviceMode,
  engine,
}: {
  deviceMode: DeviceMode;
  engine: string;
}) {
  return (
    <div className="h-6 border-t border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-tighter">Engine:</span>
          <span className="text-[9px] font-semibold text-[var(--app-accent)]/75 uppercase">{engine}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-tighter">Mode:</span>
          <span className="text-[9px] font-semibold text-[var(--app-accent)]/75 uppercase">{deviceMode}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-widest">
          Docker-Next Preview
        </span>
      </div>
    </div>
  );
}
