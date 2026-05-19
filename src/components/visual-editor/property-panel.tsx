'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { ComponentInstance, ComponentDefinition } from './types';
import { getComponentDefinition } from './types';
import {
  Trash2, Copy, RotateCcw, ArrowUp, ArrowDown, Eye, EyeOff,
} from 'lucide-react';

interface PropertyPanelProps {
  component: ComponentInstance | null;
  onUpdateProps: (id: string, props: Record<string, unknown>) => void;
  onUpdateSize: (id: string, width: number, height: number) => void;
  onMove: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReset: (id: string) => void;
  className?: string;
}

export function PropertyPanel({
  component,
  onUpdateProps,
  onUpdateSize,
  onMove,
  onDelete,
  onDuplicate,
  onReset,
  className,
}: PropertyPanelProps) {
  const def = component ? getComponentDefinition(component.type) : null;

  if (!component || !def) {
    return (
      <div className={cn('flex flex-col h-full bg-[var(--app-panel-2)] select-none', className)}>
        <div className="px-3 h-11 flex items-center border-b border-[var(--app-border)] shrink-0">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--app-text-dim)]">
            Properties
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="space-y-2">
            <div className="w-10 h-10 mx-auto rounded-[8px] bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center">
              <EyeOff className="h-4 w-4 text-[var(--app-text-dim)]" />
            </div>
            <p className="text-[11px] text-[var(--app-text-muted)]">
              Select a component on the canvas to edit its properties
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handlePropChange = (key: string, value: unknown) => {
    onUpdateProps(component.id, { ...component.props, [key]: value });
  };

  return (
    <div className={cn('flex flex-col h-full bg-[var(--app-panel-2)] select-none', className)}>
      {/* Header */}
      <div className="px-3 h-11 flex items-center justify-between border-b border-[var(--app-border)] shrink-0">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--app-text-dim)]">
          Properties
        </h3>
        <div className="flex items-center gap-0.5">
          <button
            className="h-7 w-7 rounded-[4px] flex items-center justify-center hover:bg-[var(--app-surface)] text-[var(--app-text-dim)] hover:text-[var(--app-text)] transition-colors"
            onClick={() => onDuplicate(component.id)}
            title="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            className="h-7 w-7 rounded-[4px] flex items-center justify-center hover:bg-[var(--app-surface)] text-[var(--app-text-dim)] hover:text-[var(--app-text)] transition-colors"
            onClick={() => onReset(component.id)}
            title="Reset to defaults"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            className="h-7 w-7 rounded-[4px] flex items-center justify-center hover:bg-red-50 text-[var(--app-text-dim)] hover:text-red-500 transition-colors"
            onClick={() => onDelete(component.id)}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Component Info */}
      <div className="px-3 py-3 border-b border-[var(--app-border)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center">
            <span className="text-[16px] leading-none">{getIcon(def)}</span>
          </div>
          <div>
            <p className="text-[13px] font-medium text-[var(--app-text)]">{def.label}</p>
            <p className="text-[10px] text-[var(--app-text-dim)]">{def.type}</p>
          </div>
        </div>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto">
        {/* Layout Section */}
        <PropertySection title="Layout">
          <PropRow label="Width">
            <input
              type="number"
              value={component.size.width}
              onChange={(e) => onUpdateSize(component.id, Number(e.target.value), component.size.height)}
              className="h-7 w-full rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            />
          </PropRow>
          <PropRow label="Height">
            <input
              type="number"
              value={component.size.height}
              onChange={(e) => onUpdateSize(component.id, component.size.width, Number(e.target.value))}
              className="h-7 w-full rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            />
          </PropRow>
          <PropRow label="X Position">
            <input
              type="number"
              value={Math.round(component.position.x)}
              onChange={(e) => onMove(component.id, Number(e.target.value), component.position.y)}
              className="h-7 w-full rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            />
          </PropRow>
          <PropRow label="Y Position">
            <input
              type="number"
              value={Math.round(component.position.y)}
              onChange={(e) => onMove(component.id, component.position.x, Number(e.target.value))}
              className="h-7 w-full rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            />
          </PropRow>
        </PropertySection>

        {/* Component-specific props */}
        {Object.entries(def.defaultProps).filter(([key]) => !['width', 'height'].includes(key)).length > 0 && (
          <PropertySection title={def.label}>
            {Object.entries(def.defaultProps).map(([key, defaultValue]) => {
              const value = component.props[key] ?? defaultValue;
              const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());

              return (
                <PropRow key={key} label={label}>
                  {renderPropInput(key, value, (newValue) => handlePropChange(key, newValue))}
                </PropRow>
              );
            })}
          </PropertySection>
        )}

        {/* CSS Class Override */}
        <PropertySection title="Advanced">
          <PropRow label="CSS Class">
            <input
              type="text"
              value={component.className || ''}
              onChange={(e) => handlePropChange('className', e.target.value)}
              placeholder="custom-class"
              className="h-7 w-full rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:border-[var(--app-accent)] font-mono"
            />
          </PropRow>
        </PropertySection>
      </div>
    </div>
  );
}

function PropertySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--app-border)]">
      <div className="px-3 py-2">
        <h4 className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--app-text-dim)] mb-2">
          {title}
        </h4>
        <div className="space-y-2">
          {children}
        </div>
      </div>
    </div>
  );
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[10px] text-[var(--app-text-muted)] min-w-[60px] shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function renderPropInput(key: string, value: unknown, onChange: (value: unknown) => void) {
  switch (key) {
    case 'text':
    case 'placeholder':
    case 'label':
    case 'brand':
    case 'name':
    case 'src':
    case 'alt':
    case 'href':
    case 'description':
      return (
        <input
          type="text"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-full rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
        />
      );
    case 'variant':
      return (
        <select
          value={String(value ?? 'primary')}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-full rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
        >
          {['primary', 'secondary', 'outline', 'ghost', 'danger', 'info', 'success', 'warning'].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      );
    case 'size':
    case 'level':
      if (key === 'level') {
        return (
          <select
            value={String(value ?? 2)}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-7 w-full rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>H{n}</option>
            ))}
          </select>
        );
      }
      return (
        <select
          value={String(value ?? 'md')}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-full rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
        >
          {['xs', 'sm', 'md', 'lg', 'xl'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      );
    case 'fontSize':
    case 'padding':
    case 'margin':
    case 'gap':
    case 'maxWidth':
    case 'radius':
    case 'borderRadius':
      return (
        <input
          type="text"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-full rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)] font-mono"
        />
      );
    case 'align':
    case 'textAlign':
      return (
        <select
          value={String(value ?? 'left')}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-full rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
        >
          {['left', 'center', 'right', 'justify'].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      );
    case 'type':
      if (typeof value === 'string' && ['button', 'submit', 'reset', 'text', 'email', 'password', 'number'].includes(value)) {
        return (
          <select
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 w-full rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
          >
            {['text', 'email', 'password', 'number'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        );
      }
      return (
        <select
          value={String(value ?? 'static')}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-full rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
        >
          {['static', 'fixed', 'sticky', 'absolute', 'relative'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      );
    case 'color':
    case 'background':
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={String(value ?? '#000000')}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 w-8 rounded-[4px] border border-[var(--app-border)] cursor-pointer"
          />
          <input
            type="text"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 flex-1 rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)] font-mono"
          />
        </div>
      );
    case 'options':
    case 'links':
    case 'columns':
    case 'items':
      return (
        <input
          type="text"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder="comma,separated,values"
          className="h-7 w-full rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:border-[var(--app-accent)]"
        />
      );
    case 'rows':
    case 'columns_count':
    case 'value':
    case 'max':
      return (
        <input
          type="number"
          value={Number(value ?? 0)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-7 w-full rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
        />
      );
    case 'shadow':
      return (
        <select
          value={String(value ?? 'none')}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-full rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
        >
          {['none', 'sm', 'md', 'lg', 'xl'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      );
    case 'checked':
    case 'disabled':
    case 'required':
    case 'dismissible':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded-[4px] border-[var(--app-border)] accent-[var(--app-accent)]"
          />
        </label>
      );
    case 'position':
      return (
        <select
          value={String(value ?? 'static')}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-full rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
        >
          {['static', 'fixed', 'sticky', 'absolute', 'relative'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      );
    case 'objectFit':
      return (
        <select
          value={String(value ?? 'cover')}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-full rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
        >
          {['cover', 'contain', 'fill', 'none', 'scale-down'].map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      );
    default:
      return (
        <input
          type="text"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-full rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 text-[11px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
        />
      );
  }
}

function getIcon(def: ComponentDefinition): string {
  const icons: Record<string, string> = {
    container: '▣',
    row: '⇔',
    column: '⊞',
    card: '▢',
    section: '▬',
    grid: '⊞',
    divider: '─',
    heading: 'H',
    text: 'T',
    badge: '⬟',
    button: '▤',
    input: '⌨',
    textarea: '¶',
    select: '☰',
    checkbox: '☑',
    radio: '◉',
    form: '📋',
    table: '⊞',
    list: '☰',
    image: '🖼',
    video: '▶',
    icon: '✦',
    navbar: '≡',
    link: '🔗',
    breadcrumbs: '›',
    alert: '⚠',
    progress: '▤',
    spinner: '⟳',
  };
  return icons[def.type] || '□';
}
