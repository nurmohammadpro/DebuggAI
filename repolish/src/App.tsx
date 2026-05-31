import React, { useState, useEffect } from 'react';
import { DesignTokens, PRESET_THEMES } from './types';
import TokenEditor from './components/TokenEditor';
import DeviceSimulator from './components/DeviceSimulator';
import MockupApp from './components/MockupApp';
import ExportPanel from './components/ExportPanel';
import { 
  Sparkles, Layers, Sliders, Menu, X, ArrowRight, ShieldCheck, 
  HelpCircle, UserCheck, Clock, Terminal, Github, Star, Zap 
} from 'lucide-react';

export default function App() {
  // Initialize with neutral-slate tokens by default
  const [tokens, setTokens] = useState<DesignTokens>({ ...PRESET_THEMES[0].tokens });
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [systemTime, setSystemTime] = useState<string>('2026-05-29 19:15:36Z');

  // Interactive notification log/history alerts
  const [alerts, setAlerts] = useState<{ id: number; message: string; type: 'info' | 'success' | 'ai' }[]>([
    { id: 1, message: 'RePolish workspace initialized with Neutral Slate preset.', type: 'info' },
  ]);

  // Keep a dynamic simulated clock with default from metadata
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      // Format as YYYY-MM-DD HH:MM:SS UTC
      const utcString = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
      setSystemTime(utcString);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const addAlert = (message: string, type: 'info' | 'success' | 'ai') => {
    setAlerts(prev => [{ id: Date.now(), message, type }, ...prev.slice(0, 4)]);
  };

  // Secure prompt fetching logic sending info to backend
  const handleGenerateAiTheme = async (vibeText: string) => {
    addAlert(`Submitting designer query for "${vibeText}" to Gemini 3.5...`, 'info');
    try {
      const response = await fetch('/api/generate-theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ vibe: vibeText })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Theme generation service was unable to fulfill request.');
      }

      setTokens(data.tokens);
      addAlert(`Cohesive tokens generated for "${vibeText}" using Gemini AI.`, 'ai');
    } catch (err: any) {
      addAlert(`AI Generation failed: ${err.message}`, 'info');
      throw err;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-950 text-slate-100 font-sans transition-colors duration-200">
      
      {/* 1. App Navigation Topbar */}
      <header className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shadow-md relative z-40 shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile Sidebar Trigger button */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded cursor-pointer"
            title="Toggle token parameters panel"
          >
            {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {/* Logo Brand */}
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-gradient-to-tr from-violet-600 to-pink-500 text-white flex items-center justify-center shadow-md">
              <Zap className="w-4 h-4 fill-white" />
            </span>
            <div>
              <h1 className="text-sm font-black tracking-wider uppercase flex items-center gap-1.5">
                RePolish <span className="text-[10px] bg-slate-800 text-slate-400 font-normal px-1.5 py-0.5 rounded border border-slate-700 font-mono tracking-normal">v2.1</span>
              </h1>
              <p className="text-[9px] text-slate-400 hidden sm:block">Modern Fluid Design System Sandbox</p>
            </div>
          </div>
        </div>

        {/* Workspace state / system info: email and active system time */}
        <div className="flex items-center gap-4 text-xs">
          {/* UTC Clock Tracker */}
          <div className="hidden md:flex items-center gap-1.5 text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-850 font-mono">
            <Clock className="w-3.5 h-3.5 text-violet-400" />
            <span>{systemTime}</span>
          </div>

          {/* Developer Badge */}
          <div className="flex items-center gap-2 bg-slate-950/80 pl-2.5 pr-3 py-1 rounded border border-slate-850 text-slate-300">
            <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
              N
            </div>
            <span className="hidden sm:inline font-mono text-[11px] text-slate-400">nurprodev@gmail.com</span>
            <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
          </div>
        </div>
      </header>

      {/* 2. Main Dual Panel Split Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Side panel editor (fixed drawer on mobile, floating inline side pane on PC) */}
        <div 
          className={`absolute lg:relative top-0 left-0 h-full w-[310px] shrink-0 z-30 transform transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden'}`}
        >
          <TokenEditor 
            tokens={tokens}
            setTokens={setTokens}
            isAiGenerating={isAiGenerating}
            setIsAiGenerating={setIsAiGenerating}
            onGenerateAiTheme={handleGenerateAiTheme}
          />
        </div>

        {/* Backing shadow overlay when drawer is open on mobile views */}
        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden absolute inset-0 bg-black/60 z-20 transition-opacity"
          />
        )}

        {/* Right workspace: Device viewport simulator, logs, and Copy inspector */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          
          {/* Split 1: Device Sandbox frame containing live component views */}
          <div className="flex-grow min-h-0 flex flex-col justify-start relative">
            <DeviceSimulator tokens={tokens}>
              <MockupApp 
                tokens={tokens} 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
              />
            </DeviceSimulator>
          </div>

          {/* Core visual notifications feed (floating or embedded neatly above inspector) */}
          <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-850 flex items-center justify-between text-[11px] tracking-wide text-slate-400 gap-4 flex-wrap">
            <div className="flex items-center gap-2 overflow-hidden flex-1 select-none">
              <Terminal className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-slate-500 font-mono">STATUS LOG:</span>
              <span className="truncate text-slate-300 font-medium">
                {alerts[0]?.message || 'Idle... ready to register contracts.'}
              </span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 text-[10px] font-mono">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                VITE SERVING
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-violet-400 font-semibold uppercase">GEMINI CONNECTED</span>
            </div>
          </div>

          {/* Split 2: Exporter Developer Panel */}
          <ExportPanel tokens={tokens} />

        </div>

      </div>

    </div>
  );
}
