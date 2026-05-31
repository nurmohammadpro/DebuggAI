import { CSSProperties } from 'react';

export interface DesignTokens {
  // Colors
  primary: string;       // Brand hex (e.g., #6366f1)
  secondary: string;     // Accent hex (e.g., #0ea5e9)
  background: string;    // Main bg hex (e.g., #f8fafc)
  surface: string;       // Card bg hex (e.g., #ffffff)
  textPrimary: string;   // Main text hex (e.g., #0f172a)
  textSecondary: string; // Muted text hex (e.g., #475569)
  border: string;        // Border hex (e.g., #e2e8f0)
  
  // Typography
  fontDisplay: 'sans' | 'mono' | 'serif' | 'grotesk' | 'playfair';
  fontBody: 'sans' | 'mono' | 'serif';
  sizeScale: 'compact' | 'balanced' | 'spacious';
  letterSpacing: 'tight' | 'normal' | 'wide';
  lineHeight: 'snug' | 'normal' | 'relaxed';

  // Decorative Scales
  radiusCard: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  radiusButton: 'none' | 'sm' | 'md' | 'lg' | 'full';
  shadowCard: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'inner';
  borderWidth: '0px' | '1px' | '2px';
  
  // Spacing Density
  paddingCard: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  gapSize: 'xs' | 'sm' | 'md' | 'lg';
}

export type PresetThemeId = 'neutral-slate' | 'cyberpunk-neon' | 'warm-paper' | 'nordic-sky' | 'classic-dark' | 'brutalist-yellow';

export interface PresetTheme {
  id: PresetThemeId;
  name: string;
  description: string;
  tokens: DesignTokens;
}

export const PRESET_THEMES: PresetTheme[] = [
  {
    id: 'neutral-slate',
    name: 'Neutral Slate',
    description: 'A versatile, modern enterprise layout utilizing clean off-whites and pristine deep charcoals.',
    tokens: {
      primary: '#6366f1',
      secondary: '#0ea5e9',
      background: '#f8fafc',
      surface: '#ffffff',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      border: '#e2e8f0',
      fontDisplay: 'sans',
      fontBody: 'sans',
      sizeScale: 'balanced',
      letterSpacing: 'normal',
      lineHeight: 'normal',
      radiusCard: 'xl',
      radiusButton: 'lg',
      shadowCard: 'md',
      borderWidth: '1px',
      paddingCard: 'lg',
      gapSize: 'md',
    }
  },
  {
    id: 'nordic-sky',
    name: 'Nordic Sky',
    description: 'An organic, fresh theme inspired by sub-zero skies and minimalist Scandinavian cabins.',
    tokens: {
      primary: '#0f766e',
      secondary: '#06b6d4',
      background: '#f0f9ff',
      surface: '#ffffff',
      textPrimary: '#0f172a',
      textSecondary: '#64748b',
      border: '#e0f2fe',
      fontDisplay: 'grotesk',
      fontBody: 'sans',
      sizeScale: 'balanced',
      letterSpacing: 'tight',
      lineHeight: 'relaxed',
      radiusCard: '2xl',
      radiusButton: 'full',
      shadowCard: 'sm',
      borderWidth: '1px',
      paddingCard: 'xl',
      gapSize: 'md',
    }
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Console',
    description: 'A glowing, immersive dark terminal environment featuring vibrant pinks and hyper-neons.',
    tokens: {
      primary: '#ec4899',
      secondary: '#06b6d4',
      background: '#09090b',
      surface: '#18181b',
      textPrimary: '#f4f4f5',
      textSecondary: '#a1a1aa',
      border: '#27272a',
      fontDisplay: 'mono',
      fontBody: 'mono',
      sizeScale: 'compact',
      letterSpacing: 'wide',
      lineHeight: 'snug',
      radiusCard: 'none',
      radiusButton: 'none',
      shadowCard: 'none',
      borderWidth: '2px',
      paddingCard: 'md',
      gapSize: 'sm',
    }
  },
  {
    id: 'warm-paper',
    name: 'Warm Paper Book',
    description: 'An eye-pleasing, calm editorial display inspired by linen pages and sepia inks.',
    tokens: {
      primary: '#c2410c',
      secondary: '#b45309',
      background: '#fafaf9',
      surface: '#f5f5f4',
      textPrimary: '#1c1917',
      textSecondary: '#57534e',
      border: '#e7e5e4',
      fontDisplay: 'playfair',
      fontBody: 'serif',
      sizeScale: 'spacious',
      letterSpacing: 'normal',
      lineHeight: 'relaxed',
      radiusCard: 'md',
      radiusButton: 'md',
      shadowCard: 'sm',
      borderWidth: '1px',
      paddingCard: 'xl',
      gapSize: 'lg',
    }
  },
  {
    id: 'brutalist-yellow',
    name: 'Raw Brutalist',
    description: 'Bold high-contrast borders, solid bright colors, and monospace accents for attitude.',
    tokens: {
      primary: '#000000',
      secondary: '#facc15',
      background: '#fef08a',
      surface: '#ffffff',
      textPrimary: '#000000',
      textSecondary: '#1f2937',
      border: '#000000',
      fontDisplay: 'grotesk',
      fontBody: 'mono',
      sizeScale: 'balanced',
      letterSpacing: 'tight',
      lineHeight: 'snug',
      radiusCard: 'none',
      radiusButton: 'sm',
      shadowCard: 'xl', // We map this to solid black offsets
      borderWidth: '2px',
      paddingCard: 'lg',
      gapSize: 'md',
    }
  },
  {
    id: 'classic-dark',
    name: 'Slate Midnight',
    description: 'Sophisticated dark background paired with sapphire gradients and clean slate surfaces.',
    tokens: {
      primary: '#3b82f6',
      secondary: '#6366f1',
      background: '#0f172a',
      surface: '#1e293b',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      border: '#334155',
      fontDisplay: 'sans',
      fontBody: 'sans',
      sizeScale: 'balanced',
      letterSpacing: 'normal',
      lineHeight: 'normal',
      radiusCard: 'xl',
      radiusButton: 'lg',
      shadowCard: 'lg',
      borderWidth: '1px',
      paddingCard: 'lg',
      gapSize: 'md',
    }
  }
];

// Helper functions to get Tailwind values or inline styles
export function mapFontDisplay(font: DesignTokens['fontDisplay']): string {
  switch (font) {
    case 'sans': return 'font-sans';
    case 'mono': return 'font-mono';
    case 'serif': return 'font-serif';
    case 'grotesk': return 'font-sans font-sans-grotesk'; // Apply styled classes in CSS
    case 'playfair': return 'font-serif font-serif-editorial';
    default: return 'font-sans';
  }
}

export function mapFontBody(font: DesignTokens['fontBody']): string {
  switch (font) {
    case 'sans': return 'font-sans';
    case 'mono': return 'font-mono';
    case 'serif': return 'font-serif';
    default: return 'font-sans';
  }
}

export function mapLetterSpacing(spacing: DesignTokens['letterSpacing']): string {
  switch (spacing) {
    case 'tight': return 'tracking-tight';
    case 'normal': return 'tracking-normal';
    case 'wide': return 'tracking-wide';
    default: return 'tracking-normal';
  }
}

export function mapLineHeight(lineHeight: DesignTokens['lineHeight']): string {
  switch (lineHeight) {
    case 'snug': return 'leading-snug';
    case 'normal': return 'leading-normal';
    case 'relaxed': return 'leading-relaxed';
    default: return 'leading-normal';
  }
}

export function mapSizeScale(scale: DesignTokens['sizeScale']): { title: string; body: string; caption: string } {
  switch (scale) {
    case 'compact':
      return { title: 'text-lg sm:text-xl md:text-2xl', body: 'text-xs md:text-sm', caption: 'text-[10px]' };
    case 'spacious':
      return { title: 'text-2xl sm:text-3xl md:text-4xl', body: 'text-base md:text-lg', caption: 'text-xs md:text-sm' };
    case 'balanced':
    default:
      return { title: 'text-xl sm:text-2xl md:text-3xl', body: 'text-sm md:text-base', caption: 'text-xs' };
  }
}

export function mapRadiusCard(radius: DesignTokens['radiusCard']): string {
  switch (radius) {
    case 'none': return 'rounded-none';
    case 'sm': return 'rounded-sm';
    case 'md': return 'rounded-md';
    case 'lg': return 'rounded-lg';
    case 'xl': return 'rounded-xl';
    case '2xl': return 'rounded-2xl';
    case 'full': return 'rounded-[2rem]';
    default: return 'rounded-xl';
  }
}

export function mapRadiusButton(radius: DesignTokens['radiusButton']): string {
  switch (radius) {
    case 'none': return 'rounded-none';
    case 'sm': return 'rounded-sm';
    case 'md': return 'rounded-md';
    case 'lg': return 'rounded-lg';
    case 'full': return 'rounded-full';
    default: return 'rounded-lg';
  }
}

export function mapPaddingCard(padding: DesignTokens['paddingCard']): string {
  switch (padding) {
    case 'none': return 'p-0';
    case 'xs': return 'p-2';
    case 'sm': return 'p-4';
    case 'md': return 'p-5 sm:p-6';
    case 'lg': return 'p-6 sm:p-8';
    case 'xl': return 'p-8 sm:p-12';
    default: return 'p-5 sm:p-6';
  }
}

export function mapGapSize(gap: DesignTokens['gapSize']): string {
  switch (gap) {
    case 'xs': return 'gap-2';
    case 'sm': return 'gap-4';
    case 'md': return 'gap-6';
    case 'lg': return 'gap-8';
    default: return 'gap-6';
  }
}

export function mapShadowCard(shadow: DesignTokens['shadowCard'], isBrutalist: boolean): string {
  if (isBrutalist) {
    switch (shadow) {
      case 'none': return 'shadow-none';
      case 'sm': return 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]';
      case 'md': return 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]';
      case 'lg': return 'shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]';
      case 'xl': return 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]';
      default: return 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]';
    }
  }
  
  switch (shadow) {
    case 'none': return 'shadow-none';
    case 'sm': return 'shadow-xs';
    case 'md': return 'shadow-sm';
    case 'lg': return 'shadow-md';
    case 'xl': return 'shadow-xl';
    case 'inner': return 'shadow-inner';
    default: return 'shadow-sm';
  }
}

export function mapBorderWidth(width: DesignTokens['borderWidth']): string {
  switch (width) {
    case '0px': return 'border-0';
    case '1px': return 'border';
    case '2px': return 'border-2';
    default: return 'border';
  }
}

// Convert design tokens to CSS custom variables style block
export function getTokensCSSVariables(tokens: DesignTokens): CSSProperties {
  return {
    '--color-primary': tokens.primary,
    '--color-secondary': tokens.secondary,
    '--bg-main': tokens.background,
    '--bg-card': tokens.surface,
    '--text-main': tokens.textPrimary,
    '--text-muted': tokens.textSecondary,
    '--color-border': tokens.border,
  } as CSSProperties;
}
