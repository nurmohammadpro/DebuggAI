'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Trash2, Copy, Move, GripVertical, Plus } from 'lucide-react';
import type { ComponentInstance, EditorPage, DragState, SelectionState } from './types';
import { getComponentDefinition } from './types';

interface VisualEditorCanvasProps {
  page: EditorPage;
  selection: SelectionState;
  dragState: DragState;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number, height: number) => void;
  onDrop: (type: string, x: number, y: number, parentId?: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onUpdateProps: (id: string, props: Record<string, unknown>) => void;
  onHover: (id: string | null) => void;
  className?: string;
}

export function VisualEditorCanvas({
  page,
  selection,
  dragState,
  onSelect,
  onMove,
  onResize,
  onDrop,
  onDelete,
  onDuplicate,
  onHover,
  className,
}: VisualEditorCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(1024);
  const [showDropIndicator, setShowDropIndicator] = useState(false);

  // Canvas zoom controls
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setCanvasScale((prev) => Math.max(0.25, Math.min(2, prev - e.deltaY * 0.001)));
    }
  }, []);

  // Handle drops from palette
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setShowDropIndicator(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setShowDropIndicator(false);
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setShowDropIndicator(false);
      const type = e.dataTransfer.getData('text/plain');
      if (!type) return;

      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      const x = (e.clientX - canvasRect.left - panOffset.x) / canvasScale;
      const y = (e.clientY - canvasRect.top - panOffset.y) / canvasScale;

      onDrop(type, Math.max(0, x), Math.max(0, y), dragOverId ?? undefined);
    },
    [canvasScale, panOffset, dragOverId, onDrop]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === canvasRef.current || (e.target as HTMLElement).dataset.canvas) {
        onSelect('');
      }
    },
    [onSelect]
  );

  return (
    <div className={cn('flex flex-col h-full bg-[var(--app-bg)]', className)}>
      {/* Toolbar */}
      <div className="h-10 border-b border-[var(--app-border)] bg-[var(--app-panel)] flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--app-text-dim)]">
            {page.name}
          </span>
          <span className="text-[9px] text-[var(--app-text-dim)] px-1.5 py-0.5 rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] font-mono">
            {page.route}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <button
            className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors text-[13px]"
            onClick={() => setCanvasScale((s) => Math.max(0.25, s - 0.1))}
          >
            −
          </button>
          <span className="text-[10px] font-mono text-[var(--app-text-muted)] min-w-[36px] text-center">
            {Math.round(canvasScale * 100)}%
          </span>
          <button
            className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors text-[13px]"
            onClick={() => setCanvasScale((s) => Math.min(2, s + 0.1))}
          >
            +
          </button>
          <div className="w-px h-4 bg-[var(--app-border)] mx-1" />
          <button
            className="h-6 px-2 rounded-[4px] text-[10px] text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
            onClick={() => { setCanvasScale(1); setPanOffset({ x: 0, y: 0 }); }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 min-h-0 overflow-hidden relative bg-[var(--app-panel-2)]">
        {/* Device frame selector */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
          <div className="flex gap-1">
            {[
              { label: 'Desktop', width: 1024 },
              { label: 'Tablet', width: 768 },
              { label: 'Mobile', width: 375 },
            ].map((device) => (
              <button
                key={device.label}
                onClick={() => setCanvasWidth(device.width)}
                className={cn(
                  'h-6 px-2 rounded-[4px] text-[9px] font-medium uppercase tracking-wider transition-colors border',
                  canvasWidth === device.width
                    ? 'bg-[var(--app-accent)] text-[#071006] border-[var(--app-accent)]'
                    : 'text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] border-transparent hover:border-[var(--app-border)]'
                )}
              >
                {device.label}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={canvasRef}
          data-canvas="true"
          className="w-full h-full overflow-hidden"
          onWheel={handleWheel}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleCanvasClick}
        >
          <div
            className="relative origin-top-left transition-transform"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${canvasScale})`,
            }}
          >
            {/* Canvas Surface */}
            <div
              className="bg-white shadow-lg mx-auto transition-all duration-200"
              style={{
                width: canvasWidth,
                maxWidth: canvasWidth,
                minHeight: 800,
                transformOrigin: 'top left',
              }}
            >
              <AnimatePresence mode="popLayout">
                {page.rootComponents.length === 0 ? (
                  <motion.div
                    key="__empty__"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <EmptyCanvasState />
                  </motion.div>
                ) : (
                  <motion.div
                    key="canvas-content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    className="p-8 min-h-[800px]"
                  >
                    <AnimatePresence mode="popLayout">
                      {page.rootComponents.map((component) => (
                        <CanvasComponent
                          key={component.id}
                          component={component}
                          selection={selection}
                          onSelect={onSelect}
                          onMove={onMove}
                          onResize={onResize}
                          onDelete={onDelete}
                          onDuplicate={onDuplicate}
                          onHover={onHover}
                          onDrop={onDrop}
                          depth={0}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Drop indicator overlay */}
            {showDropIndicator && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-full border-2 border-dashed border-[var(--app-accent)]/40 rounded-[8px]" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="h-6 border-t border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-tighter">
            Components: {countComponents(page.rootComponents)}
          </span>
          {selection.selectedIds.length > 0 && (
            <span className="text-[9px] font-medium text-[var(--app-accent)] uppercase tracking-tighter">
              Selected: {selection.selectedIds.length}
            </span>
          )}
        </div>
        <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-tighter">
          Drag to add • Click to select • Del to delete
        </span>
      </div>
    </div>
  );
}

function EmptyCanvasState() {
  return (
    <div className="flex flex-col items-center justify-center h-[600px] text-center px-8">
      <div className="w-16 h-16 rounded-[12px] bg-[var(--app-surface)] border-2 border-dashed border-[var(--app-border)] flex items-center justify-center mb-4">
        <Plus className="h-6 w-6 text-[var(--app-text-dim)]" />
      </div>
      <h3 className="text-[14px] font-medium text-[var(--app-text)] mb-2">Empty Canvas</h3>
      <p className="text-[12px] text-[var(--app-text-muted)] max-w-[280px] leading-relaxed">
        Drag components from the palette on the left to start building your page.
      </p>
      <div className="mt-6 flex gap-2">
        {['Heading', 'Button', 'Card'].map((label) => (
          <span
            key={label}
            className="px-2.5 py-1 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)] text-[10px] text-[var(--app-text-muted)]"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

interface CanvasComponentProps {
  component: ComponentInstance;
  selection: SelectionState;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number, height: number) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onHover: (id: string | null) => void;
  onDrop: (type: string, x: number, y: number, parentId?: string) => void;
  depth: number;
}

function CanvasComponent({
  component,
  selection,
  onSelect,
  onMove,
  onResize,
  onDelete,
  onDuplicate,
  onHover,
  onDrop,
  depth,
}: CanvasComponentProps) {
  const isSelected = selection.selectedIds.includes(component.id);
  const isHovered = selection.hoveredId === component.id;
  const def = getComponentDefinition(component.type);
  const componentRef = useRef<HTMLDivElement>(null);
  const [resizeDir, setResizeDir] = useState<string | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; w: number; h: number; px: number; py: number } | null>(null);

  // Attach native dragstart via ref to avoid framer-motion's typed onDragStart collision
  useEffect(() => {
    const el = componentRef.current;
    if (!el) return;
    const handler = (e: DragEvent) => {
      e.dataTransfer?.setData('application/component-id', component.id);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    };
    el.addEventListener('dragstart', handler);
    return () => el.removeEventListener('dragstart', handler);
  }, [component.id]);

  // Resize mouse handlers
  useEffect(() => {
    if (!resizeDir) return;

    const handleMouseMove = (e: MouseEvent) => {
      const start = resizeStartRef.current;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      let newW = start.w;
      let newH = start.h;
      let newX = start.px;
      let newY = start.py;

      const minW = def?.minWidth || 20;
      const minH = def?.minHeight || 20;

      if (resizeDir.includes('e')) newW = Math.max(minW, start.w + dx);
      if (resizeDir.includes('w')) { newW = Math.max(minW, start.w - dx); newX = start.px + start.w - newW; }
      if (resizeDir.includes('s')) newH = Math.max(minH, start.h + dy);
      if (resizeDir.includes('n')) { newH = Math.max(minH, start.h - dy); newY = start.py + start.h - newH; }

      onResize(component.id, Math.round(newW), Math.round(newH));
      if (newX !== start.px || newY !== start.py) {
        onMove(component.id, Math.round(newX), Math.round(newY));
      }
    };

    const handleMouseUp = () => setResizeDir(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeDir, component.id, onResize, onMove, def?.minWidth, def?.minHeight]);

  const handleResizeStart = (e: React.MouseEvent, dir: string) => {
    e.stopPropagation();
    e.preventDefault();
    setResizeDir(dir);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: component.size.width,
      h: component.size.height,
      px: component.position.x,
      py: component.position.y,
    };
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const type = e.dataTransfer.getData('text/plain');
    if (type) {
      onDrop(type, 0, 0, component.id);
    }
  }, [component.id, onDrop]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85, y: -12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -8 }}
      transition={{
        type: 'spring',
        damping: 22,
        stiffness: 350,
        mass: 0.7,
        opacity: { duration: 0.2 },
      }}
      className={cn(
        'relative group',
        isSelected && 'ring-2 ring-[var(--app-accent)] ring-offset-2 rounded-[4px]',
        isHovered && !isSelected && 'ring-1 ring-[var(--app-accent)]/40 rounded-[4px]'
      )}
      style={{
        marginBottom: depth === 0 ? 16 : 8,
      }}
      ref={componentRef}
      draggable
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = def?.droppable ? 'copy' : 'none'; }}
      onDrop={def?.droppable ? handleDrop : undefined}
      onClick={(e) => { e.stopPropagation(); onSelect(component.id); }}
      onMouseEnter={() => onHover(component.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Component Actions Toolbar */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.12 }}
          className="absolute -top-8 left-0 z-20 flex items-center gap-0.5 bg-[var(--app-accent)] rounded-[6px] px-1 py-0.5 shadow-lg"
        >
          <button
            className="h-6 w-6 rounded-[4px] flex items-center justify-center hover:bg-black/10 transition-colors"
            onClick={(e) => { e.stopPropagation(); onDuplicate(component.id); }}
            title="Duplicate"
          >
            <Copy className="h-3 w-3 text-[#071006]" />
          </button>
          <button
            className="h-6 w-6 rounded-[4px] flex items-center justify-center hover:bg-black/10 transition-colors"
            onClick={(e) => { e.stopPropagation(); onDelete(component.id); }}
            title="Delete"
          >
            <Trash2 className="h-3 w-3 text-[#071006]" />
          </button>
          <div className="w-px h-3 bg-black/10 mx-0.5" />
          <span className="px-1.5 text-[9px] font-semibold text-[#071006] uppercase tracking-wider">
            {def?.label || component.type}
          </span>
        </motion.div>
      )}

      {/* Component Label when hovered but not selected */}
      {isHovered && !isSelected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="absolute -top-5 left-0 z-20 flex items-center gap-1 bg-[var(--app-panel)] border border-[var(--app-border)] rounded-[4px] px-1.5 py-0.5 shadow-sm"
        >
          <Move className="h-2.5 w-2.5 text-[var(--app-text-dim)]" />
          <span className="text-[8px] font-medium text-[var(--app-text-dim)] uppercase tracking-wider">
            {def?.label || component.type}
          </span>
        </motion.div>
      )}

      {/* Render the component preview */}
      <ComponentPreview component={component} />

      {/* Render children */}
      {component.children.length > 0 && (
        <AnimatePresence mode="popLayout">
          <motion.div
            key="children-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className={cn(def?.type === 'container' && 'px-4 py-2', def?.type === 'row' && 'flex gap-4')}
          >
            <AnimatePresence mode="popLayout">
              {component.children.map((child) => (
                <CanvasComponent
                  key={child.id}
                  component={child}
                  selection={selection}
                  onSelect={onSelect}
                  onMove={onMove}
                  onResize={onResize}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onHover={onHover}
                  onDrop={onDrop}
                  depth={depth + 1}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Drop zone indicator for droppable containers */}
      {isHovered && def?.droppable && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 border-2 border-dashed border-[var(--app-accent)]/40 rounded-[4px] pointer-events-none"
        />
      )}

      {/* Resize handles */}
      {isSelected && (
        <>
          {[
            { dir: 'nw', pos: '-top-1.5 -left-1.5', cursor: 'nwse-resize' },
            { dir: 'n', pos: '-top-1.5 left-1/2 -translate-x-1/2', cursor: 'ns-resize' },
            { dir: 'ne', pos: '-top-1.5 -right-1.5', cursor: 'nesw-resize' },
            { dir: 'e', pos: 'top-1/2 -right-1.5 -translate-y-1/2', cursor: 'ew-resize' },
            { dir: 'se', pos: '-bottom-1.5 -right-1.5', cursor: 'nwse-resize' },
            { dir: 's', pos: '-bottom-1.5 left-1/2 -translate-x-1/2', cursor: 'ns-resize' },
            { dir: 'sw', pos: '-bottom-1.5 -left-1.5', cursor: 'nesw-resize' },
            { dir: 'w', pos: 'top-1/2 -left-1.5 -translate-y-1/2', cursor: 'ew-resize' },
          ].map(({ dir, pos, cursor }) => (
            <div
              key={dir}
              className={`absolute ${pos} w-3 h-3 bg-white border-2 border-[var(--app-accent)] rounded-[2px] z-30 hover:scale-125 transition-transform`}
              style={{ cursor }}
              onMouseDown={(e) => handleResizeStart(e, dir)}
            />
          ))}
        </>
      )}
    </motion.div>
  );
}

function ComponentPreview({ component }: { component: ComponentInstance }) {
  const def = getComponentDefinition(component.type);
  const props = { ...def?.defaultProps, ...component.props };

  switch (component.type) {
    case 'heading': {
      const level = Math.min(6, Math.max(1, (props.level as number) || 2));
      const style = { color: props.color as string, textAlign: props.align as 'left' | 'center' | 'right' };
      const text = props.text as string;
      switch (level) {
        case 1: return <h1 style={style}>{text}</h1>;
        case 2: return <h2 style={style}>{text}</h2>;
        case 3: return <h3 style={style}>{text}</h3>;
        case 4: return <h4 style={style}>{text}</h4>;
        case 5: return <h5 style={style}>{text}</h5>;
        case 6: return <h6 style={style}>{text}</h6>;
        default: return <h2 style={style}>{text}</h2>;
      }
    }
    case 'text':
      return <p style={{ fontSize: props.fontSize as string, color: props.color as string, textAlign: props.align as 'left' | 'center' | 'right' }}>{props.text as string}</p>;
    case 'button':
      return (
        <button
          className={cn(
            'px-4 py-2 rounded-[6px] text-sm font-medium transition-colors',
            props.variant === 'primary' ? 'bg-[var(--app-accent)] text-white' : 'border border-[var(--app-border)] text-[var(--app-text)]'
          )}
          style={{ fontSize: props.size === 'sm' ? '12px' : props.size === 'lg' ? '16px' : '14px' }}
        >
          {props.text as string}
        </button>
      );
    case 'input':
      return (
        <div className="space-y-1">
          {props.label != null && <label className="text-[11px] font-medium text-[var(--app-text-muted)]">{String(props.label)}</label>}
          <input
            type={props.type as string}
            placeholder={props.placeholder as string}
            className="h-9 w-full rounded-[6px] border border-[var(--app-border)] bg-white px-3 text-[13px] outline-none focus:border-[var(--app-accent)]"
          />
        </div>
      );
    case 'card':
      return (
        <div
          className="bg-white border border-[var(--app-border)] rounded-[8px]"
          style={{ padding: props.padding as string, boxShadow: props.shadow === 'sm' ? '0 1px 3px rgba(0,0,0,0.1)' : undefined }}
        >
          <div className="text-[12px] text-[var(--app-text-muted)] italic">Card container — drop components here</div>
        </div>
      );
    case 'image':
      return (
        <img
          src={props.src as string}
          alt={props.alt as string}
          style={{ borderRadius: props.borderRadius as string, objectFit: props.objectFit as 'cover' | 'contain' }}
          className="w-full h-48 bg-gray-100"
        />
      );
    case 'navbar':
      return (
        <nav className="flex items-center justify-between h-14 px-6 border-b border-[var(--app-border)] bg-white">
          <span className="font-semibold text-sm">{props.brand as string}</span>
          <div className="flex gap-4">
            {(props.links as string)?.split(',').map((link: string, i: number) => (
              <span key={i} className="text-xs text-[var(--app-text-muted)] hover:text-[var(--app-text)] cursor-pointer">{link.trim()}</span>
            ))}
          </div>
        </nav>
      );
    case 'form':
      return (
        <form className="space-y-4 p-4 border border-[var(--app-border)] rounded-[8px] bg-gray-50" onClick={(e) => e.stopPropagation()}>
          <span className="text-[10px] text-[var(--app-text-dim)] uppercase tracking-wider font-medium">Form Container</span>
          {component.children.length === 0 && (
            <p className="text-[11px] text-[var(--app-text-muted)] italic">Drop form fields here</p>
          )}
        </form>
      );
    case 'container':
      return (
        <div
          style={{ maxWidth: props.maxWidth as string, padding: props.padding as string, background: props.background as string }}
          className="min-h-[40px] border border-dashed border-[var(--app-border)]/30 rounded-[4px]"
        >
          {component.children.length === 0 && (
            <span className="text-[10px] text-[var(--app-text-dim)] italic">Container — drop components here</span>
          )}
        </div>
      );
    case 'row':
      return (
        <div
          className="flex min-h-[32px] border border-dashed border-[var(--app-border)]/30 rounded-[4px] p-2"
          style={{ gap: props.gap as string, alignItems: props.alignItems as string, justifyContent: props.justifyContent as string }}
        >
          {component.children.length === 0 && (
            <span className="text-[10px] text-[var(--app-text-dim)] italic">Row — drop components here</span>
          )}
        </div>
      );
    case 'column':
      return (
        <div
          className="flex flex-col min-h-[32px] border border-dashed border-[var(--app-border)]/30 rounded-[4px] p-2"
          style={{ gap: props.gap as string }}
        >
          {component.children.length === 0 && (
            <span className="text-[10px] text-[var(--app-text-dim)] italic">Column</span>
          )}
        </div>
      );
    case 'divider':
      return <hr className="border-t border-[var(--app-border)]" style={{ margin: props.margin as string }} />;
    case 'badge':
      return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--app-accent-soft)] text-[var(--app-accent)]">{props.text as string}</span>;
    case 'table':
      return (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50">
              {(props.columns as string)?.split(',').map((col: string, i: number) => (
                <th key={i} className="border border-[var(--app-border)] px-3 py-2 text-left font-medium text-[var(--app-text-muted)]">{col.trim()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.max(1, props.rows as number) }).map((_, i) => (
              <tr key={i}>
                {(props.columns as string)?.split(',').map((_col: string, j: number) => (
                  <td key={j} className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text-dim)]">—</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case 'alert':
      return (
        <div className={cn(
          'px-4 py-3 rounded-[6px] text-xs flex items-center gap-2',
          props.variant === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
          props.variant === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          'bg-blue-50 text-blue-700 border border-blue-200'
        )}>
          <AlertTriangleIcon className="h-4 w-4 shrink-0" />
          <span>{props.text as string}</span>
        </div>
      );
    case 'progress':
      return (
        <div className="space-y-1">
          {props.label != null && <span className="text-[10px] text-[var(--app-text-muted)]">{String(props.label)}</span>}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--app-accent)] rounded-full transition-all"
              style={{ width: `${((props.value as number) / (props.max as number)) * 100}%` }}
            />
          </div>
        </div>
      );
    case 'list': {
      const items = (props.items as string)?.split(',') || [];
      const ListTag: 'ol' | 'ul' = (props.type as string) === 'ordered' ? 'ol' : 'ul';
      return (
        <ListTag className="text-xs text-[var(--app-text)] space-y-1 pl-4">
          {items.map((item: string, i: number) => (
            <li key={i}>{item.trim()}</li>
          ))}
        </ListTag>
      );
    }
    case 'link':
      return <a className="text-xs text-[var(--app-accent)] hover:underline cursor-pointer">{props.text as string}</a>;
    case 'textarea':
      return (
        <div className="space-y-1">
          {props.label != null && <label className="text-[11px] font-medium text-[var(--app-text-muted)]">{String(props.label)}</label>}
          <textarea
            rows={Math.min(3, Math.max(1, (props.rows as number) || 3))}
            placeholder={props.placeholder as string}
            className="w-full rounded-[6px] border border-[var(--app-border)] bg-white px-3 py-2 text-[12px] outline-none resize-none"
          />
        </div>
      );
    case 'select':
      return (
        <div className="space-y-1">
          {props.label != null && <label className="text-[11px] font-medium text-[var(--app-text-muted)]">{String(props.label)}</label>}
          <select className="h-9 w-full rounded-[6px] border border-[var(--app-border)] bg-white px-3 text-[12px] outline-none">
            {(props.options as string)?.split(',').map((opt: string, i: number) => (
              <option key={i}>{opt.trim()}</option>
            ))}
          </select>
        </div>
      );
    case 'checkbox':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" defaultChecked={!!props.checked} className="h-4 w-4 rounded border-[var(--app-border)] accent-[var(--app-accent)]" />
          <span className="text-[12px] text-[var(--app-text)]">{props.label as string}</span>
        </label>
      );
    case 'radio': {
      const radioOpts = (props.options as string)?.split(',') || [];
      return (
        <fieldset className="space-y-1.5">
          {props.label != null && <legend className="text-[11px] font-medium text-[var(--app-text-muted)] mb-1">{String(props.label)}</legend>}
          {radioOpts.map((opt: string, i: number) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name={String(props.label || 'radio')} className="h-4 w-4 accent-[var(--app-accent)]" />
              <span className="text-[12px] text-[var(--app-text)]">{opt.trim()}</span>
            </label>
          ))}
        </fieldset>
      );
    }
    case 'grid':
      return (
        <div
          className="grid min-h-[60px] border border-dashed border-[var(--app-border)]/30 rounded-[4px] p-2"
          style={{ gridTemplateColumns: `repeat(${props.columns || 3}, 1fr)`, gap: (props.gap as string) || '8px' }}
        >
          {component.children.length === 0 && (
            <span className="text-[10px] text-[var(--app-text-dim)] italic col-span-full">Grid — drop components here</span>
          )}
        </div>
      );
    case 'breadcrumbs': {
      const crumbItems = (props.items as string)?.split('/') || [];
      return (
        <nav className="flex items-center gap-1 text-[11px]">
          {crumbItems.map((item: string, i: number) => (
            <span key={i} className="flex items-center gap-1">
              {i === crumbItems.length - 1 ? (
                <span className="text-[var(--app-text-dim)]">{item.trim()}</span>
              ) : (
                <>
                  <span className="text-[var(--app-accent)] cursor-pointer hover:underline">{item.trim()}</span>
                  <span className="text-[var(--app-text-dim)]">/</span>
                </>
              )}
            </span>
          ))}
        </nav>
      );
    }
    case 'spinner':
      return (
        <div
          className="animate-spin rounded-full border-2 border-t-transparent"
          style={{
            width: `${props.size || 24}px`,
            height: `${props.size || 24}px`,
            borderColor: (props.color as string) || '#6366f1',
            borderTopColor: 'transparent',
          }}
        />
      );
    case 'video':
      return (
        <div
          className="w-full bg-gray-100 border border-[var(--app-border)] rounded-[4px] flex items-center justify-center"
          style={{ aspectRatio: (props.aspectRatio as string) || '16/9' }}
        >
          {props.src || props.embedUrl ? (
            <div className="flex flex-col items-center gap-1">
              <svg className="h-8 w-8 text-[var(--app-text-dim)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <span className="text-[10px] text-[var(--app-text-dim)]">Video</span>
            </div>
          ) : (
            <span className="text-[10px] text-[var(--app-text-dim)] italic">Video placeholder</span>
          )}
        </div>
      );
    case 'icon':
      return (
        <div
          className="flex items-center justify-center rounded-[4px]"
          style={{
            width: `${props.size || 24}px`,
            height: `${props.size || 24}px`,
            color: (props.color as string) || '#ef4444',
          }}
        >
          <svg className="h-full w-full" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </div>
      );
    default:
      return (
        <div className="px-3 py-2 bg-gray-50 border border-dashed border-gray-200 rounded-[4px] text-[10px] text-[var(--app-text-dim)]">
          {component.type}
        </div>
      );
  }
}

function AlertTriangleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function countComponents(components: ComponentInstance[]): number {
  let count = 0;
  for (const c of components) {
    count += 1;
    count += countComponents(c.children);
  }
  return count;
}
