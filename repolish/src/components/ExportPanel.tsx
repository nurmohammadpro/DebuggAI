import React, { useState } from 'react';
import { DesignTokens } from '../types';
import { Code, Check, Copy, ClipboardCheck, Info, Sparkles, Scale, Percent } from 'lucide-react';

interface ExportPanelProps {
  tokens: DesignTokens;
}

// Color calculations helpers for luminance and contrast checking
function getRGB(hex: string): [number, number, number] {
  let color = hex.charAt(0) === '#' ? hex.substring(1) : hex;
  if (color.length === 3) {
    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  }
  const r = parseInt(color.substring(0, 2), 16) || 0;
  const g = parseInt(color.substring(2, 4), 16) || 0;
  const b = parseInt(color.substring(4, 6), 16) || 0;
  return [r, g, b];
}

function getLuminance(r: number, g: number, b: number): number {
  const parts = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return parts[0] * 0.2126 + parts[1] * 0.7152 + parts[2] * 0.0722;
}

function calculateContrastRatio(hex1: string, hex2: string): number {
  try {
    const rgb1 = getRGB(hex1);
    const rgb2 = getRGB(hex2);
    const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]) + 0.05;
    const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]) + 0.05;
    const ratio = l1 > l2 ? l1 / l2 : l2 / l1;
    return Math.round(ratio * 100) / 100;
  } catch {
    return 4.5; // fallback
  }
}

export default function ExportPanel({ tokens }: ExportPanelProps) {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tailwind' | 'css' | 'contrast'>('tailwind');

  // Compute contrasts
  const brandToSurfaceContrast = calculateContrastRatio(tokens.primary, tokens.surface);
  const textToSurfaceContrast = calculateContrastRatio(tokens.textPrimary, tokens.surface);
  const subtextToSurfaceContrast = calculateContrastRatio(tokens.textSecondary, tokens.surface);

  // Generate code formats
  const tailwindSnippet = `// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "${tokens.primary}",
        secondary: "${tokens.secondary}",
        background: "${tokens.background}",
        surface: "${tokens.surface}",
        slateText: {
          primary: "${tokens.textPrimary}",
          secondary: "${tokens.textSecondary}",
        },
        borderTint: "${tokens.border}"
      },
      fontFamily: {
        display: ["${tokens.fontDisplay === 'sans' ? 'Inter' : tokens.fontDisplay === 'grotesk' ? 'Space Grotesk' : tokens.fontDisplay === 'playfair' ? 'Playfair Display' : 'sans-serif'}"],
        body: ["${tokens.fontBody === 'sans' ? 'Inter' : tokens.fontBody === 'serif' ? 'Georgia' : 'Courier'}"],
      },
      borderRadius: {
        card: "${tokens.radiusCard === 'none' ? '0px' : tokens.radiusCard === 'sm' ? '4px' : tokens.radiusCard === 'md' ? '6px' : tokens.radiusCard === 'lg' ? '8px' : tokens.radiusCard === 'xl' ? '12px' : tokens.radiusCard === '2xl' ? '16px' : '32px'}",
        btn: "${tokens.radiusButton === 'none' ? '0px' : tokens.radiusButton === 'sm' ? '4px' : tokens.radiusButton === 'md' ? '6px' : tokens.radiusButton === 'lg' ? '8px' : '9999px'}",
      }
    },
  },
  plugins: [],
} satisfies Config;`;

  const cssSnippet = `/* globals.css */
@layer base {
  :root {
    --color-primary: ${tokens.primary};
    --color-secondary: ${tokens.secondary};
    --bg-main: ${tokens.background};
    --bg-card: ${tokens.surface};
    --text-primary: ${tokens.textPrimary};
    --text-secondary: ${tokens.textSecondary};
    --border-color: ${tokens.border};

    --font-heading: "${tokens.fontDisplay}";
    --font-body: "${tokens.fontBody}";
    --radius-card: ${tokens.radiusCard};
    --radius-button: ${tokens.radiusButton};
    --shadow-depth: ${tokens.shadowCard};
    --border-width: ${tokens.borderWidth};
    --padding-spacing: ${tokens.paddingCard};
  }
}`;

  const handleCopyCode = (format: 'tailwind' | 'css', text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <div className="w-full bg-slate-900 border-t border-slate-800 p-5 shrink-0">
      
      {/* Tab Menu Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider">Developer Inspector</h2>
        </div>

        {/* Navigation keys */}
        <div className="flex gap-1.5 p-0.5 bg-slate-950 border border-slate-800 rounded-lg text-xs">
          <button 
            onClick={() => setActiveTab('tailwind')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${activeTab === 'tailwind' ? 'bg-violet-600/20 text-violet-400 font-bold border border-violet-800/50' : 'text-slate-400 hover:text-slate-100'}`}
          >
            Tailwind Token Contract
          </button>
          <button 
            onClick={() => setActiveTab('css')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${activeTab === 'css' ? 'bg-violet-600/20 text-violet-400 font-bold border border-violet-800/50' : 'text-slate-400 hover:text-slate-100'}`}
          >
            globals.css variables
          </button>
          <button 
            onClick={() => setActiveTab('contrast')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${activeTab === 'contrast' ? 'bg-violet-600/20 text-violet-400 font-bold border border-violet-800/50' : 'text-slate-400 hover:text-slate-100'}`}
          >
            Contrast Auditor
          </button>
        </div>
      </div>

      {/* Tabs panels */}
      <div className="space-y-4">
        
        {/* VIEW 1: Tailwind theme */}
        {activeTab === 'tailwind' && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center bg-slate-950/40 px-3 py-1.5 rounded-t-lg border-x border-t border-slate-800">
              <span className="text-[10px] font-mono text-slate-500">tailwind.config.ts</span>
              <button 
                onClick={() => handleCopyCode('tailwind', tailwindSnippet)}
                className="text-[10px] font-semibold text-slate-300 hover:text-slate-100 flex items-center gap-1 cursor-pointer bg-slate-900 border border-slate-850 px-2 py-1 rounded"
              >
                {copiedFormat === 'tailwind' ? (
                  <>
                    <ClipboardCheck className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>Copy Token Contract</span>
                  </>
                )}
              </button>
            </div>
            <pre className="text-left bg-slate-950 p-4 rounded-b-lg text-[10.5px] leading-relaxed select-all border-x border-b border-slate-800 font-mono overflow-x-auto text-slate-300 max-h-48">
              {tailwindSnippet}
            </pre>
          </div>
        )}

        {/* VIEW 2: CSS Custom Vars */}
        {activeTab === 'css' && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center bg-slate-950/40 px-3 py-1.5 rounded-t-lg border-x border-t border-slate-800">
              <span className="text-[10px] font-mono text-slate-500">styles/variables.css</span>
              <button 
                onClick={() => handleCopyCode('css', cssSnippet)}
                className="text-[10px] font-semibold text-slate-300 hover:text-slate-100 flex items-center gap-1 cursor-pointer bg-slate-900 border border-slate-850 px-2 py-1 rounded"
              >
                {copiedFormat === 'css' ? (
                  <>
                    <ClipboardCheck className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>Copy variables.css</span>
                  </>
                )}
              </button>
            </div>
            <pre className="text-left bg-slate-950 p-4 rounded-b-lg text-[10.5px] leading-relaxed select-all border-x border-b border-slate-800 font-mono overflow-x-auto text-slate-300 max-h-48">
              {cssSnippet}
            </pre>
          </div>
        )}

        {/* VIEW 3: Realtime Contrast Auditor */}
        {activeTab === 'contrast' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Contrast Indicator 1 */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] font-mono text-slate-500 block">ELEMENT CONTRAST</span>
                <span className="font-bold text-slate-100 block mt-1">Primary Body Text</span>
              </div>
              <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-mono tracking-tight" style={{ color: tokens.textPrimary }}>
                    {textToSurfaceContrast}
                  </span>
                  <span className="text-[10px] opacity-60">: 1 ratio</span>
                </div>

                <div className="flex flex-col items-end gap-1 font-mono text-[9px]">
                  <span className={`px-1.5 py-0.5 rounded font-bold ${textToSurfaceContrast >= 4.5 ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50' : 'bg-rose-950/40 text-rose-400 border border-rose-900/50'}`}>
                    {textToSurfaceContrast >= 4.5 ? 'WCAG AA PASS' : 'WCAG FAIL'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded font-bold ${textToSurfaceContrast >= 7.0 ? 'bg-emerald-950/40 text-emerald-450 border border-emerald-900/50' : 'bg-slate-900 text-slate-500'}`}>
                    {textToSurfaceContrast >= 7.0 ? 'WCAG AAA PASS' : 'LACK AAA'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contrast Indicator 2 */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] font-mono text-slate-500 block">ACCENT CONTRAST</span>
                <span className="font-bold text-slate-100 block mt-1">Secondary Subtext</span>
              </div>
              <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-mono tracking-tight" style={{ color: tokens.textSecondary }}>
                    {subtextToSurfaceContrast}
                  </span>
                  <span className="text-[10px] opacity-60">: 1 ratio</span>
                </div>

                <div className="flex flex-col items-end gap-1 font-mono text-[9px]">
                  <span className={`px-1.5 py-0.5 rounded font-bold ${subtextToSurfaceContrast >= 4.5 ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50' : 'bg-rose-950/40 text-rose-400 border border-rose-900/50'}`}>
                    {subtextToSurfaceContrast >= 4.5 ? 'WCAG AA PASS' : 'WCAG FAIL'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded font-bold ${subtextToSurfaceContrast >= 7.0 ? 'bg-emerald-950/40 text-emerald-450 border border-emerald-900/50' : 'bg-slate-900 text-slate-500'}`}>
                    {subtextToSurfaceContrast >= 7.0 ? 'WCAG AAA PASS' : 'LACK AAA'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contrast Indicator 3 */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] font-mono text-slate-500 block">BRAND CONTRAST</span>
                <span className="font-bold text-slate-100 block mt-1">Primary Brand Accent</span>
              </div>
              <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-mono tracking-tight" style={{ color: tokens.primary }}>
                    {brandToSurfaceContrast}
                  </span>
                  <span className="text-[10px] opacity-60">: 1 ratio</span>
                </div>

                <div className="flex flex-col items-end gap-1 font-mono text-[9px]">
                  <span className={`px-1.5 py-0.5 rounded font-bold ${brandToSurfaceContrast >= 3.0 ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/50' : 'bg-amber-950/40 text-amber-500 border border-amber-900/50'}`}>
                    {brandToSurfaceContrast >= 3.0 ? 'AA ACCESSIBLE' : 'LOW CONTRAST'}
                  </span>
                  <span className="opacity-50 text-[10px]">Targets large buttons/text</span>
                </div>
              </div>
            </div>

          </div>
        )}
        
      </div>

    </div>
  );
}
