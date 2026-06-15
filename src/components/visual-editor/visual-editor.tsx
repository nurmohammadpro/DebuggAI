'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ComponentPalette } from './component-palette';
import { VisualEditorCanvas } from './visual-editor-canvas';
import { PropertyPanel } from './property-panel';
import { useGenerationStore } from '@/store/generation-store';
import { useVisualEditorStore } from '@/store/visual-editor-store';
import { useUndoRedo } from '@/hooks/use-undo-redo';
import {
  getComponentDefinition,
  type ComponentInstance,
  type EditorPage,
  type EditorProject,
  type DragState,
  type SelectionState,
} from './types';
import { Code2, Eye, LayoutPanelTop, ArrowLeftToLine, ArrowRightToLine, Plus, X } from 'lucide-react';

let instanceCounter = 0;
function generateId(): string {
  instanceCounter += 1;
  return `comp_${Date.now()}_${instanceCounter}`;
}

function createInstance(type: string, x = 0, y = 0): ComponentInstance {
  const def = getComponentDefinition(type);
  return {
    id: generateId(),
    type,
    position: { x, y },
    size: {
      width: def?.minWidth || 200,
      height: def?.minHeight || 40,
    },
    props: { ...(def?.defaultProps || {}) },
    children: [],
  };
}

interface VisualEditorProps {
  className?: string;
  onGenerateCode?: (code: string) => void;
}

export function VisualEditor({ className, onGenerateCode }: VisualEditorProps) {
  const { setCurrentCode, addVersion } = useGenerationStore();

  const { project, setProject, updatePage, addPage, deletePage, setActivePage } =
    useVisualEditorStore();

  const { pushSnapshot, undo, redo, canUndo, canRedo } = useUndoRedo(50, 300);

  // Push initial snapshot
  const initializedRef = useState(false);
  useEffect(() => {
    pushSnapshot(project);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragType: null,
    dropPosition: null,
    dropTargetId: null,
  });

  const [selection, setSelection] = useState<SelectionState>({
    selectedIds: [],
    hoveredId: null,
    isResizing: false,
    resizeHandle: null,
  });

  const [showPalette, setShowPalette] = useState(true);
  const [showProperties, setShowProperties] = useState(true);

  const findComponent = useCallback(
    (components: ComponentInstance[], id: string): ComponentInstance | null => {
      for (const c of components) {
        if (c.id === id) return c;
        const found = findComponent(c.children, id);
        if (found) return found;
      }
      return null;
    },
    []
  );

  const updateComponent = useCallback(
    (components: ComponentInstance[], id: string, updater: (comp: ComponentInstance) => ComponentInstance): ComponentInstance[] => {
      return components.map((c) => {
        if (c.id === id) return updater(c);
        const children = updateComponent(c.children, id, updater);
        if (children !== c.children) return { ...c, children };
        return c;
      });
    },
    []
  );

  const activePage = useMemo(
    () => project.pages.find((p) => p.id === project.activePageId),
    [project.pages, project.activePageId]
  );

  const selectedComponent = useMemo(() => {
    if (selection.selectedIds.length !== 1 || !activePage) return null;
    const id = selection.selectedIds[0]!;
    return findComponent(activePage.rootComponents, id);
  }, [selection.selectedIds, activePage, findComponent]);

  const updatePageWithSnapshot = useCallback(
    (updater: (page: EditorPage) => EditorPage) => {
      updatePage(project.activePageId, updater);
      // Push snapshot after a microtask so the store has updated
      setTimeout(() => {
        const { project: latest } = useVisualEditorStore.getState();
        pushSnapshot(latest);
      }, 0);
    },
    [project.activePageId, updatePage, pushSnapshot]
  );

  const handleSelect = useCallback((id: string) => {
    setSelection((prev) => ({ ...prev, selectedIds: id ? [id] : [] }));
  }, []);

  const handleHover = useCallback((id: string | null) => {
    setSelection((prev) => ({ ...prev, hoveredId: id }));
  }, []);

  const handleDrop = useCallback(
    (type: string, x: number, y: number, parentId?: string) => {
      const newComp = createInstance(type, x, y);

      updatePageWithSnapshot((page) => {
        if (parentId) {
          return {
            ...page,
            rootComponents: updateComponent(page.rootComponents, parentId, (parent) => ({
              ...parent,
              children: [...parent.children, { ...newComp, position: { x: 0, y: 0 } }],
            })),
          };
        }
        return {
          ...page,
          rootComponents: [...page.rootComponents, newComp],
        };
      });
    },
    [updatePageWithSnapshot]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const removeComponent = (components: ComponentInstance[]): ComponentInstance[] => {
        return components
          .filter((c) => c.id !== id)
          .map((c) => ({
            ...c,
            children: removeComponent(c.children),
          }));
      };

      updatePageWithSnapshot((page) => ({
        ...page,
        rootComponents: removeComponent(page.rootComponents),
      }));
      setSelection((prev) => ({ ...prev, selectedIds: prev.selectedIds.filter((s) => s !== id) }));
    },
    [updatePageWithSnapshot]
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      const duplicateComponent = (
        components: ComponentInstance[]
      ): { components: ComponentInstance[]; duplicated: boolean } => {
        let duplicated = false;
        const result = components.flatMap((c) => {
          if (c.id === id && !duplicated) {
            duplicated = true;
            const dup = JSON.parse(JSON.stringify(c)) as ComponentInstance;
            dup.id = generateId();
            dup.position = { x: c.position.x + 20, y: c.position.y + 20 };
            return [c, dup];
          }
          const { components: childResult, duplicated: childDup } = duplicateComponent(c.children);
          if (childDup) {
            duplicated = true;
            return [{ ...c, children: childResult }];
          }
          return [c];
        });
        return { components: result, duplicated };
      };

      updatePageWithSnapshot((page) => {
        const { components } = duplicateComponent(page.rootComponents);
        return { ...page, rootComponents: components };
      });
    },
    [updatePageWithSnapshot]
  );

  const handleUpdateProps = useCallback(
    (id: string, props: Record<string, unknown>) => {
      updatePageWithSnapshot((page) => ({
        ...page,
        rootComponents: updateComponent(page.rootComponents, id, (comp) => ({
          ...comp,
          props,
        })),
      }));
    },
    [updatePageWithSnapshot]
  );

  const handleUpdateSize = useCallback(
    (id: string, width: number, height: number) => {
      updatePageWithSnapshot((page) => ({
        ...page,
        rootComponents: updateComponent(page.rootComponents, id, (comp) => ({
          ...comp,
          size: { width, height },
        })),
      }));
    },
    [updatePageWithSnapshot]
  );

  const handleReset = useCallback(
    (id: string) => {
      const def = getComponentDefinition(
        findComponent(activePage?.rootComponents || [], id)?.type || ''
      );
      if (!def) return;
      updatePageWithSnapshot((page) => ({
        ...page,
        rootComponents: updateComponent(page.rootComponents, id, (comp) => ({
          ...comp,
          props: { ...def.defaultProps },
        })),
      }));
    },
    [updatePageWithSnapshot, activePage?.rootComponents]
  );

  const handleMove = useCallback(
    (id: string, x: number, y: number) => {
      updatePageWithSnapshot((page) => ({
        ...page,
        rootComponents: updateComponent(page.rootComponents, id, (comp) => ({
          ...comp,
          position: { x, y },
        })),
      }));
    },
    [updatePageWithSnapshot]
  );

  const handleResize = useCallback(
    (id: string, width: number, height: number) => {
      updatePageWithSnapshot((page) => ({
        ...page,
        rootComponents: updateComponent(page.rootComponents, id, (comp) => ({
          ...comp,
          size: { width, height },
        })),
      }));
    },
    [updatePageWithSnapshot]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setSelection((prev) => ({ ...prev, selectedIds: [] }));
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        selection.selectedIds.forEach((id) => handleDelete(id));
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        selection.selectedIds.forEach((id) => handleDuplicate(id));
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        const next = redo();
        if (next) setProject(next);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        const prev = undo();
        if (prev) setProject(prev);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selection.selectedIds, handleDelete, handleDuplicate, undo, redo, setProject]);

  const generateCode = useCallback(() => {
    if (!activePage) return;
    const code = generateComponentCode(activePage.rootComponents, activePage);
    setCurrentCode(code);
    addVersion(code, 'Visual Editor Export');
    useGenerationStore.getState().bumpPreviewNonce();
    onGenerateCode?.(code);
  }, [activePage, setCurrentCode, addVersion, onGenerateCode]);

  return (
    <div className={cn('flex h-full bg-[var(--app-bg)]', className)}>
      {/* Component Palette - Left */}
      {showPalette && (
        <>
          <div className="w-[220px] border-r border-[var(--app-border)] shrink-0 animate-in fade-in slide-in-from-left-1 duration-200 fill-mode-both">
            <ComponentPalette
              onDragStart={(type) => setDragState({ ...dragState, isDragging: true, dragType: type })}
              onDragEnd={() => setDragState({ ...dragState, isDragging: false, dragType: null })}
            />
          </div>
          <div className="w-[3px] bg-[var(--app-border)] shrink-0 cursor-col-resize hover:bg-[var(--app-accent)] transition-colors" />
        </>
      )}

      {/* Toggle palette button when hidden */}
      {!showPalette && (
        <button
          className="w-7 border-r border-[var(--app-border)] flex items-center justify-center hover:bg-[var(--app-surface)] transition-all duration-150 shrink-0 animate-in fade-in duration-150"
          onClick={() => setShowPalette(true)}
          title="Show component palette"
        >
          <ArrowRightToLine className="h-3.5 w-3.5 text-[var(--app-text-dim)]" />
        </button>
      )}

      {/* Canvas - Center */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Toolbar */}
        <div className="h-10 border-b border-[var(--app-border)] bg-[var(--app-panel)] flex items-center justify-between px-3 shrink-0 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center bg-[var(--app-surface)] rounded-[6px] p-0.5 border border-[var(--app-border)] shrink-0">
              <button className="h-7 px-3 rounded-[4px] text-[10px] font-medium bg-[var(--app-accent)] text-[#071006] flex items-center gap-1.5">
                <LayoutPanelTop className="h-3 w-3" />
                Visual
              </button>
              <button
                className="h-7 px-3 rounded-[4px] text-[10px] font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)] flex items-center gap-1.5"
                onClick={generateCode}
              >
                <Code2 className="h-3 w-3" />
                Code
              </button>
            </div>

            {/* Page Tabs */}
            <div className="flex items-center gap-1 min-w-0 overflow-x-auto">
              {project.pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => setActivePage(page.id)}
                  className={cn(
                    'h-7 px-2.5 rounded-[4px] text-[10px] font-medium whitespace-nowrap transition-colors shrink-0',
                    page.id === project.activePageId
                      ? 'bg-[var(--app-accent)] text-[#071006]'
                      : 'text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]'
                  )}
                >
                  {page.name}
                </button>
              ))}
              <button
                onClick={() => {
                  const id = generateId();
                  const newPage = { id, name: `Page ${project.pages.length + 1}`, route: `/${String(project.pages.length + 1).toLowerCase()}`, rootComponents: [] as ComponentInstance[] };
                  addPage(newPage);
                  setActivePage(id);
                  pushSnapshot({ ...project, pages: [...project.pages, newPage], activePageId: id });
                }}
                className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors shrink-0"
                title="Add page"
              >
                <Plus className="h-3 w-3" />
              </button>
              {project.pages.length > 1 && (
                <button
                  onClick={() => {
                    if (project.pages.length <= 1) return;
                    deletePage(project.activePageId);
                    const remaining = project.pages.filter((p) => p.id !== project.activePageId);
                    pushSnapshot({ ...project, pages: remaining, activePageId: remaining[0]?.id || '' });
                  }}
                  className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
                  title="Delete page"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!showPalette && (
              <button
                className="h-7 px-2 rounded-[4px] text-[9px] font-medium text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
                onClick={() => setShowPalette(true)}
              >
                Palette
              </button>
            )}
            <button
              className="h-7 px-3 rounded-[4px] text-[10px] font-medium bg-[var(--app-accent)] text-[#071006] hover:opacity-90 transition-opacity flex items-center gap-1.5"
              onClick={generateCode}
            >
              <Code2 className="h-3 w-3" />
              Generate Code
            </button>
          </div>
        </div>

        <VisualEditorCanvas
          page={activePage || project.pages[0] || { id: '', name: '', route: '/', rootComponents: [] }}
          selection={selection}
          dragState={dragState}
          onSelect={handleSelect}
          onMove={handleMove}
          onResize={handleResize}
          onDrop={handleDrop}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onUpdateProps={handleUpdateProps}
          onHover={handleHover}
        />
      </div>

      {/* Property Panel - Right */}
      {showProperties && (
        <>
          <div className="w-[3px] bg-[var(--app-border)] shrink-0 cursor-col-resize hover:bg-[var(--app-accent)] transition-colors" />
          <div className="w-[260px] border-l border-[var(--app-border)] shrink-0 animate-in fade-in slide-in-from-right-1 duration-200 fill-mode-both">
            <PropertyPanel
              component={selectedComponent}
              onUpdateProps={handleUpdateProps}
              onUpdateSize={handleUpdateSize}
              onMove={handleMove}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onReset={handleReset}
            />
          </div>
        </>
      )}

      {!showProperties && (
        <button
          className="w-7 border-l border-[var(--app-border)] flex items-center justify-center hover:bg-[var(--app-surface)] transition-all duration-150 shrink-0 animate-in fade-in duration-150"
          onClick={() => setShowProperties(true)}
          title="Show properties panel"
        >
          <ArrowLeftToLine className="h-3.5 w-3.5 text-[var(--app-text-dim)]" />
        </button>
      )}
    </div>
  );
}

/**
 * Generate JSX/React code from the component tree
 */
function generateComponentCode(
  components: ComponentInstance[],
  page: EditorPage,
  indentLevel = 0
): string {
  const indent = '  '.repeat(indentLevel);

  const code = [
    '// Generated by DeBuggAI Visual Editor',
    `// Page: ${page.name} (${page.route})`,
    '',
    "'use client';",
    '',
    'export default function GeneratedPage() {',
    '  return (',
    '    <div className="min-h-screen">',
    ...components.flatMap((c) => generateComponentJSX(c, 3)),
    '    </div>',
    '  );',
    '}',
    '',
  ].join('\n');

  return code;
}

function generateComponentJSX(component: ComponentInstance, indentLevel: number): string[] {
  const indent = '  '.repeat(indentLevel);
  const def = getComponentDefinition(component.type);
  const props = { ...def?.defaultProps, ...component.props };
  const lines: string[] = [];

  switch (component.type) {
    case 'container':
      lines.push(`${indent}<div className="container mx-auto" style={{ maxWidth: '${props.maxWidth}', padding: '${props.padding}' }}>`);
      component.children.forEach((child) => lines.push(...generateComponentJSX(child, indentLevel + 1)));
      lines.push(`${indent}</div>`);
      break;
    case 'row':
      lines.push(`${indent}<div className="flex" style={{ gap: '${props.gap}', alignItems: '${props.alignItems}', justifyContent: '${props.justifyContent}' }}>`);
      component.children.forEach((child) => lines.push(...generateComponentJSX(child, indentLevel + 1)));
      lines.push(`${indent}</div>`);
      break;
    case 'column':
      lines.push(`${indent}<div className="flex flex-col" style={{ gap: '${props.gap}' }}>`);
      component.children.forEach((child) => lines.push(...generateComponentJSX(child, indentLevel + 1)));
      lines.push(`${indent}</div>`);
      break;
    case 'section':
      lines.push(`${indent}<section className="w-full" style={{ padding: '${props.padding}', background: '${props.background}' }}>`);
      component.children.forEach((child) => lines.push(...generateComponentJSX(child, indentLevel + 1)));
      lines.push(`${indent}</section>`);
      break;
    case 'card':
      lines.push(`${indent}<div className="rounded-lg border bg-white" style={{ padding: '${props.padding}', boxShadow: '${props.shadow === 'sm' ? '0 1px 2px rgba(0,0,0,0.05)' : props.shadow === 'md' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'}' }}>`);
      component.children.forEach((child) => lines.push(...generateComponentJSX(child, indentLevel + 1)));
      lines.push(`${indent}</div>`);
      break;
    case 'heading': {
      const Tag = `h${props.level || 2}`;
      lines.push(`${indent}<${Tag} style={{ color: '${props.color}', textAlign: '${props.align}' }}>${escapeJSX(String(props.text))}</${Tag}>`);
      break;
    }
    case 'text':
      lines.push(`${indent}<p style={{ fontSize: '${props.fontSize}', color: '${props.color}', textAlign: '${props.align}' }}>${escapeJSX(String(props.text))}</p>`);
      break;
    case 'badge':
      lines.push(`${indent}<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${escapeJSX(String(props.text))}</span>`);
      break;
    case 'button':
      lines.push(`${indent}<button className="${props.variant === 'primary' ? 'bg-black text-white' : 'border border-gray-300'} px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity">${escapeJSX(String(props.text))}</button>`);
      break;
    case 'input':
      lines.push(`${indent}<div>`);
      if (props.label) lines.push(`${indent}  <label className="block text-sm font-medium text-gray-700 mb-1">${escapeJSX(String(props.label))}</label>`);
      lines.push(`${indent}  <input type="${props.type || 'text'}" placeholder="${escapeJSX(String(props.placeholder))}" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />`);
      lines.push(`${indent}</div>`);
      break;
    case 'form':
      lines.push(`${indent}<form className="space-y-4" onSubmit={(e) => { e.preventDefault(); }}>`);
      component.children.forEach((child) => lines.push(...generateComponentJSX(child, indentLevel + 1)));
      lines.push(`${indent}</form>`);
      break;
    case 'navbar':
      lines.push(`${indent}<nav className="flex items-center justify-between h-14 px-6 border-b bg-white">`);
      lines.push(`${indent}  <span className="font-semibold">${escapeJSX(String(props.brand))}</span>`);
      lines.push(`${indent}  <div className="flex gap-4">`);
      (String(props.links || '')).split(',').filter(Boolean).forEach((link: string) => {
        lines.push(`${indent}    <a href="#" className="text-sm text-gray-600 hover:text-gray-900">${link.trim()}</a>`);
      });
      lines.push(`${indent}  </div>`);
      lines.push(`${indent}</nav>`);
      break;
    case 'image':
      lines.push(`${indent}<img src="${escapeJSX(String(props.src))}" alt="${escapeJSX(String(props.alt))}" className="w-full h-auto" style={{ borderRadius: '${props.borderRadius}', objectFit: '${props.objectFit}' }} />`);
      break;
    case 'divider':
      lines.push(`${indent}<hr className="border-t border-gray-200" style={{ margin: '${props.margin}' }} />`);
      break;
    case 'table':
      lines.push(`${indent}<table className="min-w-full divide-y divide-gray-200">`);
      lines.push(`${indent}  <thead className="bg-gray-50">`);
      lines.push(`${indent}    <tr>`);
      (String(props.columns || '')).split(',').filter(Boolean).forEach((col: string) => {
        lines.push(`${indent}      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">${col.trim()}</th>`);
      });
      lines.push(`${indent}    </tr>`);
      lines.push(`${indent}  </thead>`);
      lines.push(`${indent}  <tbody className="bg-white divide-y divide-gray-200">`);
      for (let i = 0; i < Math.max(1, Number(props.rows || 0)); i++) {
        lines.push(`${indent}    <tr>`);
        (String(props.columns || '')).split(',').filter(Boolean).forEach(() => {
          lines.push(`${indent}      <td className="px-3 py-2 text-sm text-gray-500">—</td>`);
        });
        lines.push(`${indent}    </tr>`);
      }
      lines.push(`${indent}  </tbody>`);
      lines.push(`${indent}</table>`);
      break;
    case 'list': {
      const items = String(props.items || '').split(',').filter(Boolean);
      const ListTag = props.listType === 'ordered' ? 'ol' : 'ul';
      lines.push(`${indent}<${ListTag} className="list-disc pl-5 space-y-1">`);
      items.forEach((item: string) => {
        lines.push(`${indent}  <li className="text-sm">${item.trim()}</li>`);
      });
      lines.push(`${indent}</${ListTag}>`);
      break;
    }
    case 'alert': {
      const variantClasses: Record<string, string> = {
        error: 'bg-red-50 border-red-200 text-red-700',
        success: 'bg-green-50 border-green-200 text-green-700',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
        info: 'bg-blue-50 border-blue-200 text-blue-700',
      };
      lines.push(`${indent}<div className="${variantClasses[String(props.variant || 'info')] || variantClasses.info} px-4 py-3 rounded-md border text-sm">${escapeJSX(String(props.text))}</div>`);
      break;
    }
    case 'link':
      lines.push(`${indent}<a href="${escapeJSX(String(props.href || '#'))}" className="text-blue-600 hover:underline text-sm" target="${props.target || '_self'}">${escapeJSX(String(props.text))}</a>`);
      break;
    case 'textarea':
      lines.push(`${indent}<div>`);
      if (props.label) lines.push(`${indent}  <label className="block text-sm font-medium text-gray-700 mb-1">${escapeJSX(String(props.label))}</label>`);
      lines.push(`${indent}  <textarea rows="${props.rows || 4}" placeholder="${escapeJSX(String(props.placeholder))}" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />`);
      lines.push(`${indent}</div>`);
      break;
    case 'select':
      lines.push(`${indent}<div>`);
      if (props.label) lines.push(`${indent}  <label className="block text-sm font-medium text-gray-700 mb-1">${escapeJSX(String(props.label))}</label>`);
      lines.push(`${indent}  <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">`);
      (String(props.options || '')).split(',').filter(Boolean).forEach((opt: string) => {
        lines.push(`${indent}    <option value="${opt.trim().toLowerCase().replace(/\s+/g, '-')}">${opt.trim()}</option>`);
      });
      lines.push(`${indent}  </select>`);
      lines.push(`${indent}</div>`);
      break;
    case 'checkbox':
      lines.push(`${indent}<label className="flex items-center gap-2 text-sm">`);
      lines.push(`${indent}  <input type="checkbox" className="rounded border-gray-300" ${props.checked ? 'defaultChecked' : ''} />`);
      lines.push(`${indent}  ${escapeJSX(String(props.label))}`);
      lines.push(`${indent}</label>`);
      break;
    case 'radio': {
      const opts = String(props.options || '').split(',').filter(Boolean);
      lines.push(`${indent}<fieldset>`);
      if (props.label) lines.push(`${indent}  <legend className="block text-sm font-medium text-gray-700 mb-1">${escapeJSX(String(props.label))}</legend>`);
      opts.forEach((opt: string) => {
        lines.push(`${indent}  <label className="flex items-center gap-2 text-sm">`);
        lines.push(`${indent}    <input type="radio" name="${escapeJSX(String(props.label || 'radio'))}" className="border-gray-300" />`);
        lines.push(`${indent}    ${opt.trim()}`);
        lines.push(`${indent}  </label>`);
      });
      lines.push(`${indent}</fieldset>`);
      break;
    }
    case 'grid':
      lines.push(`${indent}<div className="grid" style={{ gridTemplateColumns: \`repeat(${props.columns || 3}, 1fr)\`, gap: '${props.gap || '16px'}' }}>`);
      component.children.forEach((child) => lines.push(...generateComponentJSX(child, indentLevel + 1)));
      lines.push(`${indent}</div>`);
      break;
    case 'breadcrumbs':
      lines.push(`${indent}<nav aria-label="breadcrumb"><ol className="flex items-center gap-2 text-sm">`);
      (String(props.items || '')).split(/\s*\/\s*/).filter(Boolean).forEach((item: string, index: number, arr: string[]) => {
        if (index === arr.length - 1) {
          lines.push(`${indent}  <li className="text-gray-500">${item.trim()}</li>`);
        } else {
          lines.push(`${indent}  <li><a href="#" className="text-blue-600 hover:underline">${item.trim()}</a><span className="mx-2 text-gray-400">/</span></li>`);
        }
      });
      lines.push(`${indent}</ol></nav>`);
      break;
    case 'progress':
      lines.push(`${indent}<div className="w-full">`);
      if (props.label) lines.push(`${indent}  <span className="text-sm text-gray-600">${escapeJSX(String(props.label))}</span>`);
      lines.push(`${indent}  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">`);
      lines.push(`${indent}    <div className="h-full bg-blue-600 rounded-full" style={{ width: '${Math.round(((Number(props.value) || 0) / (Number(props.max) || 100)) * 100)}%' }} />`);
      lines.push(`${indent}  </div>`);
      lines.push(`${indent}</div>`);
      break;
    case 'spinner':
      lines.push(`${indent}<div className="inline-block animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" style={{ width: '${props.size || 24}px', height: '${props.size || 24}px', borderColor: '${props.color || '#6366f1'}', borderTopColor: 'transparent' }} />`);
      break;
    case 'video':
      if (props.embedUrl) {
        lines.push(`${indent}<iframe src="${escapeJSX(String(props.embedUrl))}" className="w-full" style={{ aspectRatio: '${props.aspectRatio || '16/9'}' }} allowFullScreen />`);
      } else {
        lines.push(`${indent}<video src="${escapeJSX(String(props.src))}" controls className="w-full" style={{ aspectRatio: '${props.aspectRatio || '16/9'}' }} />`);
      }
      break;
    case 'icon':
      lines.push(`${indent}<i className="inline-block" style={{ width: '${props.size || 24}px', height: '${props.size || 24}px', background: '${props.color || '#000'}' }} />`);
      break;
    default:
      lines.push(`${indent}<div className="text-xs text-gray-400 italic">${component.type}</div>`);
      if (component.children.length > 0) {
        component.children.forEach((child) => lines.push(...generateComponentJSX(child, indentLevel + 1)));
      }
  }

  return lines;
}

function escapeJSX(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
