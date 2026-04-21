/**
 * Preview Pane Component
 *
 * Iframe sandbox for live code preview.
 * Captures runtime errors via postMessage.
 */

'use client';

import { useEffect, useRef, useCallback, type ElementType } from 'react';
import { useGenerationStore } from '@/store/generation-store';
import { buildPreviewTSX } from '@/lib/preview-builder';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PreviewPaneProps {
  height?: string;
  className?: string;
  chromeless?: boolean;
}

export function PreviewPane({
  height = '600px',
  className,
  chromeless = false,
}: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const {
    currentCode,
    versions,
    currentVersionId,
    setCurrentVersion,
    lastError,
    setLastError,
    previewNonce,
  } =
    useGenerationStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const updatePreview = useCallback((code: string) => {
    if (!iframeRef.current) return;

    const html = buildPreviewTSX(code);
    const iframe = iframeRef.current;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    iframe.src = url;

    // Clean up object URL when iframe loads
    iframe.onload = () => {
      URL.revokeObjectURL(url);
    };
  }, []);

  // Debounced update function
  const debouncedUpdate = useCallback((code: string) => {
    const timeoutId = setTimeout(() => {
      updatePreview(code);
    }, 500); // 500ms debounce
    return () => clearTimeout(timeoutId);
  }, [updatePreview]);

  // Listen for errors from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'runtime-error') {
        setLastError(event.data.payload);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setLastError]);

  // Update preview when code changes (debounced)
  useEffect(() => {
    if (currentCode) {
      debouncedUpdate(currentCode);
    }
  }, [currentCode, debouncedUpdate]);

  // Force refresh (Run button)
  useEffect(() => {
    if (!currentCode) return;
    updatePreview(currentCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewNonce]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    updatePreview(currentCode);
    setLastError(null); // Clear errors on refresh
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleVersionChange = (versionId: string) => {
    setCurrentVersion(versionId);
    const version = versions.find((v) => v.id === versionId);
    if (version) {
      updatePreview(version.code);
      setLastError(null);
    }
  };

  const currentVersion = versions.find((v) => v.id === currentVersionId);
  const Container: ElementType = chromeless ? 'div' : Card;

  return (
    <Container className={`overflow-hidden flex flex-col ${className || ''}`} style={{ height }}>
      {/* Header */}
      <div
        className={`border-b flex items-center justify-between ${
          chromeless ? 'border-border/40 px-3 h-11 bg-card' : 'px-4 py-2 bg-muted/50'
        }`}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Live Preview</h3>
          {lastError && (
            <Badge variant="red" className="text-xs">
              Error
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Version Selector */}
          {versions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  {currentVersion?.description ||
                    `Version ${
                      versions.findIndex((v) => v.id === currentVersionId) + 1
                    }`}
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {versions.map((version, index) => (
                  <DropdownMenuItem
                    key={version.id}
                    onClick={() => handleVersionChange(version.id)}
                    className={version.id === currentVersionId ? 'bg-accent' : ''}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {version.description || `Version ${index + 1}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(version.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          {/* Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Iframe */}
      {!isCollapsed && (
        <div className="flex-1 min-h-0 bg-background">
          <iframe
            ref={iframeRef}
            title="Preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}

      {/* Error Display */}
      {lastError && !isCollapsed && (
        <div className="border-t p-4 bg-destructive/10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-destructive mb-1">Runtime Error</h4>
              <p className="text-sm text-destructive/80">{lastError.message}</p>
              {lastError.lineno && (
                <p className="text-xs text-muted-foreground mt-1">
                  Line {lastError.lineno}
                  {lastError.colno && `, Column ${lastError.colno}`}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLastError(null)}
              className="h-8"
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </Container>
  );
}
