'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { ComponentDefinition, ComponentCategory } from './types';
import { BUILT_IN_COMPONENTS } from './types';
import {
  Square, Columns2, Columns3, CreditCard, LayoutPanelTop, Grid3x3, Minus,
  Heading1, Type, Tag, MousePointerClick, SquarePen, AlignLeft, ListChecks,
  CheckSquare, CircleDot, FileText, Table, List, Image, Video, Smile,
  Navigation, Link, ChevronRight, AlertTriangle, Loader, LoaderCircle,
  Search,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Square, Columns2, Columns3, CreditCard, LayoutPanelTop, Grid3x3, Minus,
  Heading1, Type, Tag, MousePointerClick, SquarePen, AlignLeft, ListChecks,
  CheckSquare, CircleDot, FileText, Table, List, Image, Video, Smile,
  Navigation, Link, ChevronRight, AlertTriangle, Loader, LoaderCircle,
};

const CATEGORIES: { id: ComponentCategory; label: string }[] = [
  { id: 'layout', label: 'Layout' },
  { id: 'typography', label: 'Typography' },
  { id: 'forms', label: 'Forms' },
  { id: 'data', label: 'Data' },
  { id: 'media', label: 'Media' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'feedback', label: 'Feedback' },
];

interface ComponentPaletteProps {
  onDragStart: (type: string) => void;
  onDragEnd: () => void;
  className?: string;
}

export function ComponentPalette({ onDragStart, onDragEnd, className }: ComponentPaletteProps) {
  const [activeCategory, setActiveCategory] = useState<ComponentCategory>('layout');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = BUILT_IN_COMPONENTS.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.label.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    }
    return c.category === activeCategory;
  });

  return (
    <div className={cn('flex flex-col h-full bg-[var(--app-panel-2)] select-none', className)}>
      {/* Header */}
      <div className="px-3 h-11 flex items-center justify-between border-b border-[var(--app-border)] shrink-0">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--app-text-dim)]">
          Components
        </h3>
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 h-8 px-2.5 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)]">
          <Search className="h-3.5 w-3.5 text-[var(--app-text-dim)] shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find component..."
            className="bg-transparent border-0 text-[11px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none w-full"
          />
        </div>
      </div>

      {/* Category Tabs */}
      {!searchQuery && (
        <div className="px-3 pb-2 shrink-0 flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'h-6 px-2 rounded-[6px] text-[10px] font-medium transition-colors',
                activeCategory === cat.id
                  ? 'bg-[var(--app-accent)] text-[#071006]'
                  : 'bg-[var(--app-surface)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] border border-[var(--app-border)]'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Component List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="space-y-1">
          {filtered.length === 0 && (
            <p className="text-[11px] text-[var(--app-text-dim)] text-center py-6">
              {searchQuery ? 'No matching components' : 'No components in this category'}
            </p>
          )}
          {filtered.map((comp) => (
            <PaletteItem
              key={comp.type}
              definition={comp}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-[var(--app-border)] shrink-0">
        <p className="text-[9px] text-[var(--app-text-dim)] uppercase tracking-wider">
          Drag components onto the canvas
        </p>
      </div>
    </div>
  );
}

function PaletteItem({
  definition,
  onDragStart,
  onDragEnd,
}: {
  definition: ComponentDefinition;
  onDragStart: (type: string) => void;
  onDragEnd: () => void;
}) {
  const Icon = ICON_MAP[definition.icon] || Square;

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', definition.type);
      e.dataTransfer.effectAllowed = 'copy';
      onDragStart(definition.type);
    },
    [definition.type, onDragStart]
  );

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className="group flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] cursor-grab active:cursor-grabbing transition-colors hover:bg-[var(--app-surface)] border border-transparent hover:border-[var(--app-border)]"
      title={definition.description}
    >
      <div className="w-7 h-7 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center shrink-0 group-hover:border-[var(--app-accent)]/30 transition-colors">
        <Icon className="h-3.5 w-3.5 text-[var(--app-text-dim)] group-hover:text-[var(--app-accent)] transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-[var(--app-text)] truncate leading-tight">
          {definition.label}
        </p>
        <p className="text-[10px] text-[var(--app-text-dim)] truncate leading-tight">
          {definition.description}
        </p>
      </div>
      <div className="h-6 w-6 rounded-[6px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <GripDotsIcon className="h-3.5 w-3.5 text-[var(--app-text-dim)]" />
      </div>
    </div>
  );
}

function GripDotsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="5" r="1" fill="currentColor" />
      <circle cx="15" cy="5" r="1" fill="currentColor" />
      <circle cx="9" cy="12" r="1" fill="currentColor" />
      <circle cx="15" cy="12" r="1" fill="currentColor" />
      <circle cx="9" cy="19" r="1" fill="currentColor" />
      <circle cx="15" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}
