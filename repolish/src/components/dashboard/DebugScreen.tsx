import React, { useState } from 'react';
import { DesignTokens, mapRadiusCard, mapRadiusButton, mapPaddingCard, mapGapSize, mapShadowCard, mapBorderWidth, mapSizeScale } from '../../types';
import { 
  ShieldCheck, ShieldAlert, AlertCircle, Sparkles, Terminal, Activity, Trash2, 
  Search, Play, RefreshCw, Layers, Server, Cpu, Database, ChevronRight, X
} from 'lucide-react';

interface DebugScreenProps {
  tokens: DesignTokens;
}

export default function DebugScreen({ tokens }: DebugScreenProps) {
  const isBrutalist = tokens.primary === '#000000' && tokens.background === '#fef08a';

  const radiusCard = mapRadiusCard(tokens.radiusCard);
  const radiusBtn = mapRadiusButton(tokens.radiusButton);
  const paddingCard = mapPaddingCard(tokens.paddingCard);
  const gap = mapGapSize(tokens.gapSize);
  const shadow = mapShadowCard(tokens.shadowCard, isBrutalist);
  const border = mapBorderWidth(tokens.borderWidth);
  const sizes = mapSizeScale(tokens.sizeScale);

  // Debug session cases
  const [sessions, setSessions] = useState([
    { id: 'dbg-942', title: 'React hydration mismatch error', severity: 'High', date: 'Today, 18:24', status: 'Unresolved', category: 'Frontend' },
    { id: 'dbg-941', title: 'OAuth loop redirect state error', severity: 'Critical', date: 'Yesterday, 14:15', status: 'In Progress', category: 'Auth' },
    { id: 'dbg-940', title: 'Memory leak in streaming client', severity: 'Medium', date: 'May 27, 09:12', status: 'Resolved', category: 'Performance' },
    { id: 'dbg-939', title: 'Stripe webhook security validation failure', severity: 'High', date: 'May 25, 11:42', status: 'Resolved', category: 'Billing' },
    { id: 'dbg-938', title: 'GCP Cold start server latency spike', severity: 'Low', date: 'May 22, 17:01', status: 'Resolved', category: 'Devops' }
  ]);

  const [search, setSearch] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('dbg-942');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Find currently active session object
  const activeSession = sessions.find(s => s.id === selectedSessionId) || sessions[0];

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(search.toLowerCase()) || 
    s.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteConfirm = () => {
    if (!deleteId) return;
    setSessions(sessions.filter(s => s.id !== deleteId));
    if (selectedSessionId === deleteId) {
      const remaining = sessions.filter(s => s.id !== deleteId);
      if (remaining.length > 0) {
        setSelectedSessionId(remaining[0].id);
      }
    }
    setDeleteId(null);
  };

  return (
    <div className="flex flex-col gap-5 text-left h-full" id="debug-canvas">
      
      {/* 4.1 Delete Confirm Dialog Modal Popup Overlay */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 animate-fade-in backdrop-blur-sm">
          <div 
            className="w-full max-w-sm border p-6 bg-slate-900 shadow-2xl animate-scale-up"
            style={{ borderRadius: radiusCard, borderColor: tokens.border }}
          >
            <h4 className="font-bold text-slate-100 flex items-center gap-1.5 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-500" /> Confirm Case Deletion
            </h4>
            <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
              Are you confident you want to delete session <span className="font-mono text-violet-400 font-bold">{deleteId}</span>? This database removal action is permanent.
            </p>

            <div className="mt-5 flex justify-end gap-2.5 text-xs font-semibold">
              <button 
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 rounded text-slate-300 transition-colors cursor-pointer"
              >
                Keep Case
              </button>
              <button 
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded transition-colors cursor-pointer"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4.2 Split panels: Left history list, Right content analyzer details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-stretch">
        
        {/* Column 1: History of Sessions list (Span 5) */}
        <div 
          className={`lg:col-span-5 border flex flex-col justify-between overflow-hidden min-h-[300px] ${radiusCard} ${shadow} ${border}`}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="p-4 border-b flex flex-col gap-3" style={{ borderColor: tokens.border }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs" style={{ color: tokens.textPrimary }}>Incident Tracker History</h3>
                <p className="text-[10px]" style={{ color: tokens.textSecondary }}>Explore active telemetry dump exceptions</p>
              </div>
              <span className="text-[10px] bg-slate-950 font-bold font-mono px-2 py-0.5 rounded text-violet-400 border border-slate-800/80">
                {sessions.length} CASES
              </span>
            </div>

            {/* Filter Input */}
            <div className="flex items-center gap-2 bg-slate-950/40 p-2 border rounded" style={{ borderColor: tokens.border }}>
              <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input 
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search error signatures or ref..."
                className="w-full bg-transparent outline-none text-xs text-slate-100 placeholder-slate-600"
              />
            </div>
          </div>

          {/* List Scroll Area */}
          <div className="flex-1 p-3 overflow-y-auto max-h-[250px] lg:max-h-[360px] space-y-2">
            {filteredSessions.map((session) => {
              const isSelected = selectedSessionId === session.id;
              return (
                <div 
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`p-3 border transition-all text-xs cursor-pointer flex items-center justify-between gap-3 ${isSelected ? 'bg-violet-950/15 border-violet-500/80 shadow-[0_0_8px_rgba(99,102,241,0.08)]' : 'bg-slate-950/20 border-slate-800/80 hover:border-slate-700'}`}
                  style={{ borderRadius: radiusBtn }}
                >
                  <div className="flex flex-col gap-1 min-w-0 text-left">
                    <span className="font-bold text-slate-100 truncate inline-block" style={isSelected ? { color: tokens.primary } : {}}>
                      {session.title}
                    </span>
                    <span className="text-[10px] text-slate-550 inline-block truncate" style={{ color: tokens.textSecondary }}>
                      Ref: {session.id} • {session.category} • {session.date}
                    </span>
                  </div>

                  {/* Badges/Delete Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                      session.status === 'Resolved' 
                        ? 'text-emerald-400 bg-emerald-950/30' 
                        : session.status === 'In Progress' 
                          ? 'text-amber-500 bg-amber-950/30' 
                          : 'text-rose-400 bg-rose-950/30'
                    }`}>
                      {session.status}
                    </span>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(session.id);
                      }}
                      className="p-1 hover:text-rose-500 text-slate-500 rounded cursor-pointer"
                      title="Delete case database session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredSessions.length === 0 && (
              <p className="text-center py-10 opacity-60 text-xs">No matching telemetry debug logs encountered.</p>
            )}
          </div>
        </div>

        {/* Column 2: Detailed Content display analysis (Span 7) */}
        <div 
          className={`lg:col-span-7 border flex flex-col justify-between overflow-hidden min-h-[300px] ${radiusCard} ${shadow} ${border}`}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          {activeSession ? (
            <div className="flex flex-col h-full divide-y" style={{ borderColor: tokens.border }}>
              {/* Header block with badges */}
              <div className={`${paddingCard} flex flex-col gap-2.5 bg-slate-950/10`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[10px] font-mono tracking-wide text-rose-450 bg-rose-950/40 px-2 py-0.5 rounded font-bold uppercase">
                    SEVERITY: {activeSession.severity}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{activeSession.date}</span>
                </div>

                <h3 className="font-extrabold text-sm md:text-base leading-tight" style={{ color: tokens.textPrimary }}>
                  {activeSession.title}
                </h3>
                
                <p className="text-xs" style={{ color: tokens.textSecondary }}>
                  Diagnostic scope associated with module <span className="font-bold underline" style={{ color: tokens.secondary }}>{activeSession.category} Gateway</span>. Exception triggers registered on multi-user socket connection.
                </p>
              </div>

              {/* Middle trace display */}
              <div className={`${paddingCard} flex-1 flex flex-col gap-4 text-xs font-mono`}>
                <div className="flex items-center justify-between mb-1 pb-1 border-b border-dashed" style={{ borderColor: tokens.border }}>
                  <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold">Trace Stack Dump (Crashed Node)</span>
                  <span className="text-[9px] text-red-400 font-bold">UNREALIZED FAULT</span>
                </div>

                {activeSession.id === 'dbg-942' ? (
                  <pre className="bg-slate-950 p-3 rounded text-[10px] text-rose-300 leading-relaxed overflow-x-auto border" style={{ borderColor: tokens.border }}>
{`ReferenceError: Cannot find variable: window in Server-Side Rendering (SSR)
  at src/app/dashboard/home/page.tsx:21:4
  at hydrateRoot (react-dom-server.node.js:1422:15)
  at renderClientSideComponent (express-proxy.ts:84:12)
  at processTicksAndRejections (node:internal/process/task_queues:95:5)`}
                  </pre>
                ) : activeSession.id === 'dbg-941' ? (
                  <pre className="bg-slate-950 p-3 rounded text-[10px] text-amber-300 leading-relaxed overflow-x-auto border" style={{ borderColor: tokens.border }}>
{`OAuthRedirectLoopException: Loop detected on callback State Token (1415Z)
  at node_modules/@google/oauth/client.js:1224:19
  at handleSessionVerify (server.ts:412:9)
  at next (express-router.js:284:7)`}
                  </pre>
                ) : (
                  <pre className="bg-slate-950 p-3 rounded text-[10px] text-slate-400 leading-relaxed overflow-x-auto border" style={{ borderColor: tokens.border }}>
{`Diagnostics Completed. Memory Pool garbage gathered successfully.
Leaks identified inside streaming socket reader pipeline. 
Re-compile completed. Code fully operational.`}
                  </pre>
                )}

                {/* Subsystem Metrics info grid widget */}
                <div className="grid grid-cols-2 gap-3 pt-2 font-sans font-medium text-slate-300">
                  <div className="p-2.5 bg-slate-950/40 rounded border flex flex-col justify-center gap-0.5" style={{ borderColor: tokens.border }}>
                    <span className="text-[10px] text-slate-500 font-mono">INCIDENT PROCESSOR</span>
                    <span className="text-xs text-slate-200">Antigravity Core VM v24.2</span>
                  </div>
                  <div className="p-2.5 bg-slate-950/40 rounded border flex flex-col justify-center gap-0.5" style={{ borderColor: tokens.border }}>
                    <span className="text-[10px] text-slate-500 font-mono">DATABASE SECTOR</span>
                    <span className="text-xs text-slate-200">GCP Spanner Cluster-5</span>
                  </div>
                </div>
              </div>

              {/* CTA Action Bar inside debug detailed panel */}
              <div className="p-4 bg-slate-950/30 flex justify-end gap-2.5 text-xs font-semibold">
                <button 
                  onClick={() => alert('Starting secure automated tracer scan in background environment...')}
                  className="px-4 py-2 border rounded cursor-pointer transition-all hover:bg-slate-900 bg-transparent text-slate-200"
                  style={{ borderColor: tokens.border, borderRadius: radiusBtn }}
                >
                  Run Tracer Audit
                </button>
                <button 
                  onClick={() => alert('Applying automated AI refactor fix to state file. Re-compiling.')}
                  className="px-4 py-2 text-white cursor-pointer active:scale-97 transition-colors"
                  style={{ backgroundColor: tokens.primary, borderRadius: radiusBtn }}
                >
                  AI Diagnostic Fix
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center py-20 text-xs opacity-60">
              Select any debug session case signature on the left panel to inspect system variables.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
