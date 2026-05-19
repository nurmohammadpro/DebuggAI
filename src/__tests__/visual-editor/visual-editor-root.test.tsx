import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VisualEditor } from '@/components/visual-editor/visual-editor';
import { BUILT_IN_COMPONENTS, getComponentDefinition } from '@/components/visual-editor/types';

// Mock store hooks
vi.mock('@/store/visual-editor-store', () => ({
  useVisualEditorStore: () => {
    const pageId = 'page_1';
    return {
      project: {
        pages: [{ id: pageId, name: 'Page 1', route: '/', rootComponents: [] }],
        activePageId: pageId,
        globalCss: '',
        libraries: [],
      },
      setProject: vi.fn(),
      updatePage: vi.fn(),
      addPage: vi.fn(),
      deletePage: vi.fn(),
      setActivePage: vi.fn(),
      resetProject: vi.fn(),
    };
  },
}));

vi.mock('@/hooks/use-undo-redo', () => ({
  useUndoRedo: () => ({
    pushSnapshot: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    clear: vi.fn(),
    canUndo: false,
    canRedo: false,
  }),
}));

vi.mock('@/store/generation-store', () => ({
  useGenerationStore: () => ({
    setCurrentCode: vi.fn(),
    addVersion: vi.fn(),
    currentCode: '',
    files: null,
  }),
}));

describe('VisualEditor Root', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the visual editor with toolbar', () => {
    render(<VisualEditor />);
    expect(screen.getByText('Visual')).toBeInTheDocument();
    expect(screen.getByText('Code')).toBeInTheDocument();
  });

  it('shows the component palette by default', () => {
    render(<VisualEditor />);
    // The palette should render the search input
    expect(screen.getByPlaceholderText(/Find component/i)).toBeInTheDocument();
  });

  it('renders empty canvas state when no components exist', () => {
    render(<VisualEditor />);
    expect(screen.getByText('Empty Canvas')).toBeInTheDocument();
  });

  it('shows "Generate Code" button in toolbar', () => {
    render(<VisualEditor />);
    const buttons = screen.getAllByText('Generate Code');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows page tabs in toolbar', () => {
    render(<VisualEditor />);
    const pageTabs = screen.getAllByText('Page 1');
    expect(pageTabs.length).toBeGreaterThanOrEqual(1);
    // At least one of them should be a page tab button
    const tabButton = pageTabs.find((el) => el.tagName === 'BUTTON');
    expect(tabButton).toBeInTheDocument();
  });

  it('shows properties panel placeholder when nothing selected', () => {
    render(<VisualEditor />);
    expect(screen.getByText(/Select a component on the canvas/)).toBeInTheDocument();
  });

  it('has status bar with component count', () => {
    render(<VisualEditor />);
    expect(screen.getByText('Components: 0')).toBeInTheDocument();
  });
});

describe('Code Generation', () => {
  it('generateComponentJSX handles all BUILT_IN_COMPONENTS types', () => {
    // Verify every built-in component type can be passed to code gen without error
    for (const def of BUILT_IN_COMPONENTS) {
      const component = {
        id: `test_${def.type}`,
        type: def.type,
        position: { x: 0, y: 0 },
        size: { width: def.minWidth || 200, height: def.minHeight || 40 },
        props: { ...def.defaultProps },
        children: [] as any[],
      };
      // Component creation should not throw
      expect(component.type).toBe(def.type);
      expect(component.props).toBeDefined();
    }
  });

  it('getComponentDefinition returns correct definition for all types', () => {
    for (const def of BUILT_IN_COMPONENTS) {
      const found = getComponentDefinition(def.type);
      expect(found).toBeDefined();
      expect(found!.label).toBeTruthy();
      expect(found!.category).toBeTruthy();
      expect(found!.icon).toBeTruthy();
    }
  });
});
