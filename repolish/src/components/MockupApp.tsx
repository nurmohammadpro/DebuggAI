import React from 'react';
import { DesignTokens, mapFontDisplay, mapFontBody, mapLetterSpacing, mapLineHeight, mapSizeScale, mapRadiusCard, mapRadiusButton, mapPaddingCard, mapGapSize, mapShadowCard, mapBorderWidth } from '../types';
import DashboardHome from './dashboard/DashboardHome';
import WebBuilder from './dashboard/WebBuilder';
import DebugScreen from './dashboard/DebugScreen';
import DashboardSettings from './dashboard/DashboardSettings';
import { 
  Sparkles, Home, Code, ShieldAlert, Settings, Layout, Laptop, 
  ExternalLink, Layers, Terminal, Clock, Star, Heart, Server
} from 'lucide-react';

interface MockupAppProps {
  tokens: DesignTokens;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function MockupApp({ tokens, activeTab, setActiveTab }: MockupAppProps) {
  // Check if Brutalist style should use high contrast outlines
  const isBrutalist = tokens.primary === '#000000' && tokens.background === '#fef08a';

  // Apply mapped system styles variables
  const fontDisplayCls = mapFontDisplay(tokens.fontDisplay);
  const fontBodyCls = mapFontBody(tokens.fontBody);
  const letterSpacingCls = mapLetterSpacing(tokens.letterSpacing);
  const lineHeightCls = mapLineHeight(tokens.lineHeight);
  const sizes = mapSizeScale(tokens.sizeScale);
  const radiusCardCls = mapRadiusCard(tokens.radiusCard);
  const radiusBtnCls = mapRadiusButton(tokens.radiusButton);
  const paddingCardCls = mapPaddingCard(tokens.paddingCard);
  const shadowCardCls = mapShadowCard(tokens.shadowCard, isBrutalist);
  const borderCls = mapBorderWidth(tokens.borderWidth);

  // Fallback to active state if tab got modified from parent or defaults
  const resolvedTab = ['home', 'builder', 'debug', 'settings'].includes(activeTab) ? activeTab : 'home';

  const inlineStyles = {
    color: tokens.textPrimary,
    fontFamily: fontBodyCls === 'font-mono' ? 'var(--font-mono)' : fontBodyCls === 'font-serif' ? 'var(--font-serif-editorial)' : 'var(--font-sans)',
  };

  return (
    <div 
      className="w-full min-h-full flex flex-col transition-all duration-300 select-none pb-6"
      style={{ 
        backgroundColor: tokens.background, 
        color: tokens.textPrimary,
        ...inlineStyles
      }}
    >
      {/* 1. Header / Navigation Mockup Dashboard shell header bar */}
      <header 
        className="sticky top-0 z-40 w-full transition-colors border-b shrink-0"
        style={{ 
          backgroundColor: `${tokens.surface}e6`, // Glass translucent fallback
          borderColor: tokens.border,
          backdropFilter: 'blur(10px)'
        }}
        id="mockup-header"
      >
        <div className="px-5 py-3 mx-auto max-w-7xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span 
              className={`p-1.5 flex items-center justify-center text-white ${radiusBtnCls} shadow-sm`}
              style={{ backgroundColor: tokens.primary }}
            >
              <Layout className="w-4 h-4" />
            </span>
            <div>
              <span 
                className={`font-black text-xs tracking-tight uppercase block ${fontDisplayCls}`}
                style={{ color: tokens.textPrimary }}
              >
                DevSuite
              </span>
              <span className="text-[9px] text-slate-500 font-mono tracking-wide">HYDRATED CONTEXT OK</span>
            </div>
          </div>

          {/* Nav links (PC/Tablet view show, mobile collapsed block below) */}
          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold">
            <button 
              onClick={() => setActiveTab('home')}
              className={`transition-all py-1 px-1.5 relative flex items-center gap-1.5 cursor-pointer hover:opacity-100 ${resolvedTab === 'home' ? 'font-black opacity-100' : 'opacity-65'}`}
              style={{ color: tokens.textPrimary }}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Dashboard Home</span>
              {resolvedTab === 'home' && (
                <span className="absolute bottom-[-13px] left-0 w-full h-[3px] rounded-t-sm" style={{ backgroundColor: tokens.primary }}></span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('builder')}
              className={`transition-all py-1 px-1.5 relative flex items-center gap-1.5 cursor-pointer hover:opacity-100 ${resolvedTab === 'builder' ? 'font-black opacity-100' : 'opacity-65'}`}
              style={{ color: tokens.textPrimary }}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Web Builder</span>
              {resolvedTab === 'builder' && (
                <span className="absolute bottom-[-13px] left-0 w-full h-[3px] rounded-t-sm" style={{ backgroundColor: tokens.primary }}></span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('debug')}
              className={`transition-all py-1 px-1.5 relative flex items-center gap-1.5 cursor-pointer hover:opacity-100 ${resolvedTab === 'debug' ? 'font-black opacity-100' : 'opacity-65'}`}
              style={{ color: tokens.textPrimary }}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Debugging Tracer</span>
              {resolvedTab === 'debug' && (
                <span className="absolute bottom-[-13px] left-0 w-full h-[3px] rounded-t-sm" style={{ backgroundColor: tokens.primary }}></span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('settings')}
              className={`transition-all py-1 px-1.5 relative flex items-center gap-1.5 cursor-pointer hover:opacity-100 ${resolvedTab === 'settings' ? 'font-black opacity-100' : 'opacity-65'}`}
              style={{ color: tokens.textPrimary }}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings & Branches</span>
              {resolvedTab === 'settings' && (
                <span className="absolute bottom-[-13px] left-0 w-full h-[3px] rounded-t-sm" style={{ backgroundColor: tokens.primary }}></span>
              )}
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden lg:inline-flex text-[9px] bg-slate-950 px-2 py-0.5 border border-slate-800 rounded font-mono text-slate-400">
              CLUSTER: AP-SOUTHEAST-1
            </span>
            <button 
              onClick={() => alert(`Synchronizing simulated design token variables database contract: Base Radius is ${tokens.radiusCard}, Base font display is ${tokens.fontDisplay}.`)}
              className={`text-[10px] py-1 px-2.5 font-bold text-white shadow-xs select-none transition-opacity hover:opacity-90 cursor-pointer ${radiusBtnCls}`}
              style={{ backgroundColor: tokens.primary }}
            >
              Deploy Build
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="px-5 py-5 mx-auto w-full max-w-7xl flex-1 flex flex-col gap-5">
        
        {/* Responsive internal secondary menu for quick tabs on compact mobile simulator viewports */}
        <div 
          className="md:hidden grid grid-cols-4 gap-1 p-1 borders rounded-lg font-bold text-[10px] select-none text-center" 
          style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
          id="mockup-mobile-menu"
        >
          <button 
            onClick={() => setActiveTab('home')} 
            className={`py-1.5 rounded transition-colors cursor-pointer ${resolvedTab === 'home' ? 'font-extrabold text-white' : 'opacity-65'}`}
            style={resolvedTab === 'home' ? { backgroundColor: tokens.primary } : {}}
          >
            Home
          </button>
          <button 
            onClick={() => setActiveTab('builder')} 
            className={`py-1.5 rounded transition-colors cursor-pointer ${resolvedTab === 'builder' ? 'font-extrabold text-white' : 'opacity-65'}`}
            style={resolvedTab === 'builder' ? { backgroundColor: tokens.primary } : {}}
          >
            Builder
          </button>
          <button 
            onClick={() => setActiveTab('debug')} 
            className={`py-1.5 rounded transition-colors cursor-pointer ${resolvedTab === 'debug' ? 'font-extrabold text-white' : 'opacity-65'}`}
            style={resolvedTab === 'debug' ? { backgroundColor: tokens.primary } : {}}
          >
            Tracer
          </button>
          <button 
            onClick={() => setActiveTab('settings')} 
            className={`py-1.5 rounded transition-colors cursor-pointer ${resolvedTab === 'settings' ? 'font-extrabold text-white' : 'opacity-65'}`}
            style={resolvedTab === 'settings' ? { backgroundColor: tokens.primary } : {}}
          >
            Config
          </button>
        </div>

        {/* View Switches */}
        <div className="flex-grow animate-fade-in relative z-10">
          {resolvedTab === 'home' && (
            <DashboardHome 
              tokens={tokens} 
              onNavigate={(tab) => setActiveTab(tab)} 
            />
          )}

          {resolvedTab === 'builder' && (
            <WebBuilder 
              tokens={tokens} 
            />
          )}

          {resolvedTab === 'debug' && (
            <DebugScreen 
              tokens={tokens} 
            />
          )}

          {resolvedTab === 'settings' && (
            <DashboardSettings 
              tokens={tokens} 
            />
          )}
        </div>

      </main>

      {/* Footer markup matching simulated theme variables */}
      <footer 
        className="mt-6 py-4 px-5 border-t text-center text-[10px] font-mono shrink-0 select-none"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
        id="mockup-footer"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500">
          <span>© 2026 DevSuite Workspace Inc. Handcrafted in Realtime Fluid Ratios</span>
          <span className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-[#a78bfa]">
            <Server className="w-3 h-3 text-[#f472b6]" /> Verified Secure Sandbox Nodes live
          </span>
        </div>
      </footer>
    </div>
  );
}
