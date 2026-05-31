import React, { useState } from 'react';
import { DesignTokens, mapRadiusCard, mapRadiusButton, mapPaddingCard, mapGapSize, mapShadowCard, mapBorderWidth, mapSizeScale } from '../../types';
import { 
  Settings, User, CreditCard, ShieldCheck, Mail, Database, Bell, Check, 
  Sparkles, Layers, Box, Code, Plus, ExternalLink, Key
} from 'lucide-react';

interface DashboardSettingsProps {
  tokens: DesignTokens;
}

export default function DashboardSettings({ tokens }: DashboardSettingsProps) {
  const isBrutalist = tokens.primary === '#000000' && tokens.background === '#fef08a';

  const radiusCard = mapRadiusCard(tokens.radiusCard);
  const radiusBtn = mapRadiusButton(tokens.radiusButton);
  const paddingCard = mapPaddingCard(tokens.paddingCard);
  const gap = mapGapSize(tokens.gapSize);
  const shadow = mapShadowCard(tokens.shadowCard, isBrutalist);
  const border = mapBorderWidth(tokens.borderWidth);
  const sizes = mapSizeScale(tokens.sizeScale);

  // Active configurations state
  const [activeTabs, setActiveTabs] = useState<'profile' | 'projects' | 'pricing'>('projects');
  const [email, setEmail] = useState('nurprodev@gmail.com');
  const [saveStatus, setSaveStatus] = useState(false);

  // Dynamic projects cards list with creation triggers
  const [projectsList, setProjectsList] = useState([
    { id: 'p-1', name: 'Hydra Realtime Websockets', stack: 'React, Node, Redis', filesCount: 14, updatedAt: '3 hrs ago' },
    { id: 'p-2', name: 'Fitbit OAuth Tracker app', stack: 'Vite, Express, Tailwind', filesCount: 9, updatedAt: '2 days ago' },
    { id: 'p-3', name: 'Cognitive LLM Auto-summarizer', stack: 'Next.js, Python, Spanner', filesCount: 41, updatedAt: 'May 18' }
  ]);

  const [newProjName, setNewProjName] = useState('');
  const [newProjStack, setNewProjStack] = useState('React, Tailwind, Node');
  const [isAddingProj, setIsAddingProj] = useState(false);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    setProjectsList([
      { 
        id: `p-${Date.now().toString().substring(10)}`, 
        name: newProjName.trim(), 
        stack: newProjStack, 
        filesCount: 4, 
        updatedAt: 'Just now' 
      },
      ...projectsList
    ]);
    setNewProjName('');
    setIsAddingProj(false);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 text-left" id="settings-canvas">
      
      {/* Tab Select triggers */}
      <div className="flex border-b border-slate-800" id="settings-tabs">
        <button 
          onClick={() => setActiveTabs('projects')}
          className={`px-4 py-2.5 font-bold text-xs transition-all border-b-2 text-left ${activeTabs === 'projects' ? 'border-violet-500 text-slate-100 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          style={activeTabs === 'projects' ? { borderBottomColor: tokens.primary } : {}}
        >
          Active Projects Cards ({projectsList.length})
        </button>

        <button 
          onClick={() => setActiveTabs('profile')}
          className={`px-4 py-2.5 font-bold text-xs transition-all border-b-2 text-left ${activeTabs === 'profile' ? 'border-violet-500 text-slate-100 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          style={activeTabs === 'profile' ? { borderBottomColor: tokens.primary } : {}}
        >
          Profile Settings
        </button>

        <button 
          onClick={() => setActiveTabs('pricing')}
          className={`px-4 py-2.5 font-bold text-xs transition-all border-b-2 text-left ${activeTabs === 'pricing' ? 'border-violet-500 text-slate-100 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          style={activeTabs === 'pricing' ? { borderBottomColor: tokens.primary } : {}}
        >
          Billing Pricing Plans
        </button>
      </div>

      {/* Profile Section Content view */}
      {activeTabs === 'profile' && (
        <div 
          className={`border ${radiusCard} ${shadow} ${border} ${paddingCard}`}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-800/80">
            <User className="w-4 h-4 text-pink-400" />
            <h3 className="font-bold text-xs tracking-wider uppercase text-slate-400">Developer Account Variables</h3>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
            <div className="flex flex-col gap-1.5 text-xs">
              <label className="font-semibold text-slate-350 font-mono">WORKSPACE CHIEF EMAIL</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-950 border text-xs p-2.5 text-slate-100 focus:ring-1 focus:ring-violet-500 outline-none"
                style={{ borderColor: tokens.border, borderRadius: radiusBtn }}
              />
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <label className="font-semibold text-slate-350 font-mono">GEMINI API ENDPOINT ACCESS</label>
              <div 
                className="p-2.5 bg-slate-950/70 border text-[11px] text-slate-400 font-mono flex items-center justify-between"
                style={{ borderColor: tokens.border, borderRadius: radiusBtn }}
              >
                <span>GEMINI_API_KEY_SECURE_REPOLISH</span>
                <span className="text-emerald-400 font-semibold text-[10px]">VERIFIED OK</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <button 
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white transition-opacity shrink-0 flex items-center gap-1 cursor-pointer active:scale-97"
                style={{ backgroundColor: tokens.primary, borderRadius: radiusBtn }}
              >
                {saveStatus ? 'Saving Variables...' : 'Save Changes'}
              </button>
              {saveStatus && (
                <span className="text-[11px] text-emerald-400 font-mono">✓ System variables refreshed.</span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Active Projects Cards selector view */}
      {activeTabs === 'projects' && (
        <div className="space-y-4">
          
          {/* Header row to add project cards */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold" style={{ color: tokens.textPrimary }}>Connected Developer Repositories</h3>
              <p className="text-[11px]" style={{ color: tokens.textSecondary }}>Choose which active branch synchronizes design token schema variables.</p>
            </div>
            
            <button 
              onClick={() => setIsAddingProj(!isAddingProj)}
              className="text-xs px-3 py-1.5 text-white font-bold inline-flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
              style={{ backgroundColor: tokens.primary, borderRadius: radiusBtn }}
            >
              <Plus className="w-3.5 h-3.5" /> New Branch Card
            </button>
          </div>

          {/* New Project Dialog simulated form block */}
          {isAddingProj && (
            <form 
              onSubmit={handleCreateProject}
              className={`p-4 border animate-scale-up space-y-3 ${radiusCard} ${border}`}
              style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
            >
              <h4 className="font-bold text-xs text-slate-100 uppercase tracking-widest font-mono">Create Active Branch Repository</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g., Infinite Scrolling Chat Frame"
                  className="bg-slate-950 border p-2.5 text-xs text-slate-100 outline-none placeholder-slate-600 w-full"
                  style={{ borderColor: tokens.border, borderRadius: radiusBtn }}
                  required
                />
                
                <input 
                  type="text" 
                  value={newProjStack}
                  onChange={(e) => setNewProjStack(e.target.value)}
                  placeholder="e.g., React, Tailwind, GCP, Spanner"
                  className="bg-slate-950 border p-2.5 text-xs text-slate-100 outline-none placeholder-slate-600 w-full"
                  style={{ borderColor: tokens.border, borderRadius: radiusBtn }}
                />
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button 
                  type="button"
                  onClick={() => setIsAddingProj(false)}
                  className="px-3.5 py-1.5 text-xs rounded text-slate-400 bg-slate-950 hover:bg-slate-900 border border-slate-800"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-bold text-white rounded cursor-pointer"
                  style={{ backgroundColor: tokens.primary, borderRadius: radiusBtn }}
                >
                  Save Branch
                </button>
              </div>
            </form>
          )}

          {/* Grid Cards Container */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="projects-grid">
            {projectsList.map((proj) => (
              <div 
                key={proj.id}
                className={`border transition-all flex flex-col justify-between p-4 relative overflow-hidden group hover:scale-101 hover:border-violet-500/80 ${radiusCard} ${shadow} ${border}`}
                style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
              >
                {/* Subtle gradient flash */}
                <span className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `radial-gradient(circle, ${tokens.secondary}20 0%, transparent 70%)` }} />

                <div className="space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] bg-slate-950 border border-slate-850 px-2 py-0.5 rounded font-mono font-bold text-slate-400">
                      {proj.id}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{proj.updatedAt}</span>
                  </div>

                  <h4 className="font-extrabold text-xs text-slate-100 group-hover:text-violet-400 transition-colors" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {proj.name}
                  </h4>
                  
                  <p className="text-[10px] text-slate-400 font-mono bg-slate-950/20 p-1 rounded inline-block">
                    {proj.stack}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-4 text-[10px]">
                  <span className="text-slate-500 font-medium font-mono">{proj.filesCount} modules inside</span>
                  <a 
                    href="#builder" 
                    onClick={() => alert(`Hydrating workspace branch with variables belonging to ${proj.name}...`)}
                    className="font-bold underline cursor-pointer inline-flex items-center gap-0.5"
                    style={{ color: tokens.primary }}
                  >
                    Load sandbox <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Billing Pricing View Cards */}
      {activeTabs === 'pricing' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-black" style={{ color: tokens.textPrimary }}>Scalable Development Quotas</h3>
            <p className="text-[11px]" style={{ color: tokens.textSecondary }}>Flexible sandbox licenses designed to keep tokens high and compiler latency low.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="pricing-matrix">
            
            {/* Plan 1 */}
            <div 
              className={`p-4 border text-left flex flex-col justify-between ${radiusCard} ${border} bg-slate-950/10`}
              style={{ borderColor: tokens.border }}
            >
              <div className="space-y-1">
                <span className="text-[9px] font-mono tracking-widest text-slate-500 font-bold uppercase block">INDIVIDUAL PROTOTYPE</span>
                <h4 className="font-extrabold text-base text-slate-200">Developer Free Tier</h4>
                <p className="text-xs font-black text-slate-100">$0 <span className="text-[10px] font-normal text-slate-400">/ user / mo</span></p>
                <p className="text-[10px] text-slate-400 leading-normal pt-2">Perfect for side-sandboxing. Limited to 50 runs per day.</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] space-y-1.5 text-slate-300">
                <div className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> 1 concurrent branch card</div>
                <div className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> Local theme state saving</div>
                <div className="flex items-center gap-1 text-slate-600"><Check className="w-3 h-3" /> No telemetry logger traces</div>
              </div>

              <button 
                onClick={() => alert('Currently active on the developer trial tier license.')}
                className="w-full text-center font-bold font-mono text-[10px] py-1.5 mt-4 rounded bg-slate-800 text-slate-350"
              >
                CURRENT PACKAGE
              </button>
            </div>

            {/* Plan 2: Best Tier */}
            <div 
              className={`p-4 border text-left flex flex-col justify-between relative overflow-hidden ${radiusCard} ${shadow} ${border}`}
              style={{ backgroundColor: tokens.surface, borderColor: tokens.primary }}
            >
              <span className="absolute top-0 right-0 text-[8px] bg-violet-600 text-white font-extrabold uppercase px-2 py-0.5 rounded-bl font-mono">POPULAR PLAN</span>
              
              <div className="space-y-1 pt-1">
                <span className="text-[9px] font-mono tracking-widest text-violet-400 font-bold uppercase block">TEAM SCALE UP</span>
                <h4 className="font-extrabold text-base text-slate-100">AI Architect Pro</h4>
                <p className="text-xs font-black" style={{ color: tokens.primary }}>$19 <span className="text-[10px] font-normal text-slate-400">/ user / mo</span></p>
                <p className="text-[10px] text-slate-400 leading-normal pt-2">Infinite runs and full automatic compiler hydration diagnostics sync.</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] space-y-1.5 text-slate-100">
                <div className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> Infinite concurrently hydrated branches</div>
                <div className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> Deep Gemini AI Co-pilot tuning</div>
                <div className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> Active logs SSR diagnostic traces</div>
              </div>

              <button 
                onClick={() => alert(`Upgrading container licenses to AI Architect Pro via Stripe sandbox webhook.`)}
                className="w-full text-center font-bold text-[10px] py-2 mt-4 text-white hover:opacity-95 cursor-pointer active:scale-97 transition-all"
                style={{ backgroundColor: tokens.primary, borderRadius: radiusBtn }}
              >
                UPGRADE TO PRO
              </button>
            </div>

            {/* Plan 3 */}
            <div 
              className={`p-4 border text-left flex flex-col justify-between ${radiusCard} ${border} bg-slate-950/10`}
              style={{ borderColor: tokens.border }}
            >
              <div className="space-y-1">
                <span className="text-[9px] font-mono tracking-widest text-slate-500 font-bold uppercase block">COMPREHENSIVE GOVERNANCE</span>
                <h4 className="font-extrabold text-base text-slate-200">Scale Enterprise</h4>
                <p className="text-xs font-black text-slate-100">$99 <span className="text-[10px] font-normal text-slate-400">/ user / mo</span></p>
                <p className="text-[10px] text-slate-400 leading-normal pt-2">Unlimited storage. Specialized dedicated virtual clusters.</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] space-y-1.5 text-slate-300">
                <div className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> 100% SLA Guarantee response</div>
                <div className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> Dual GCP Spanner data replicas</div>
                <div className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> Dedicated secure cluster VPN</div>
              </div>

              <button 
                onClick={() => alert('Sending Enterprise inquiry mail context to sales support.')}
                className="w-full text-center font-bold text-[10px] py-1.5 mt-4 rounded border border-slate-800 hover:bg-slate-900 text-slate-200 transition-colors cursor-pointer"
              >
                CONTACT SALES
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
