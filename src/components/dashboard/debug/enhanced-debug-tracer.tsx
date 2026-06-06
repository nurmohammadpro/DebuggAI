/**
 * Enhanced Debug Tracer Component
 *
 * Comprehensive debugging interface with tracing, code execution, and inspection
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bug, Play, Pause, RefreshCw, ChevronDown, ChevronRight, Eye, Save, FolderOpen, Download, Info } from 'lucide-react';
import { toast } from 'sonner';

interface TraceStep {
  id: string;
  line: number;
  timestamp: number;
  type: 'step' | 'breakpoint' | 'error' | 'console';
  message?: string;
  variables?: Record<string, unknown>;
  duration?: number;
}

interface Variable {
  name: string;
  value: unknown;
  type: string;
  scope: 'local' | 'global' | 'closure';
}

interface Breakpoint {
  line: number;
  enabled: boolean;
  condition?: string;
}

export function EnhancedDebugTracer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLine, setCurrentLine] = useState(1);
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(`function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("Calculating fibonacci(10)...");
const result = fibonacci(10);
console.log("Result:", result);`);

  const [traceSteps, setTraceSteps] = useState<TraceStep[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [consoleOutput, setConsoleOutput] = useState<Array<{ timestamp: number; type: 'log' | 'error' | 'warn'; message: string }>>([]);
  const [expandedScopes, setExpandedScopes] = useState<Set<string>>(new Set(['local', 'global']));
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  const executionRef = useRef<number | null>(null);
  const traceStartTime = useRef<number>(0);

  // Simulate variable updates
  useEffect(() => {
    if (isRunning && !isPaused) {
      const mockVariables: Variable[] = [
        { name: 'n', value: currentLine * 2, type: 'number', scope: 'local' },
        { name: 'fibonacci', value: 'function', type: 'function', scope: 'global' },
        { name: 'result', value: currentLine * 3, type: 'number', scope: 'local' },
        { name: 'console', value: 'Object', type: 'object', scope: 'global' },
      ];
      setVariables(mockVariables);
    }
  }, [isRunning, isPaused, currentLine]);

  const handleRun = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setIsPaused(false);
    traceStartTime.current = Date.now();
    setTraceSteps([]);
    setConsoleOutput([]);

    toast.success('Debug session started');

    // Simulate code execution
    simulateExecution();
  };

  const simulateExecution = () => {
    let line = 1;
    const lines = code.split('\n');

    executionRef.current = window.setInterval(() => {
      if (line <= lines.length) {
        setCurrentLine(line);

        const step: TraceStep = {
          id: `step-${line}`,
          line,
          timestamp: Date.now() - traceStartTime.current,
          type: 'step',
          message: lines[line - 1]?.trim() || '',
          duration: Math.random() * 100,
        };

        setTraceSteps(prev => [...prev, step]);

        // Check for breakpoints
        const breakpoint = breakpoints.find(bp => bp.line === line && bp.enabled);
        if (breakpoint) {
          setIsPaused(true);
          toast.info(`Breakpoint hit at line ${line}`);
          return;
        }

        // Simulate console.log
        if (lines[line - 1]?.includes('console.log')) {
          const logMatch = lines[line - 1]?.match(/console\.log\("(.+?)"(?:,\s*(.+))?\)/);
          if (logMatch) {
            setConsoleOutput(prev => [...prev, {
              timestamp: Date.now(),
              type: 'log',
              message: logMatch[1] + (logMatch[2] ? ` ${logMatch[2]}` : ''),
            }]);
          }
        }

        line++;
      } else {
        // Execution complete
        clearInterval(executionRef.current!);
        setIsRunning(false);
        setIsPaused(false);
        toast.success('Execution completed');
      }
    }, 1000);
  };

  const handlePause = () => {
    setIsPaused(true);
    toast.info('Execution paused');
  };

  const handleContinue = () => {
    setIsPaused(false);
    toast.info('Execution resumed');
    simulateExecution();
  };

  const handleStepOver = () => {
    if (!isPaused) return;
    setCurrentLine(prev => Math.min(prev + 1, code.split('\n').length));
    toast.info('Step over');
  };

  const handleReset = () => {
    if (executionRef.current) {
      clearInterval(executionRef.current);
    }
    setIsRunning(false);
    setIsPaused(false);
    setCurrentLine(1);
    setTraceSteps([]);
    setConsoleOutput([]);
    toast.info('Debug session reset');
  };

  const handleToggleBreakpoint = (line: number) => {
    setBreakpoints(prev => {
      const existing = prev.find(bp => bp.line === line);
      if (existing) {
        return prev.filter(bp => bp.line !== line);
      } else {
        return [...prev, { line, enabled: true }];
      }
    });
  };

  const handleToggleScope = (scope: string) => {
    setExpandedScopes(prev => {
      const next = new Set(prev);
      if (next.has(scope)) {
        next.delete(scope);
      } else {
        next.add(scope);
      }
      return next;
    });
  };

  const handleExportTrace = () => {
    const traceData = {
      sessionId,
      language,
      code,
      traceSteps,
      variables,
      consoleOutput,
      breakpoints,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(traceData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-trace-${sessionId || Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Trace exported successfully');
  };

  const handleSaveSession = () => {
    toast.success('Debug session saved');
  };

  return (
    <div className="min-h-[calc(100dvh-56px)] h-[calc(100dvh-56px)] flex flex-col bg-[var(--app-bg)]">
      <div className="shrink-0 border-b border-[var(--app-border)] bg-[var(--app-accent-soft)] px-3 sm:px-4 py-2 text-[12px] text-[var(--app-text)]">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-accent)]" />
          <p>
            Prototype mode: this screen currently simulates stepping, variables, and console output locally.
            It is not connected to the AI debug analyzer or a real execution sandbox yet.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 sm:px-4 py-2 bg-[var(--app-panel)] border-b border-[var(--app-border)]">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="touch-target rounded-lg bg-[var(--app-accent)] text-[#071006] hover:opacity-90 active:scale-[0.96] disabled:opacity-50 transition-opacity"
            title="Run"
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            onClick={isPaused ? handleContinue : handlePause}
            disabled={!isRunning}
            className="touch-target rounded-lg bg-[var(--app-panel-2)] text-[var(--app-text)] hover:bg-[var(--app-surface)] active:scale-[0.96] disabled:opacity-50 transition-colors"
            title={isPaused ? 'Continue' : 'Pause'}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={handleStepOver}
            disabled={!isPaused}
            className="touch-target rounded-lg bg-[var(--app-panel-2)] text-[var(--app-text)] hover:bg-[var(--app-surface)] active:scale-[0.96] disabled:opacity-50 transition-colors"
            title="Step Over"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            disabled={!isRunning && traceSteps.length === 0}
            className="touch-target rounded-lg bg-[var(--app-panel-2)] text-[var(--app-text)] hover:bg-[var(--app-surface)] active:scale-[0.96] disabled:opacity-50 transition-colors"
            title="Reset"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex min-h-11 items-center gap-2 text-xs text-[var(--app-text-muted)]">
            <Bug className="w-4 h-4" />
            <span>{language}</span>
            <span className="rounded-full border border-[var(--app-border)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
              simulated
            </span>
          </div>
          <div className="h-4 w-px bg-[var(--app-border)]" />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveSession}
              className="touch-target rounded-lg bg-[var(--app-panel-2)] text-[var(--app-text)] hover:bg-[var(--app-surface)] active:scale-[0.96] transition-colors"
              title="Save Session"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportTrace}
              className="touch-target rounded-lg bg-[var(--app-panel-2)] text-[var(--app-text)] hover:bg-[var(--app-surface)] active:scale-[0.96] transition-colors"
              title="Export Trace"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Code Editor Panel */}
        <div className="flex-1 min-h-0 flex flex-col lg:border-r border-[var(--app-border)]">
          {/* Editor Header */}
          <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2 bg-[var(--app-panel)] border-b border-[var(--app-border)]">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[var(--app-text-dim)]" />
              <span className="text-sm font-medium text-[var(--app-text)]">debug-trace.js</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${isRunning ? 'bg-[var(--app-success-soft)] text-[var(--app-success)]' : 'bg-[var(--app-panel-2)] text-[var(--app-text-muted)]'}`}>
                {isRunning ? (isPaused ? 'Paused' : 'Running') : 'Ready'}
              </span>
            </div>
          </div>
          <div className="shrink-0 border-b border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 text-[11px] text-[var(--app-text-dim)] sm:hidden">
            Swipe horizontally in the code area to read long lines.
          </div>

          {/* Code Editor */}
          <div className="flex-1 overflow-auto p-2 sm:p-4 font-mono text-[13px] sm:text-sm bg-[var(--app-bg)]">
            <div className="relative min-w-max">
              {code.split('\n').map((line, index) => {
                const lineNumber = index + 1;
                const isCurrentLine = lineNumber === currentLine;
                const hasBreakpoint = breakpoints.some(bp => bp.line === lineNumber && bp.enabled);
                const isTraceLine = traceSteps.some(step => step.line === lineNumber);

                return (
                  <div
                    key={lineNumber}
                    className={`flex group relative min-h-8 sm:min-h-6 items-center ${
                      isCurrentLine ? 'bg-[var(--app-accent-soft)]' : isTraceLine ? 'bg-[var(--app-surface)]' : ''
                    }`}
                  >
                    {/* Line Number */}
                    <div
                      className={`w-14 sm:w-12 min-h-8 sm:min-h-6 text-right pr-3 select-none cursor-pointer touch-manipulation ${
                        isCurrentLine ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-dim)]'
                      }`}
                      onClick={() => handleToggleBreakpoint(lineNumber)}
                    >
                      {lineNumber}
                    </div>

                    {/* Breakpoint Indicator */}
                    <div className="w-8 sm:w-6 flex items-center justify-center">
                      {hasBreakpoint && (
                        <div className="w-2 h-2 rounded-full bg-[var(--app-danger)]" />
                      )}
                    </div>

                    {/* Code */}
                    <div className={`flex-1 ${isCurrentLine ? 'text-[var(--app-accent)]' : 'text-[var(--app-text)]'}`}>
                      {line || ' '}
                    </div>

                    {/* Current Line Indicator */}
                    {isCurrentLine && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <div className="w-2 h-2 rounded-full bg-[var(--app-accent)] animate-pulse" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="h-[42dvh] min-h-[320px] lg:h-auto lg:min-h-0 w-full lg:w-80 flex flex-col bg-[var(--app-panel)] border-t lg:border-t-0 border-[var(--app-border)]">
          {/* Tabs */}
          <div className="flex border-b border-[var(--app-border)]">
            <button className="flex-1 min-h-11 px-4 py-2 text-xs font-medium text-[var(--app-accent)] border-b-2 border-[var(--app-accent)] touch-manipulation">
              Variables
            </button>
            <button className="flex-1 min-h-11 px-4 py-2 text-xs font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)] touch-manipulation">
              Trace
            </button>
            <button className="flex-1 min-h-11 px-4 py-2 text-xs font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)] touch-manipulation">
              Console
            </button>
          </div>

          {/* Variables Panel */}
          <div className="flex-1 overflow-auto p-3">
            {variables.length === 0 ? (
              <div className="text-center py-8">
                <Eye className="w-8 h-8 text-[var(--app-text-dim)] mx-auto mb-2" />
                <p className="text-xs text-[var(--app-text-muted)]">No variables to display</p>
                <p className="text-xs text-[var(--app-text-dim)] mt-1">Run the code to see variables</p>
              </div>
            ) : (
              <div className="space-y-2">
                {['local', 'global', 'closure'].map(scope => {
                  const scopeVariables = variables.filter(v => v.scope === scope);
                  if (scopeVariables.length === 0) return null;

                  const isExpanded = expandedScopes.has(scope);

                  return (
                    <div key={scope} className="border border-[var(--app-border)] rounded-lg overflow-hidden">
                      <button
                        onClick={() => handleToggleScope(scope)}
                        className="w-full min-h-11 flex items-center justify-between px-3 py-2 bg-[var(--app-surface)] hover:bg-[var(--app-panel-2)] transition-colors touch-manipulation"
                      >
                        <span className="text-xs font-medium text-[var(--app-text)] capitalize">{scope}</span>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--app-text-dim)]" /> : <ChevronRight className="w-4 h-4 text-[var(--app-text-dim)]" />}
                      </button>
                      {isExpanded && (
                        <div className="p-2 space-y-1">
                          {scopeVariables.map(variable => (
                            <div key={variable.name} className="min-h-9 flex items-center justify-between gap-3 px-2 py-1 rounded hover:bg-[var(--app-surface)]">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-[var(--app-text)]">{variable.name}</span>
                                <span className="text-xs text-[var(--app-text-dim)]">({variable.type})</span>
                              </div>
                              <span className="text-xs text-[var(--app-text-muted)] font-mono">
                                {String(variable.value).slice(0, 20)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trace Timeline */}
          <div className="h-48 border-t border-[var(--app-border)] p-3 overflow-auto">
            <h3 className="text-xs font-medium text-[var(--app-text)] mb-2">Execution Timeline</h3>
            {traceSteps.length === 0 ? (
              <p className="text-xs text-[var(--app-text-muted)] text-center py-4">No execution trace yet</p>
            ) : (
              <div className="space-y-1">
                {traceSteps.slice(-10).map(step => (
                  <div
                    key={step.id}
                    onClick={() => {
                      setSelectedTraceId(step.id);
                      setCurrentLine(step.line);
                    }}
                    className={`min-h-10 flex items-center gap-2 px-2 py-1 rounded cursor-pointer touch-manipulation ${
                      selectedTraceId === step.id ? 'bg-[var(--app-accent-soft)]' : 'hover:bg-[var(--app-surface)]'
                    }`}
                  >
                    <span className="text-xs text-[var(--app-text-dim)] w-8">L{step.line}</span>
                    <span className="text-xs text-[var(--app-text-muted)] flex-1 truncate">{step.message}</span>
                    <span className="text-xs text-[var(--app-text-dim)]">{Math.round(step.duration || 0)}ms</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Console Output */}
          <div className="h-36 sm:h-32 border-t border-[var(--app-border)] p-3 overflow-auto">
            <h3 className="text-xs font-medium text-[var(--app-text)] mb-2">Console Output</h3>
            {consoleOutput.length === 0 ? (
              <p className="text-xs text-[var(--app-text-muted)] text-center py-2">No console output</p>
            ) : (
              <div className="space-y-1">
                {consoleOutput.map((log, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className={`text-xs ${log.type === 'error' ? 'text-[var(--app-danger)]' : log.type === 'warn' ? 'text-[var(--app-warning)]' : 'text-[var(--app-text-muted)]'}`}>
                      [{log.type}]
                    </span>
                    <span className="text-xs text-[var(--app-text)] flex-1">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
