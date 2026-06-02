/**
 * Enhanced Preview Pane v4 — fixed height for flex containers
 *
 * Uses flex-1 min-h-0 instead of height: 100% to properly fill
 * available space in the workspace's flex layout.
 */

'use client';

import {
  SandpackProvider,
  SandpackPreview,
  SandpackConsole,
} from '@codesandbox/sandpack-react';
import { useGenerationStore } from '@/store/generation-store';
import {
  RefreshCw,
  Play,
  Maximize2,
  Minimize2,
  AlertCircle,
  Smartphone,
  Tablet,
  Monitor,
  Terminal,
  Eye,
  Info,
} from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { convertNextjsToSandpack } from '@/lib/project/nextjs-to-sandpack';

interface EnhancedPreviewPaneProps {
  height?: string;
  className?: string;
  chromeless?: boolean;
  sandboxUrl?: string | null;
  onRefresh?: () => void;
  forceSandbox?: boolean;
  sandboxError?: string | null;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';
type ViewMode = 'preview' | 'console';

const DEVICE_CONFIG: Record<DeviceMode, { width: string; label: string }> = {
  desktop: { width: '100%', label: 'Desktop' },
  tablet: { width: '768px', label: 'Tablet' },
  mobile: { width: '375px', label: 'Mobile' },
};

export function EnhancedPreviewPane({
  height,
  className,
  chromeless = false,
  sandboxUrl,
  onRefresh,
  forceSandbox = false,
  sandboxError = null,
}: EnhancedPreviewPaneProps) {
  const { files, lastError, setLastError } = useGenerationStore();
  const { resolvedTheme } = useTheme();
  const [nonce, setNonce] = useState(0);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);

  const sandpackBundle = useMemo(
    () => convertNextjsToSandpack(files),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, nonce]
  );

  const handleRefresh = useCallback(() => {
    setIsLoadingPreview(true);
    setNonce((n) => n + 1);
    setLastError(null);
    onRefresh?.();
  }, [onRefresh, setLastError]);

  const currentDevice = DEVICE_CONFIG[deviceMode];
  const sandpackTheme = resolvedTheme === 'dark' ? 'dark' : 'light';

  const previewViewportClassName =
    deviceMode === 'desktop'
      ? 'flex-1 min-h-0 bg-[#F0F0F0] dark:bg-[#1A1A1A] flex items-stretch justify-stretch p-0'
      : 'flex-1 min-h-0 bg-[#F0F0F0] dark:bg-[#1A1A1A] flex items-center justify-center p-4';

  // ── Docker / iframe sandbox ──
  if (forceSandbox) {
    return (
      <div
        className={cn(
          'flex flex-col bg-[var(--app-panel)] flex-1 min-h-0',
          isFullscreen && 'fixed inset-0 z-50',
          className
        )}
      >
        <PreviewHeader
          deviceMode={deviceMode}
          setDeviceMode={setDeviceMode}
          onRefresh={handleRefresh}
          isFullscreen={isFullscreen}
          setIsFullscreen={setIsFullscreen}
          viewMode={viewMode}
          setViewMode={setViewMode}
          hasError={!!lastError}
          isLoading={false}
          label="Docker Preview"
        />

        <div className={previewViewportClassName}>
          <div
            className="bg-white shadow-lg rounded-[4px] overflow-hidden transition-all duration-300 flex flex-col flex-1 min-h-0"
            style={{ width: currentDevice.width, maxWidth: '100%' }}
          >
            {sandboxError ? (
              <ErrorState message={sandboxError} onRetry={onRefresh} />
            ) : sandboxUrl ? (
              <iframe
                src={sandboxUrl}
                className="w-full h-full border-0 flex-1"
                title="Docker Live Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
              />
            ) : (
              <StartingState label="Docker Sandbox" />
            )}
          </div>
        </div>

        <PreviewStatusBar deviceMode={deviceMode} engine="Docker/Next.js" />
      </div>
    );
  }

  // ── Sandpack (in-browser) preview ──
  return (
    <div
      className={cn(
        'flex flex-col bg-[var(--app-panel)] flex-1 min-h-0',
        isFullscreen && 'fixed inset-0 z-50',
        className
      )}
    >
      <PreviewHeader
        deviceMode={deviceMode}
        setDeviceMode={setDeviceMode}
        onRefresh={handleRefresh}
        isFullscreen={isFullscreen}
        setIsFullscreen={setIsFullscreen}
        viewMode={viewMode}
        setViewMode={setViewMode}
        hasError={!!lastError}
        isLoading={isLoadingPreview}
        label="Live Preview"
      />

      {/* Next.js → React notice */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--app-accent)]/5 border-b border-[var(--app-border)] shrink-0">
        <Info className="h-3 w-3 text-[var(--app-accent)] shrink-0" />
        <span className="text-[10px] text-[var(--app-text-muted)] leading-tight">
          In-browser preview — Next.js server features are stubbed
        </span>
      </div>

      <div className={previewViewportClassName}>
        <div
          className="bg-white rounded-[4px] shadow-lg overflow-hidden transition-all duration-300 flex flex-col flex-1 min-h-0"
          style={{ width: currentDevice.width, maxWidth: '100%' }}
        >
          <SandpackProvider
            key={nonce}
            template={sandpackBundle.template}
            theme={sandpackTheme}
            files={sandpackBundle.files}
            customSetup={{ dependencies: sandpackBundle.dependencies }}
            options={{
              recompileMode: 'delayed',
              recompileDelay: 800,
              bundlerURL: 'https://sandpack-bundler.codesandbox.io',
              externalResources: [
                'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
              ],
            }}
          >
            <div className="flex-1 min-h-0 w-full h-full">
              {viewMode === 'preview' ? (
                <SandpackPreview
                  className="h-full w-full"
                  showNavigator={false}
                  showOpenInCodeSandbox={false}
                  showRefreshButton={false}
                  onLoad={() => setIsLoadingPreview(false)}
                />
              ) : (
                <SandpackConsole
                  className="h-full w-full"
                  showHeader={false}
                />
              )}
            </div>
          </SandpackProvider>
        </div>
      </div>

      {/* Runtime error from iframe */}
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

      <PreviewStatusBar deviceMode={deviceMode} engine="React/Sandpack" />
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function PreviewHeader({
  deviceMode,
  setDeviceMode,
  onRefresh,
  isFullscreen,
  setIsFullscreen,
  viewMode,
  setViewMode,
  hasError,
  isLoading,
  label,
}: {
  deviceMode: DeviceMode;
  setDeviceMode: (m: DeviceMode) => void;
  onRefresh: () => void;
  isFullscreen: boolean;
  setIsFullscreen: (v: boolean) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  hasError: boolean;
  isLoading: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 h-11 shrink-0 bg-[var(--app-panel-2)] border-b border-[var(--app-border)]">
      <div className="flex items-center gap-2.5">
        <Play className="h-3.5 w-3.5 text-[var(--app-accent)]" />
        <span className="text-[12px] font-semibold tracking-tight text-[var(--app-text)]">
          {label}
        </span>
        {hasError && (
          <span className="inline-flex items-center h-4 px-1.5 text-[9px] font-black uppercase rounded bg-[var(--app-danger-soft)] text-[var(--app-danger)]">
            Error
          </span>
        )}
        {!isLoading && !hasError && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--app-success-soft)] border border-[var(--app-success)]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--app-success)] animate-pulse" />
            <span className="text-[9px] font-semibold text-[var(--app-success)] uppercase tracking-widest">
              Live
            </span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {/* Preview / Console toggle */}
        <div className="flex items-center bg-[var(--app-panel)] rounded-[6px] p-0.5 border border-[var(--app-border)]">
          <button
            onClick={() => setViewMode('preview')}
            className={cn(
              'h-6 px-2 rounded-[4px] flex items-center gap-1 text-[10px] font-medium transition-colors',
              viewMode === 'preview'
                ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            )}
          >
            <Eye className="h-3 w-3" />
            Preview
          </button>
          <button
            onClick={() => setViewMode('console')}
            className={cn(
              'h-6 px-2 rounded-[4px] flex items-center gap-1 text-[10px] font-medium transition-colors',
              viewMode === 'console'
                ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            )}
          >
            <Terminal className="h-3 w-3" />
            Console
          </button>
        </div>

        {/* Device switcher */}
        <div className="hidden sm:flex items-center bg-[var(--app-panel)] rounded-[6px] p-0.5 border border-[var(--app-border)]">
          {(['mobile', 'tablet', 'desktop'] as DeviceMode[]).map((mode) => {
            const Icon = mode === 'mobile' ? Smartphone : mode === 'tablet' ? Tablet : Monitor;
            return (
              <button
                key={mode}
                onClick={() => setDeviceMode(mode)}
                className={cn(
                  'h-6 w-7 rounded-[4px] flex items-center justify-center transition-colors',
                  deviceMode === mode
                    ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                )}
                title={DEVICE_CONFIG[mode].label}
              >
                <Icon className="h-3 w-3" />
              </button>
            );
          })}
        </div>

        <button
          className="h-7 w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
          onClick={onRefresh}
          title="Refresh preview"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>

        <button
          className="h-7 w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
          onClick={() => setIsFullscreen(!isFullscreen)}
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

function PreviewStatusBar({ deviceMode, engine }: { deviceMode: DeviceMode; engine: string }) {
  return (
    <div className="h-5 px-3 flex items-center justify-between shrink-0 bg-[var(--app-panel-2)] border-t border-[var(--app-border)]">
      <span className="text-[9px] text-[var(--app-text-dim)] uppercase tracking-widest">
        {engine}
      </span>
      <span className="text-[9px] text-[var(--app-text-dim)] uppercase tracking-widest">
        {DEVICE_CONFIG[deviceMode].label}
        {deviceMode !== 'desktop' && ` · ${DEVICE_CONFIG[deviceMode].width}`}
      </span>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
      <AlertCircle className="h-10 w-10 text-[var(--app-danger)]" />
      <div>
        <p className="text-sm font-semibold text-[var(--app-danger)] mb-1">Preview Failed</p>
        <p className="text-xs text-[var(--app-text-muted)] max-w-sm break-words">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="h-8 px-4 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)] text-[11px] font-semibold hover:bg-[var(--app-panel-2)] transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

function StartingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="relative">
        <div className="w-14 h-14 rounded-[8px] border-2 border-[var(--app-accent)]/30 animate-spin [animation-duration:3s]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="h-5 w-5 text-[var(--app-accent)]" />
        </div>
      </div>
      <p className="text-[11px] font-semibold text-[var(--app-accent)] uppercase tracking-[0.3em] animate-pulse">
        Starting {label}
      </p>
    </div>
  );
}
