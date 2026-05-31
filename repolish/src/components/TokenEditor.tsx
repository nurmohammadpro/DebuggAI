import React, { useState } from 'react';
import { DesignTokens, PresetThemeId, PRESET_THEMES } from '../types';
import { 
  Sliders, Paintbrush, Award, Sparkles, Wand2, RefreshCw, 
  HelpCircle, Eye, Type, SquareDot, Layers, Maximize2 
} from 'lucide-react';

interface TokenEditorProps {
  tokens: DesignTokens;
  setTokens: (tokens: DesignTokens) => void;
  isAiGenerating: boolean;
  setIsAiGenerating: (status: boolean) => void;
  onGenerateAiTheme: (vibe: string) => Promise<void>;
}

export default function TokenEditor({ 
  tokens, 
  setTokens, 
  isAiGenerating, 
  setIsAiGenerating, 
  onGenerateAiTheme 
}: TokenEditorProps) {
  const [activeSection, setActiveSection] = useState<'presets' | 'colors' | 'typography' | 'scales'>('presets');
  const [vibePrompt, setVibePrompt] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);

  const handleTokenChange = (key: keyof DesignTokens, value: string) => {
    setTokens({
      ...tokens,
      [key]: value
    });
  };

  const handleApplyPreset = (presetId: PresetThemeId) => {
    const selected = PRESET_THEMES.find(p => p.id === presetId);
    if (selected) {
      setTokens({ ...selected.tokens });
    }
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vibePrompt.trim()) return;
    setAiError(null);
    setIsAiGenerating(true);
    try {
      await onGenerateAiTheme(vibePrompt.trim());
      setVibePrompt('');
    } catch (err: any) {
      setAiError(err.message || 'Error executing AI theme generation');
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-start bg-slate-900 border-r border-slate-800 text-slate-100 divide-y divide-slate-800">
      
      {/* 1. Header & AI Spark Engine */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-bold tracking-wider uppercase">Token Parameters</h2>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">Studio</span>
        </div>

        {/* AI Prompt Input (Proxy server connect) */}
        <form onSubmit={handleAiSubmit} className="flex flex-col gap-2 mt-2 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-mono tracking-wider font-semibold text-violet-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-pink-400 animate-pulse" />
              AI THEME ASSISTANT
            </label>
            <span className="text-[9px] font-mono text-slate-500 uppercase">Gemini 3.5</span>
          </div>

          <div className="flex gap-1.5 mt-1.5">
            <input 
              type="text"
              value={vibePrompt}
              onChange={(e) => setVibePrompt(e.target.value)}
              disabled={isAiGenerating}
              placeholder="e.g. moody cyberpunk, warm coffee card"
              className="flex-grow shrink min-w-0 bg-slate-900 text-xs text-slate-100 p-2 border border-slate-800 rounded outline-none placeholder-slate-600 focus:border-violet-500"
            />
            <button
              type="submit"
              disabled={isAiGenerating || !vibePrompt.trim()}
              className="px-3 shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-semibold text-xs rounded transition-all flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed justify-center"
            >
              {isAiGenerating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {aiError && (
            <span className="text-[10px] text-red-400 bg-red-950/30 p-1.5 mt-1 border border-red-900/40 rounded leading-tight">
              {aiError}
            </span>
          )}
          <span className="text-[9px] text-slate-500">Inputs a general vibe description to generate design contracts securely.</span>
        </form>
      </div>

      {/* 2. Navigation bar for settings */}
      <div className="flex bg-slate-950 text-xs px-2 divide-x divide-slate-800">
        <button 
          onClick={() => setActiveSection('presets')} 
          className={`flex-1 py-3 text-center transition-colors font-medium cursor-pointer ${activeSection === 'presets' ? 'text-violet-400 bg-slate-900' : 'text-slate-400 hover:text-slate-100'}`}
        >
          Presets
        </button>
        <button 
          onClick={() => setActiveSection('colors')} 
          className={`flex-1 py-3 text-center transition-colors font-medium cursor-pointer ${activeSection === 'colors' ? 'text-violet-400 bg-slate-900' : 'text-slate-400 hover:text-slate-100'}`}
        >
          Colors
        </button>
        <button 
          onClick={() => setActiveSection('typography')} 
          className={`flex-1 py-3 text-center transition-colors font-medium cursor-pointer ${activeSection === 'typography' ? 'text-violet-400 bg-slate-900' : 'text-slate-400 hover:text-slate-100'}`}
        >
          Typos
        </button>
        <button 
          onClick={() => setActiveSection('scales')} 
          className={`flex-1 py-3 text-center transition-colors font-medium cursor-pointer ${activeSection === 'scales' ? 'text-violet-400 bg-slate-900' : 'text-slate-400 hover:text-slate-100'}`}
        >
          Scales
        </button>
      </div>

      {/* 3. Panel Body Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        
        {/* VIEW 3.1: Presets Catalog */}
        {activeSection === 'presets' && (
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
              <Award className="w-3.5 h-3.5" /> DESIGN DECISION TEMPLATES
            </h3>
            
            <div className="grid grid-cols-1 gap-2.5">
              {PRESET_THEMES.map(preset => {
                const isActive = tokens.primary === preset.tokens.primary && tokens.background === preset.tokens.background;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all text-xs cursor-pointer flex flex-col gap-1.5 ${isActive ? 'bg-violet-950/20 border-violet-500 shadow-[0_0_12px_rgba(99,102,241,0.15)]' : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100">{preset.name}</span>
                      {isActive && (
                        <span className="text-[9px] bg-violet-500 font-bold text-slate-100 px-1.5 py-0.5 rounded">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    
                    <p className="text-slate-400 leading-relaxed text-[10.5px]">{preset.description}</p>
                    
                    {/* Tiny Color Swatch Bar */}
                    <div className="flex gap-1 mt-1">
                      <span className="w-5 h-2.5 rounded-sm" style={{ backgroundColor: preset.tokens.primary }} title="Primary" />
                      <span className="w-5 h-2.5 rounded-sm" style={{ backgroundColor: preset.tokens.secondary }} title="Secondary" />
                      <span className="w-5 h-2.5 rounded-sm" style={{ backgroundColor: preset.tokens.background }} title="Background" />
                      <span className="w-5 h-2.5 rounded-sm" style={{ backgroundColor: preset.tokens.surface }} title="Surface" />
                      <span className="w-5 h-2.5 rounded-sm border border-slate-800" style={{ backgroundColor: preset.tokens.textPrimary }} title="Text Primary" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 3.2: Colors Parameter Panel */}
        {activeSection === 'colors' && (
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5">
              <Paintbrush className="w-3.5 h-3.5" /> VISUAL BRAND WEIGHTS
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Primary Color */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400">Primary Brand</label>
                <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded border border-slate-800">
                  <input 
                    type="color" 
                    value={tokens.primary}
                    onChange={(e) => handleTokenChange('primary', e.target.value)}
                    className="w-5 h-5 rounded-full border border-slate-800 bg-transparent cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={tokens.primary}
                    onChange={(e) => handleTokenChange('primary', e.target.value)}
                    className="w-full text-[10px] font-mono bg-transparent outline-none uppercase"
                  />
                </div>
              </div>

              {/* Secondary Color */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400">Secondary Accent</label>
                <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded border border-slate-800">
                  <input 
                    type="color" 
                    value={tokens.secondary}
                    onChange={(e) => handleTokenChange('secondary', e.target.value)}
                    className="w-5 h-5 rounded-full border border-slate-800 bg-transparent cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={tokens.secondary}
                    onChange={(e) => handleTokenChange('secondary', e.target.value)}
                    className="w-full text-[10px] font-mono bg-transparent outline-none uppercase"
                  />
                </div>
              </div>

              {/* Background Color */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400">Workspace Bg</label>
                <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded border border-slate-800">
                  <input 
                    type="color" 
                    value={tokens.background}
                    onChange={(e) => handleTokenChange('background', e.target.value)}
                    className="w-5 h-5 rounded-full border border-slate-800 bg-transparent cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={tokens.background}
                    onChange={(e) => handleTokenChange('background', e.target.value)}
                    className="w-full text-[10px] font-mono bg-transparent outline-none uppercase"
                  />
                </div>
              </div>

              {/* Surface Color */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400">Overlay Surface</label>
                <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded border border-slate-800">
                  <input 
                    type="color" 
                    value={tokens.surface}
                    onChange={(e) => handleTokenChange('surface', e.target.value)}
                    className="w-5 h-5 rounded-full border border-slate-800 bg-transparent cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={tokens.surface}
                    onChange={(e) => handleTokenChange('surface', e.target.value)}
                    className="w-full text-[10px] font-mono bg-transparent outline-none uppercase"
                  />
                </div>
              </div>

              {/* Text Primary */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400">Text Principal</label>
                <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded border border-slate-800">
                  <input 
                    type="color" 
                    value={tokens.textPrimary}
                    onChange={(e) => handleTokenChange('textPrimary', e.target.value)}
                    className="w-5 h-5 rounded-full border border-slate-800 bg-transparent cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={tokens.textPrimary}
                    onChange={(e) => handleTokenChange('textPrimary', e.target.value)}
                    className="w-full text-[10px] font-mono bg-transparent outline-none uppercase"
                  />
                </div>
              </div>

              {/* Text Secondary */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400">Text Secondary</label>
                <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded border border-slate-800">
                  <input 
                    type="color" 
                    value={tokens.textSecondary}
                    onChange={(e) => handleTokenChange('textSecondary', e.target.value)}
                    className="w-5 h-5 rounded-full border border-slate-800 bg-transparent cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={tokens.textSecondary}
                    onChange={(e) => handleTokenChange('textSecondary', e.target.value)}
                    className="w-full text-[10px] font-mono bg-transparent outline-none uppercase"
                  />
                </div>
              </div>

              {/* Borders */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400">Border Outlines</label>
                <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded border border-slate-800">
                  <input 
                    type="color" 
                    value={tokens.border}
                    onChange={(e) => handleTokenChange('border', e.target.value)}
                    className="w-5 h-5 rounded-full border border-slate-800 bg-transparent cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={tokens.border}
                    onChange={(e) => handleTokenChange('border', e.target.value)}
                    className="w-full text-[10px] font-mono bg-transparent outline-none uppercase"
                  />
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 leading-normal">
              Click individual bubble colors to preview direct contrast. Ensure consistent hierarchy between primary brand and overlay backgrounds.
            </p>
          </div>
        )}

        {/* VIEW 3.3: Typography Configs */}
        {activeSection === 'typography' && (
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" /> TYPE STACKING DEFINITIONS
            </h3>

            <div className="grid grid-cols-1 gap-3 text-xs">
              {/* Display Font Display */}
              <div className="flex flex-col gap-1 bg-slate-950 p-2.5 rounded border border-slate-800">
                <label className="text-[10px] font-mono font-semibold text-violet-400">Heading Font Pair</label>
                <select 
                  value={tokens.fontDisplay}
                  onChange={(e) => handleTokenChange('fontDisplay', e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 p-1.5 text-xs rounded mt-1.5 text-slate-100"
                >
                  <option value="sans">Inter (Standard Sans)</option>
                  <option value="grotesk">Space Grotesk (Tech Modern)</option>
                  <option value="playfair">Playfair Display (Editorial Serif)</option>
                  <option value="serif">Times New Roman / Georgia (Classic Serif)</option>
                  <option value="mono">JetBrains Mono (Logical Terminal)</option>
                </select>
              </div>

              {/* Body Typography */}
              <div className="flex flex-col gap-1 bg-slate-950 p-2.5 rounded border border-slate-800">
                <label className="text-[10px] font-mono font-semibold text-violet-400">Body Typography</label>
                <select 
                  value={tokens.fontBody}
                  onChange={(e) => handleTokenChange('fontBody', e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 p-1.5 text-xs rounded mt-1.5 text-slate-100"
                >
                  <option value="sans">Inter (Optimal Sans)</option>
                  <option value="serif">System Book Serif</option>
                  <option value="mono">JetBrains Mono (Console Style)</option>
                </select>
              </div>

              {/* Typography Density size scale */}
              <div className="flex flex-col gap-1 bg-slate-950 p-2.5 rounded border border-slate-800">
                <label className="text-[10px] font-mono font-semibold text-violet-400">Global Scale Size</label>
                <select 
                  value={tokens.sizeScale}
                  onChange={(e) => handleTokenChange('sizeScale', e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 p-1.5 text-xs rounded mt-1.5 text-slate-100"
                >
                  <option value="compact">Compact (Eye Strain Optimized)</option>
                  <option value="balanced">Balanced (Standard Default)</option>
                  <option value="spacious">Spacious (Reader Comfortable)</option>
                </select>
              </div>

              {/* Tracking */}
              <div className="flex flex-col gap-1 bg-slate-950 p-2.5 rounded border border-slate-800">
                <label className="text-[10px] font-mono font-semibold text-violet-400">Letter Spacing (Tracking)</label>
                <select 
                  value={tokens.letterSpacing}
                  onChange={(e) => handleTokenChange('letterSpacing', e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 p-1.5 text-xs rounded mt-1.5 text-slate-100"
                >
                  <option value="tight">Tight</option>
                  <option value="normal">Normal</option>
                  <option value="wide">Wide Layout</option>
                </select>
              </div>

              {/* Leading */}
              <div className="flex flex-col gap-1 bg-slate-950 p-2.5 rounded border border-slate-800">
                <label className="text-[10px] font-mono font-semibold text-violet-400">Line Height (Leading)</label>
                <select 
                  value={tokens.lineHeight}
                  onChange={(e) => handleTokenChange('lineHeight', e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 p-1.5 text-xs rounded mt-1.5 text-slate-100"
                >
                  <option value="snug">Snug (Compressed)</option>
                  <option value="normal">Normal</option>
                  <option value="relaxed">Relaxed / Flowing</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3.4: Decorative Scales */}
        {activeSection === 'scales' && (
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> DECORATIVE SYSTEM SCALES
            </h3>

            <div className="grid grid-cols-1 gap-3 text-xs">
              
              {/* Radius Card */}
              <div className="flex flex-col gap-1 bg-slate-950 p-2.5 rounded border border-slate-800">
                <label className="text-[10px] font-mono font-semibold text-violet-400">Card Radiuses</label>
                <select 
                  value={tokens.radiusCard}
                  onChange={(e) => handleTokenChange('radiusCard', e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 p-1.5 text-xs rounded mt-1.5 text-slate-100"
                >
                  <option value="none">Zero Rounding (none)</option>
                  <option value="sm">Subtle (sm)</option>
                  <option value="md">Medium (md)</option>
                  <option value="lg">Standard Card (lg)</option>
                  <option value="xl">Gently Curved (xl)</option>
                  <option value="2xl">Flowy Layout (2xl)</option>
                  <option value="full">Organic Pod (full)</option>
                </select>
              </div>

              {/* Radius Button */}
              <div className="flex flex-col gap-1 bg-slate-950 p-2.5 rounded border border-slate-800">
                <label className="text-[10px] font-mono font-semibold text-violet-400">Interactive Radiuses</label>
                <select 
                  value={tokens.radiusButton}
                  onChange={(e) => handleTokenChange('radiusButton', e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 p-1.5 text-xs rounded mt-1.5 text-slate-100"
                >
                  <option value="none">Sharp edges (none)</option>
                  <option value="sm">Soft corner (sm)</option>
                  <option value="md">Box target (md)</option>
                  <option value="lg">Tactile button (lg)</option>
                  <option value="full">Round Capsule (full)</option>
                </select>
              </div>

              {/* Shadow Elevation */}
              <div className="flex flex-col gap-1 bg-slate-950 p-2.5 rounded border border-slate-800">
                <label className="text-[10px] font-mono font-semibold text-violet-400">Shadow Depth Scale</label>
                <select 
                  value={tokens.shadowCard}
                  onChange={(e) => handleTokenChange('shadowCard', e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 p-1.5 text-xs rounded mt-1.5 text-slate-100"
                >
                  <option value="none">Flat UI (none)</option>
                  <option value="sm">Paper sheet (sm)</option>
                  <option value="md">Glow rise (md)</option>
                  <option value="lg">Bento elevation (lg)</option>
                  <option value="xl">Max depths overlay (xl)</option>
                  <option value="inner">Recessed cavity (inner)</option>
                </select>
              </div>

              {/* Border Width */}
              <div className="flex flex-col gap-1 bg-slate-950 p-2.5 rounded border border-slate-800">
                <label className="text-[10px] font-mono font-semibold text-violet-400">Outlines Thickness</label>
                <select 
                  value={tokens.borderWidth}
                  onChange={(e) => handleTokenChange('borderWidth', e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 p-1.5 text-xs rounded mt-1.5 text-slate-100"
                >
                  <option value="0px">No borders (0px)</option>
                  <option value="1px">Thin separator (1px)</option>
                  <option value="2px">Brutalist frame border (2px)</option>
                </select>
              </div>

              {/* Padding Card */}
              <div className="flex flex-col gap-1 bg-slate-950 p-2.5 rounded border border-slate-800">
                <label className="text-[10px] font-mono font-semibold text-violet-400">Container Bounds Padding</label>
                <select 
                  value={tokens.paddingCard}
                  onChange={(e) => handleTokenChange('paddingCard', e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 p-1.5 text-xs rounded mt-1.5 text-slate-100"
                >
                  <option value="none">Zero padding (none)</option>
                  <option value="xs">Extremely tight (xs)</option>
                  <option value="sm">Comfortable tight (sm)</option>
                  <option value="md">Web Standard Grid (md)</option>
                  <option value="lg">Premium Editorial (lg)</option>
                  <option value="xl">Breathe Wide (xl)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Footer Reset Panel Trigger */}
      <div className="p-4 bg-slate-950 flex gap-2">
        <button 
          onClick={() => handleApplyPreset('neutral-slate')}
          className="flex-1 border border-slate-800 hover:border-slate-700 bg-transparent text-slate-300 font-semibold py-2 rounded text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" /> Reset default
        </button>
      </div>
    </div>
  );
}
