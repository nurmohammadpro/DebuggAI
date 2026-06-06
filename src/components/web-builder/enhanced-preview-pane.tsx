'use client';

import { useGenerationStore } from '@/store/generation-store';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Container,
  Loader2,
  Maximize2,
  Minimize2,
  Monitor,
  Play,
  RefreshCw,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  const { lastError, setLastError, files, isGenerating } = useGenerationStore();
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const wasGeneratingRef = useRef(false);

  const currentDevice = DEVICE_CONFIG[deviceMode];
  const hasFiles = !!files && Object.values(files.files).some((file) => file.status !== 'deleted');
  const previewReady = !!sandboxUrl && !sandboxError;
  const showBuildingAnimation = isGenerating || (!previewReady && !sandboxError && hasFiles) || (!hasFiles && !isGenerating) || showTransition;

  const previewViewportClassName =
    deviceMode === 'desktop'
      ? 'flex-1 min-h-0 bg-[#F0F0F0] dark:bg-[#1A1A1A] flex items-stretch justify-stretch p-0'
      : 'flex-1 min-h-0 bg-[#F0F0F0] dark:bg-[#1A1A1A] flex items-center justify-center p-4';

  const handleRefresh = useCallback(() => {
    setLastError(null);
    onRefresh?.();
  }, [onRefresh, setLastError]);

  useEffect(() => {
    const wasGenerating = wasGeneratingRef.current;
    wasGeneratingRef.current = isGenerating;

    if (!isGenerating && wasGenerating && hasFiles) {
      const startTimer = setTimeout(() => setShowTransition(true), 0);
      const endTimer = setTimeout(() => setShowTransition(false), 1200);
      return () => {
        clearTimeout(startTimer);
        clearTimeout(endTimer);
      };
    }
  }, [isGenerating, hasFiles]);

  return (
    <div
      className={cn(
        'flex flex-col bg-[var(--app-panel)] flex-1 min-h-0',
        isFullscreen && 'fixed inset-0 z-50',
        className,
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
          isReady={previewReady}
        />
      )}

      <div className={previewViewportClassName}>
        <div
          className="bg-white rounded-[4px] shadow-lg overflow-hidden transition-all duration-300 flex flex-col flex-1 min-h-0"
          style={{ width: currentDevice.width, maxWidth: '100%' }}
        >
          {previewReady ? (
            <iframe
              src={sandboxUrl}
              className="h-full w-full border-0"
              title="Docker Live Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            />
          ) : sandboxError ? (
            <DockerError error={sandboxError} onRetry={handleRefresh} />
          ) : showBuildingAnimation ? (
            <BuildingAnimation
              isGenerating={isGenerating}
              fileCount={hasFiles ? Object.values(files?.files || {}).filter((file) => file.status !== 'deleted').length : 0}
            />
          ) : (
            <DockerWaiting onRetry={handleRefresh} />
          )}
        </div>
      </div>

      {lastError && (
        <div className="border-t border-[var(--app-danger)]/25 p-3 bg-[var(--app-danger-soft)] shrink-0">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-[var(--app-danger)] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[var(--app-danger)] uppercase tracking-wider mb-1">Runtime Error</p>
              <p className="text-[12px] text-[var(--app-text)] font-mono leading-relaxed break-words">{lastError.message}</p>
            </div>
            <button onClick={() => setLastError(null)} className="text-[10px] uppercase font-semibold text-[var(--app-danger)] hover:opacity-75 transition-opacity px-2 py-1 rounded shrink-0">Dismiss</button>
          </div>
        </div>
      )}

      <PreviewStatusBar deviceMode={deviceMode} engine={previewReady ? 'Docker/Next.js' : 'Docker pending'} />
    </div>
  );
}

function BuildingAnimation({ isGenerating, fileCount }: { isGenerating: boolean; fileCount: number }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-[var(--app-bg)] p-8">
      <div className="relative mb-6">
        <div className={cn(
          'w-16 h-16 rounded-xl border flex items-center justify-center',
          isGenerating ? 'border-[var(--app-accent)]/25' : 'border-emerald-500/25',
        )}>
          {isGenerating ? (
            <Loader2 className="h-6 w-6 text-[var(--app-accent)] animate-spin" />
          ) : (
            <Container className="h-6 w-6 text-emerald-400" />
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-[13px] font-semibold text-[var(--app-text)]">
          {isGenerating ? 'Generating project files...' : fileCount > 0 ? `Starting Docker preview for ${fileCount} file${fileCount !== 1 ? 's' : ''}` : 'Waiting for generated files'}
        </span>
        <span className="text-[10px] text-[var(--app-text-dim)] uppercase tracking-[0.18em]">
          Docker preview
        </span>
      </div>
    </div>
  );
}

function DockerWaiting({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-[var(--app-bg)] p-8 text-center">
      <Container className="h-8 w-8 text-[var(--app-text-dim)] mb-3" />
      <p className="text-[13px] font-semibold text-[var(--app-text)]">Docker preview is not ready yet</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 h-8 px-3 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] text-[11px] font-medium text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors inline-flex items-center gap-1.5"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  );
}

function DockerError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--app-bg)]">
      <div className="flex-1 min-h-0 flex items-center justify-center p-8 text-center">
        <div className="max-w-[440px]">
          <AlertCircle className="h-9 w-9 text-[var(--app-danger)] mx-auto mb-4" />
          <p className="text-[14px] font-semibold text-[var(--app-text)] mb-2">Docker preview failed</p>
          <p className="text-[12px] leading-relaxed text-[var(--app-text-muted)] whitespace-pre-wrap break-words font-mono">
            {error}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 h-8 px-3 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] text-[11px] font-medium text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors inline-flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry Docker
          </button>
        </div>
      </div>
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
  isReady,
}: {
  deviceMode: DeviceMode;
  setDeviceMode: (mode: DeviceMode) => void;
  onRefresh: () => void;
  isFullscreen: boolean;
  setIsFullscreen: (value: boolean) => void;
  hasError: boolean;
  isReady: boolean;
}) {
  return (
    <div className="min-h-12 sm:h-11 flex flex-wrap sm:flex-nowrap items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-0 shrink-0 border-b border-[var(--app-border)] bg-[var(--app-panel)]">
      <div className="flex items-center gap-2.5">
        <Play className="h-3.5 w-3.5 text-[var(--app-accent)]" />
        <h3 className="text-[13px] font-semibold tracking-tight uppercase text-[var(--app-text)]">Preview</h3>
        {hasError && (
          <span className="inline-flex text-[9px] h-4 px-1.5 uppercase font-black rounded-[6px] bg-[var(--app-danger-soft)] text-[var(--app-danger)]">Error</span>
        )}
        <span className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider',
          isReady ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        )}>
          <Container className="h-2.5 w-2.5" />
          Docker
        </span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 ml-0 sm:ml-2">
        <button onClick={() => setDeviceMode('desktop')} className={cn('h-10 w-10 sm:h-7 sm:w-7 rounded-[5px] flex items-center justify-center transition-colors touch-manipulation', deviceMode === 'desktop' ? 'bg-[var(--app-surface)] text-[var(--app-text)]' : 'text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]')} title="Desktop"><Monitor className="h-4 w-4 sm:h-3.5 sm:w-3.5" /></button>
        <button onClick={() => setDeviceMode('tablet')} className={cn('h-10 w-10 sm:h-7 sm:w-7 rounded-[5px] flex items-center justify-center transition-colors touch-manipulation', deviceMode === 'tablet' ? 'bg-[var(--app-surface)] text-[var(--app-text)]' : 'text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]')} title="Tablet"><Tablet className="h-4 w-4 sm:h-3.5 sm:w-3.5" /></button>
        <button onClick={() => setDeviceMode('mobile')} className={cn('h-10 w-10 sm:h-7 sm:w-7 rounded-[5px] flex items-center justify-center transition-colors touch-manipulation', deviceMode === 'mobile' ? 'bg-[var(--app-surface)] text-[var(--app-text)]' : 'text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]')} title="Mobile"><Smartphone className="h-4 w-4 sm:h-3.5 sm:w-3.5" /></button>
      </div>

      <div className="flex-1" />
      <div className="flex items-center gap-1.5">
        <button onClick={onRefresh} className="h-10 w-10 sm:h-7 sm:w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors touch-manipulation" title="Refresh preview"><RefreshCw className="h-4 w-4 sm:h-3.5 sm:w-3.5" /></button>
        <button onClick={() => setIsFullscreen(!isFullscreen)} className="h-10 w-10 sm:h-7 sm:w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors touch-manipulation" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

function PreviewStatusBar({ deviceMode, engine }: { deviceMode: DeviceMode; engine: string }) {
  return (
    <div className="h-6 border-t border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-tighter">Engine: <span className="font-semibold text-[var(--app-accent)]/75">{engine}</span></span>
        <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-tighter">Mode: <span className="font-semibold text-[var(--app-accent)]/75">{deviceMode}</span></span>
      </div>
    </div>
  );
}
