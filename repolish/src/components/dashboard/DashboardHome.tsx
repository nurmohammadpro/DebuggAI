import React, { useState } from 'react';
import { DesignTokens, mapRadiusCard, mapRadiusButton, mapPaddingCard, mapGapSize, mapShadowCard, mapBorderWidth, mapSizeScale } from '../../types';
import { 
  TrendingUp, Activity, Play, Zap, Plus, ArrowRight, CheckCircle2, 
  Terminal, ShieldAlert, Cpu, Server, Layers, HelpCircle, Sparkles, Send
} from 'lucide-react';

interface DashboardHomeProps {
  tokens: DesignTokens;
  onNavigate: (tab: string) => void;
}

export default function DashboardHome({ tokens, onNavigate }: DashboardHomeProps) {
  const isBrutalist = tokens.primary === '#000000' && tokens.background === '#fef08a';
  
  const radiusCard = mapRadiusCard(tokens.radiusCard);
  const radiusBtn = mapRadiusButton(tokens.radiusButton);
  const paddingCard = mapPaddingCard(tokens.paddingCard);
  const gap = mapGapSize(tokens.gapSize);
  const shadow = mapShadowCard(tokens.shadowCard, isBrutalist);
  const border = mapBorderWidth(tokens.borderWidth);
  const sizes = mapSizeScale(tokens.sizeScale);

  // Home state
  const [composerPrompt, setComposerPrompt] = useState('');
  const [compilerRuns, setCompilerRuns] = useState([
    { id: 'run-102', target: 'auth-gateway', status: 'success', latency: '42ms', timestamp: '2 mins ago' },
    { id: 'run-101', target: 'postgres-pool', status: 'success', latency: '115ms', timestamp: '14 mins ago' },
    { id: 'run-100', target: 'stripe-webhook', status: 'failed', latency: '340ms', timestamp: '1 hr ago' },
  ]);

  const [debugSessions, setDebugSessions] = useState([
    { id: 'dbg-942', title: 'React hydration mismatch error', severity: 'High', date: 'Today, 18:24' },
    { id: 'dbg-941', title: 'OAuth loop redirect state error', severity: 'Critical', date: 'Yesterday, 14:15' },
    { id: 'dbg-940', title: 'Memory leak in streaming response client', severity: 'Medium', date: 'May 27, 09:12' },
  ]);

  const handleCompose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerPrompt.trim()) return;
    // Simulate navigation to builder with the prompt pre-filled
    onNavigate('builder');
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* 2.1 Action Composer Display */}
      <div 
        className={`border relative overflow-hidden transition-all ${radiusCard} ${shadow} ${border}`}
        style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        id="composer-container"
      >
        {/* Subtle decorative background glow in corner */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full ambient-aurora pointer-events-none" style={{ background: `radial-gradient(circle, ${tokens.primary}25 0%, transparent 70%)` }} />
        
        <div className={`${paddingCard} relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6`}>
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-full flex items-center justify-center text-white text-xs bg-gradient-to-r from-violet-600 to-indigo-600">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              </span>
              <span className="text-[10px] font-mono tracking-wider text-violet-400 font-bold uppercase">PROMPT COMPOSER ENGINE</span>
            </div>
            <h2 className={`font-semibold tracking-tight ${sizes.title}`} style={{ color: tokens.textPrimary }}>
              What would you like to build or debug today?
            </h2>
            <p className="text-xs max-w-xl" style={{ color: tokens.textSecondary }}>
              Start your next full-stack application by entering a human prompt or paste a stack trace to diagnose bugs instantly.
            </p>
          </div>

          <form onSubmit={handleCompose} className="w-full md:w-auto md:min-w-[340px] flex gap-2">
            <input 
              type="text"
              value={composerPrompt}
              onChange={(e) => setComposerPrompt(e.target.value)}
              placeholder="e.g., Build a real-time multiplayer chess panel..."
              className="flex-grow text-xs border p-3 bg-slate-950/40 outline-none focus:ring-1 focus:ring-violet-500 transition-all text-slate-100 placeholder-slate-500"
              style={{ borderColor: tokens.border, borderRadius: radiusBtn }}
            />
            <button 
              type="submit"
              className="px-4 py-2.5 text-xs font-bold text-white cursor-pointer active:scale-95 transition-transform shrink-0 flex items-center gap-1"
              style={{ backgroundColor: tokens.primary, borderRadius: radiusBtn }}
            >
              <span>Build</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* 2.2 Stats Grid Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-grid">
        {/* Stat Card 1 */}
        <div 
          className={`border transition-all ${radiusCard} ${shadow} ${border} ${paddingCard}`}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-wider uppercase opacity-65">TOTAL DEPLOYMENTS</span>
            <span className="p-1 rounded-full text-indigo-500 bg-indigo-500/10" style={{ color: tokens.primary, backgroundColor: `${tokens.primary}15` }}>
              <Layers className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-2xl font-black mt-2 tracking-tight" style={{ color: tokens.textPrimary }}>14 Active</p>
          <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: tokens.textSecondary }}>
            <span className="text-emerald-500 font-bold">▲ All systems online</span>
          </p>
        </div>

        {/* Stat Card 2 */}
        <div 
          className={`border transition-all ${radiusCard} ${shadow} ${border} ${paddingCard}`}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-wider uppercase opacity-65">AI ENGINE RUNS</span>
            <span className="p-1 rounded-full text-pink-500 bg-pink-55/10" style={{ color: tokens.secondary, backgroundColor: `${tokens.secondary}15` }}>
              <Zap className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-2xl font-black mt-2 tracking-tight" style={{ color: tokens.textPrimary }}>3,842</p>
          <p className="text-[11px] mt-1" style={{ color: tokens.textSecondary }}>
            <span className="text-violet-400 font-semibold">Gemini 3.5 Token-Saving active</span>
          </p>
        </div>

        {/* Stat Card 3 */}
        <div 
          className={`border transition-all ${radiusCard} ${shadow} ${border} ${paddingCard}`}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-wider uppercase opacity-65">DEBUG EFFICIENCY</span>
            <span className="p-1 rounded-full text-amber-500 bg-amber-55/10" style={{ color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
              <Activity className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-2xl font-black mt-2 tracking-tight" style={{ color: tokens.textPrimary }}>99.8%</p>
          <p className="text-[11px] mt-1" style={{ color: tokens.textSecondary }}>
            <span>Average 8.4s recovery speed</span>
          </p>
        </div>

        {/* Stat Card 4 */}
        <div 
          className={`border transition-all ${radiusCard} ${shadow} ${border} ${paddingCard}`}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-wider uppercase opacity-65">COMPILER HEALTH</span>
            <span className="p-1 rounded-full text-emerald-500 bg-emerald-550/10" style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-2xl font-black mt-2 tracking-tight" style={{ color: tokens.textPrimary }}>99.95%</p>
          <p className="text-[11px] mt-1" style={{ color: tokens.textSecondary }}>
            <span>3 incidents registered this month</span>
          </p>
        </div>
      </div>

      {/* 2.3 Split tables grids - Compiler recent runs & Debug sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="tables-grid">
        
        {/* Compiler Runs Table (Col Span 7) */}
        <div 
          className={`border overflow-hidden lg:col-span-7 ${radiusCard} ${shadow} ${border}`}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: tokens.border }}>
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500" style={{ color: tokens.textPrimary }}>Compiler Telemetry</h3>
              <p className="text-[11px]" style={{ color: tokens.textSecondary }}>Real-time execution stats across service meshes</p>
            </div>
            <button 
              onClick={() => onNavigate('builder')}
              className="text-[10px] font-bold px-2.5 py-1 text-white flex items-center gap-1 shrink-0"
              style={{ backgroundColor: tokens.primary, borderRadius: radiusBtn }}
            >
              <Play className="w-2.5 h-2.5" /> Launch Build
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] font-mono tracking-wider text-slate-500 bg-slate-950/40 border-b" style={{ borderColor: tokens.border }}>
                <tr>
                  <th className="p-3">Run ID</th>
                  <th className="p-3">Target Mesh</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Latency</th>
                  <th className="p-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: tokens.border }}>
                {compilerRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-900/10 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-400" style={{ color: tokens.primary }}>{run.id}</td>
                    <td className="p-3 font-medium" style={{ color: tokens.textPrimary }}>{run.target}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                        run.status === 'success' 
                        ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/60' 
                        : 'bg-rose-950/20 text-rose-400 border-rose-900/60'
                      }`}>
                        {run.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 font-mono" style={{ color: tokens.textSecondary }}>{run.latency}</td>
                    <td className="p-3 opacity-80" style={{ color: tokens.textSecondary }}>{run.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Debug Sessions Column (Col Span 5) */}
        <div 
          className={`border overflow-hidden lg:col-span-5 flex flex-col justify-between ${radiusCard} ${shadow} ${border}`}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: tokens.border }}>
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500" style={{ color: tokens.textPrimary }}>Active Bug Cases</h3>
              <p className="text-[11px]" style={{ color: tokens.textSecondary }}>Telemetry exceptions needing attention</p>
            </div>
            <button 
              onClick={() => onNavigate('debug')}
              className="text-[10px] font-semibold text-slate-300 hover:text-slate-100 underline"
            >
              Inspect All
            </button>
          </div>

          <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[190px]">
            {debugSessions.map((session) => (
              <div 
                key={session.id} 
                className="p-3 hover:scale-101 border transition-all text-xs flex flex-row items-center justify-between gap-3 bg-slate-950/20"
                style={{ borderRadius: radiusBtn, borderColor: tokens.border }}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className={`p-1.5 rounded shrink-0 ${
                    session.severity === 'Critical' 
                      ? 'bg-rose-950/30 text-rose-450 border border-rose-900/50' 
                      : session.severity === 'High' 
                        ? 'bg-amber-950/30 text-amber-500 border border-amber-900/50' 
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}>
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold truncate" style={{ color: tokens.textPrimary }}>{session.title}</p>
                    <p className="text-[10px] opacity-75 mt-0.5" style={{ color: tokens.textSecondary }}>Case Ref: {session.id} • {session.date}</p>
                  </div>
                </div>

                <span className={`text-[9px] font-mono tracking-wider font-extrabold uppercase shrink-0 px-2 py-0.5 rounded ${
                  session.severity === 'Critical' 
                    ? 'text-rose-450 bg-rose-950/40' 
                    : session.severity === 'High' 
                      ? 'text-amber-500 bg-amber-950/40' 
                      : 'text-slate-400 bg-slate-900'
                }`}>
                  {session.severity}
                </span>
              </div>
            ))}
          </div>

          {/* Quick actions box on foot */}
          <div className="p-4 bg-slate-950/30 border-t" style={{ borderColor: tokens.border }}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium" style={{ color: tokens.textSecondary }}>Experiencing connection failure?</span>
              <button 
                onClick={() => onNavigate('debug')}
                className="font-bold underline cursor-pointer"
                style={{ color: tokens.primary }}
              >
                Open Hydration Debugger <ArrowRight className="w-3 h-3 inline" />
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
