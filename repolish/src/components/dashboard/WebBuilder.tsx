import React, { useState } from 'react';
import { DesignTokens, mapRadiusCard, mapRadiusButton, mapPaddingCard, mapGapSize, mapShadowCard, mapBorderWidth, mapSizeScale } from '../../types';
import { 
  Sparkles, Bot, Clock, Terminal, Laptop, Code, FileText, FolderTree, ChevronDown, 
  Send, Plus, Trash2, ArrowUpRight, Play, Server, AlertCircle, RefreshCw
} from 'lucide-react';

interface WebBuilderProps {
  tokens: DesignTokens;
}

export default function WebBuilder({ tokens }: WebBuilderProps) {
  const isBrutalist = tokens.primary === '#000000' && tokens.background === '#fef08a';

  const radiusCard = mapRadiusCard(tokens.radiusCard);
  const radiusBtn = mapRadiusButton(tokens.radiusButton);
  const paddingCard = mapPaddingCard(tokens.paddingCard);
  const gap = mapGapSize(tokens.gapSize);
  const shadow = mapShadowCard(tokens.shadowCard, isBrutalist);
  const border = mapBorderWidth(tokens.borderWidth);
  const sizes = mapSizeScale(tokens.sizeScale);

  // Stateful inputs
  const [activeFile, setActiveFile] = useState('App.tsx');
  const [chatInput, setChatInput] = useState('');
  const [selectedStack, setSelectedStack] = useState('react-vite');
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', message: "Welcome! I'm your AI Workspace developer. Describe any styling component additions you want, and I'll adapt your theme contracts and generate code instantly." },
  ]);

  const [files, setFiles] = useState<{ [key: string]: string }>({
    'App.tsx': `import React from 'react';
import { LineChart, Sparkles } from 'lucide-react';

export default function App() {
  return (
    <div className="p-8 max-w-xl mx-auto text-center space-y-6">
      <h1 className="text-3xl font-black text-indigo-600">
        Responsive App Prototype
      </h1>
      <p className="text-slate-600">
        Constructed on-the-fly inside RePolish Web Builder!
      </p>
    </div>
  );
}`,
    'index.css': `@import "tailwindcss";
body {
  background-color: var(--bg-main);
  font-family: var(--font-heading);
}`,
    'package.json': `{
  "name": "client-react-spa",
  "dependencies": {
    "react": "^19.0.0",
    "lucide-react": "^0.540.0"
  }
}`
  });

  const [terminalLogs, setTerminalLogs] = useState([
    { type: 'info', msg: '[bundler] Resolving dependencies...' },
    { type: 'info', msg: '[compile] Transpiling App.tsx in 12ms' },
    { type: 'success', msg: '[server] Hot Reload operational on port 3000' }
  ]);

  const [previewRefreshCount, setPreviewRefreshCount] = useState(0);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    const updatedHistory = [...chatHistory, { role: 'user', message: userMsg }];
    setChatHistory(updatedHistory);
    setChatInput('');

    // Simulate AI thinking and outputting updated code.
    setTimeout(() => {
      setChatHistory(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          message: `Sure! I have updated "App.tsx" to incorporate an interactive responsive hero button aligned with your brand-primary hue (${tokens.primary}). Re-compiling the mock virtual environment...` 
        }
      ]);

      // Modify active code file
      setFiles(prev => ({
        ...prev,
        'App.tsx': `import React, { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function App() {
  const [clicks, setClicks] = useState(0);
  
  return (
    <div className="p-8 max-w-xl mx-auto text-center space-y-6">
      <h1 className="text-3.5xl font-black" style={{ color: '${tokens.primary}' }}>
        Responsive App Prototype
      </h1>
      <p className="text-slate-600 font-medium">
        Constructed on-the-fly inside RePolish Web Builder!
      </p>
      <button 
        onClick={() => setClicks(c => c + 1)}
        className="px-6 py-3 font-bold text-white shadow-lg mx-auto flex items-center gap-2"
        style={{ 
          backgroundColor: '${tokens.primary}', 
          borderRadius: '${tokens.radiusButton === 'full' ? '9999px' : '8px'}' 
        }}
      >
        <span>Interactive Triggers: {clicks}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}`
      }));

      // Add terminal feedback
      setTerminalLogs(prev => [
        ...prev,
        { type: 'info', msg: `[AI Agent] Re-wrote component inside ${activeFile}` },
        { type: 'success', msg: `[compile] Package built successfully! Reloading frame.` }
      ]);
      setPreviewRefreshCount(c => c + 1);
    }, 1200);
  };

  const handleUpdateCode = (newValue: string) => {
    setFiles({
      ...files,
      [activeFile]: newValue
    });
  };

  return (
    <div className="flex flex-col gap-4 text-left h-full min-h-[500px]" id="builder-container">
      
      {/* 3.1 Stack Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800" id="stack-selector">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-pink-400" />
          <span className="text-xs font-mono font-bold uppercase text-slate-400">ACTIVE BUILDER PIPELINE:</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Stack Select Options */}
          <select 
            value={selectedStack}
            onChange={(e) => setSelectedStack(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-100 text-xs px-3 py-1.5 rounded outline-none"
          >
            <option value="react-vite">React 19 + Vite 6 (Full Stack)</option>
            <option value="node-express">Node.js + Express (API Routing)</option>
            <option value="tailwind-static">Static HTML + Tailwind CSS</option>
          </select>
          <span className="text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 px-2 py-1 rounded font-mono font-bold">
            COMPILER ACTIVE
          </span>
        </div>
      </div>

      {/* 3.2 Dual Columns Split: Chat Panel Left & Code Editor + Live Frame Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-stretch min-h-[420px]">
        
        {/* Left Col: AI Chat Assistant (Span 4) */}
        <div 
          className={`lg:col-span-4 border flex flex-col justify-between overflow-hidden h-full ${radiusCard} ${shadow} ${border}`}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          {/* Header */}
          <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: tokens.border }}>
            <span className="p-1 rounded bg-violet-500/15 text-violet-400">
              <Bot className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-xs" style={{ color: tokens.textPrimary }}>AI Web Architect</h3>
              <p className="text-[10px]" style={{ color: tokens.textSecondary }}>Prompt-to-component code editor co-pilot</p>
            </div>
          </div>

          {/* History scroll */}
          <div className="flex-1 p-3.5 space-y-3 overflow-y-auto max-h-[200px] lg:max-h-[300px]">
            {chatHistory.map((item, idx) => (
              <div 
                key={idx} 
                className={`p-2.5 rounded text-xs leading-normal ${
                  item.role === 'assistant' 
                    ? 'bg-slate-950/20 text-slate-300 self-start border border-dashed text-left' 
                    : 'bg-violet-600 text-white self-end font-medium text-right'
                }`}
                style={item.role === 'assistant' ? { borderColor: tokens.border } : {}}
              >
                <div className="text-[9px] font-mono uppercase opacity-50 mb-0.5">{item.role}</div>
                <div>{item.message}</div>
              </div>
            ))}
          </div>

          {/* Prompt Entry Input */}
          <form onSubmit={handleSendMessage} className="p-2.5 border-t bg-slate-950/20 flex gap-1.5" style={{ borderColor: tokens.border }}>
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="e.g. Add a vibrant brand button..."
              className="flex-1 text-xs border p-2 bg-transparent outline-none focus:border-violet-500 text-slate-100 placeholder-slate-600"
              style={{ borderColor: tokens.border, borderRadius: radiusBtn }}
            />
            <button 
              type="submit"
              disabled={!chatInput.trim()}
              className="p-2 text-white cursor-pointer active:scale-95 transition-transform shrink-0 disabled:opacity-50"
              style={{ backgroundColor: tokens.primary, borderRadius: radiusBtn }}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Right Col: Code Explorer & Live Simulator (Span 8) */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          
          {/* Explorer Tree & Editor (Col Span 6) */}
          <div 
            className={`md:col-span-6 border flex flex-col justify-between overflow-hidden ${radiusCard} ${shadow} ${border}`}
            style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
          >
            {/* Simple File Tabs */}
            <div className="flex bg-slate-950/50 border-b overflow-x-auto text-xs" style={{ borderColor: tokens.border }}>
              <div className="px-2 py-2 text-[10px] font-mono font-bold text-slate-500 uppercase self-center tracking-wider border-r border-slate-800 pr-3 mr-1 select-none flex items-center gap-1">
                <FolderTree className="w-3 h-3" /> Files
              </div>
              {Object.keys(files).map((name) => (
                <button
                  key={name}
                  onClick={() => setActiveFile(name)}
                  className={`px-3 py-2 cursor-pointer font-mono font-medium text-[11px] transition-colors border-r ${activeFile === name ? 'bg-slate-950 text-violet-400 font-bold border-t-2 border-t-violet-500' : 'text-slate-400 hover:text-slate-200'}`}
                  style={{ borderColor: tokens.border }}
                >
                  <FileText className="w-3 h-3 inline mr-1 opacity-70" />
                  {name}
                </button>
              ))}
            </div>

            {/* Editable Text Editor Area */}
            <div className="flex-1 min-h-[160px] relative p-1">
              <textarea 
                value={files[activeFile]}
                onChange={(e) => handleUpdateCode(e.target.value)}
                className="w-full h-full bg-slate-950/80 text-slate-300 font-mono text-[10.5px] p-2 outline-none resize-none leading-relaxed select-all"
                spellCheck={false}
              />
            </div>
            
            <div className="bg-slate-950 px-3 py-1.5 border-t text-[10px] font-mono text-slate-500 flex justify-between" style={{ borderColor: tokens.border }}>
              <span>ANSI/UTF-8</span>
              <span>Col 1, Line {files[activeFile].split('\n').length}</span>
            </div>
          </div>

          {/* Visual Interactive App Frame (Col Span 6) */}
          <div 
            className={`md:col-span-6 border overflow-hidden flex flex-col justify-between ${radiusCard} ${shadow} ${border}`}
            style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
          >
            <div className="px-4 py-2 border-b flex items-center justify-between bg-slate-950/30" style={{ borderColor: tokens.border }}>
              <span className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1 font-bold">
                <Laptop className="w-3 h-3" /> Live Sandboxed Frame
              </span>
              <button 
                onClick={() => setPreviewRefreshCount(c => c + 1)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Refresh preview app environment"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {/* Simulated Live Renderer Frame */}
            <div className="flex-grow p-4 bg-slate-100 dark:bg-slate-950/40 min-h-[180px] flex items-center justify-center relative overflow-y-auto">
              
              <div key={previewRefreshCount} className="w-full text-center space-y-4">
                {activeFile === 'App.tsx' && files['App.tsx'].includes('button') ? (
                  <div className="p-4 bg-white rounded-lg shadow-sm border text-slate-900 border-slate-250 flex flex-col gap-3 max-w-[240px] mx-auto">
                    <h4 className="font-bold text-sm tracking-tight" style={{ color: tokens.primary }}>
                      Sandbox Live Component
                    </h4>
                    <p className="text-[11px] text-slate-500">Theme tokens are actively synchronized to component contract styles.</p>
                    <button 
                      onClick={() => alert('Simulator trigger clicked! Injected styles apply successfully.')}
                      className="text-xs font-semibold py-2 px-3 text-white transition-opacity inline-flex items-center gap-1 justify-center active:scale-95 cursor-pointer"
                      style={{ backgroundColor: tokens.primary, borderRadius: radiusBtn }}
                    >
                      Interactive Click
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-lg shadow-sm border text-slate-900 border-slate-250 flex flex-col gap-2 max-w-[240px] mx-auto">
                    <h4 className="font-black text-sm tracking-tight text-indigo-600">
                      Standard Spa Scaffold
                    </h4>
                    <p className="text-[11px] text-slate-500">Modify package files or instruct AI in chat panel to trigger live DOM compilation.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-3 py-1.5 bg-slate-950 text-[10px] font-mono text-slate-500 flex items-center justify-between" style={{ borderColor: tokens.border }}>
              <span>STATE: FULLY SYNCED</span>
              <span className="text-emerald-400">FPS: 60.0</span>
            </div>
          </div>

        </div>

      </div>

      {/* 3.3 Terminal Panel Console */}
      <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-800 flex flex-col gap-2 font-mono text-[10.5px]">
        <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-1 text-slate-500">
          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-400">
            <Terminal className="w-3.5 h-3.5 text-pink-400 animate-pulse" /> Terminal Diagnostics Console
          </span>
          <span className="text-[9px] text-slate-600 uppercase">Interactive Logs</span>
        </div>

        <div className="space-y-1.5 max-h-[80px] overflow-y-auto pr-1">
          {terminalLogs.map((log, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-slate-600 font-bold">›</span>
              <span className={log.type === 'success' ? 'text-emerald-400 font-medium' : log.type === 'error' ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                {log.msg}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
