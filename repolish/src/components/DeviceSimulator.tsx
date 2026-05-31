import React, { useState } from 'react';
import { Tablet, Smartphone, Laptop, RotateCw, ZoomIn, ZoomOut, Check, Globe, ShieldCheck } from 'lucide-react';
import { DesignTokens } from '../types';

interface DeviceSimulatorProps {
  tokens: DesignTokens;
  children: React.ReactNode;
}

type ViewportType = 'mobile' | 'tablet' | 'desktop';

export default function DeviceSimulator({ tokens, children }: DeviceSimulatorProps) {
  const [viewport, setViewport] = useState<ViewportType>('desktop');
  const [isPortrait, setIsPortrait] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(100);

  // Layout helper values
  const isRotated = !isPortrait && (viewport === 'mobile' || viewport === 'tablet');

  const getSizingClasses = () => {
    switch (viewport) {
      case 'mobile':
        return isPortrait 
          ? { width: '375px', height: '667px', label: 'Mobile Portrait (375x667)' } 
          : { width: '667px', height: '375px', label: 'Mobile Landscape (667x375)' };
      case 'tablet':
        return isPortrait 
          ? { width: '768px', height: '1024px', label: 'Tablet Portrait (768x1024)' } 
          : { width: '1024px', height: '768px', label: 'Tablet Landscape (1024x768)' };
      case 'desktop':
      default:
        return { width: '100%', height: '100%', label: 'Fluid PC Viewport (Dynamic)' };
    }
  };

  const currentSize = getSizingClasses();

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden text-slate-100">
      
      {/* 1. Simulator Workspace Controls BAR */}
      <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ACTIVE RESIZE STATE:</span>
            <span className="font-bold text-violet-400 capitalize">{currentSize.label}</span>
          </div>
        </div>

        {/* Device select buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-lg">
          {/* PC Desktop Button */}
          <button
            onClick={() => setViewport('desktop')}
            className={`p-2 rounded-md transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${viewport === 'desktop' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'}`}
            title="Desktop PC monitor layout"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>

          {/* Tablet Button */}
          <button
            onClick={() => setViewport('tablet')}
            className={`p-2 rounded-md transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${viewport === 'tablet' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'}`}
            title="Tablet scale frame"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tablet</span>
          </button>

          {/* Mobile Phone Button */}
          <button
            onClick={() => setViewport('mobile')}
            className={`p-2 rounded-md transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${viewport === 'mobile' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'}`}
            title="Mobile device view"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        {/* Viewport modifications (Rotation, Zoom keys) */}
        <div className="flex items-center gap-2">
          {viewport !== 'desktop' && (
            <button
              onClick={() => setIsPortrait(!isPortrait)}
              className="p-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1"
              title="Rotate device viewport aspect ratio"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate</span>
            </button>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button 
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              className="p-1.5 text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Zoom out frame"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-2 font-bold text-slate-300">{zoom}%</span>
            <button 
              onClick={() => setZoom(Math.min(100, zoom + 10))}
              className="p-1.5 text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Zoom in frame"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Simulated secure browser URL mockup BAR */}
      <div className="px-5 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-3">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700"></span>
          <span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700"></span>
          <span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700"></span>
        </div>
        
        {/* Secure Simulated URL Bar */}
        <div className="flex-1 bg-slate-950 rounded-md border border-slate-800/70 py-1 px-3 flex items-center justify-between text-[11px] text-slate-400 max-w-2xl mx-auto">
          <div className="flex items-center gap-1.5 font-mono select-none">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 fill-emerald-950/20" />
            <span className="text-emerald-400">https://</span>
            <span className="text-slate-300 font-semibold">repolish.dev/sandbox-live</span>
          </div>
          <span className="text-[9px] font-mono text-slate-600 bg-slate-900 px-1 rounded uppercase">SSL CERT</span>
        </div>
      </div>

      {/* 3. Outer Device Simulation Area */}
      <div className="flex-1 relative overflow-auto p-4 md:p-8 flex items-center justify-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] bg-slate-950/40">
        
        {/* Device frame container scaled by zoom value */}
        <div 
          className="transition-all duration-300 ease-out flex items-center justify-center p-1"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
        >
          {viewport === 'desktop' ? (
            /* Desktop view - flat seamless browser simulated widget */
            <div className="w-full max-w-7xl h-[620px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>
            </div>
          ) : viewport === 'mobile' ? (
            /* Mobile Frame Simulator with Bezel Notch styles */
            <div 
              className="bg-slate-900 border-[12px] border-slate-800 relative shadow-2xl overflow-hidden flex flex-col"
              style={{ 
                width: currentSize.width, 
                height: currentSize.height,
                borderRadius: '40px',
              }}
            >
              {/* Notch */}
              {isPortrait && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-800 rounded-b-xl z-50 flex items-center justify-center">
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-800" />
                  <span className="w-10 h-1 bg-slate-950 rounded-full ml-4" />
                </div>
              )}

              {/* Internal Workspace */}
              <div className="flex-1 overflow-y-auto pt-4 pb-2">
                {children}
              </div>

              {/* Bottom simulated home bar indicator line */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-slate-600 rounded-full z-40" />
            </div>
          ) : (
            /* Tablet Frame Simulator */
            <div 
              className="bg-slate-900 border-[16px] border-slate-800 relative shadow-2xl overflow-hidden flex flex-col"
              style={{ 
                width: currentSize.width, 
                height: currentSize.height,
                borderRadius: '32px',
              }}
            >
              {/* Internal Workspace */}
              <div className="flex-grow overflow-y-auto">
                {children}
              </div>

              {/* Home bar button on base bevel */}
              {isPortrait && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 h-1 bg-slate-600 rounded-full z-40" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
