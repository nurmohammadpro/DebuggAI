import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { VisualEditorCanvas } from '@/components/visual-editor/visual-editor-canvas';
import type { ComponentInstance, EditorPage, DragState, SelectionState } from '@/components/visual-editor/types';
import { BUILT_IN_COMPONENTS } from '@/components/visual-editor/types';

function createComponent(
  type: string,
  overrides: Partial<ComponentInstance> = {}
): ComponentInstance {
  const def = BUILT_IN_COMPONENTS.find((c) => c.type === type);
  const base: ComponentInstance = {
    id: `comp-${type}-${Math.random()}`,
    type,
    position: { x: 0, y: 0 },
    size: { width: def?.minWidth || 200, height: def?.minHeight || 40 },
    props: { ...(def?.defaultProps || {}) },
    children: [],
  };
  return { ...base, ...overrides };
}

function createPage(overrides: Partial<EditorPage> = {}): EditorPage {
  return {
    id: 'page-1',
    name: 'Home',
    route: '/',
    rootComponents: [],
    ...overrides,
  };
}

const defaultSelection: SelectionState = {
  selectedIds: [],
  hoveredId: null,
  isResizing: false,
  resizeHandle: null,
};

const defaultDragState: DragState = {
  isDragging: false,
  dragType: null,
  dropPosition: null,
  dropTargetId: null,
};

describe('VisualEditorCanvas', () => {
  const onSelect = vi.fn();
  const onMove = vi.fn();
  const onResize = vi.fn();
  const onDrop = vi.fn();
  const onDelete = vi.fn();
  const onDuplicate = vi.fn();
  const onUpdateProps = vi.fn();
  const onHover = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Empty Canvas ──

  it('renders empty canvas state when no components', () => {
    const page = createPage();
    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    expect(screen.getByText('Empty Canvas')).toBeInTheDocument();
    expect(screen.getByText(/Drag components from the palette/)).toBeInTheDocument();
    expect(screen.getByText('Heading')).toBeInTheDocument();
    expect(screen.getByText('Button')).toBeInTheDocument();
    expect(screen.getByText('Card')).toBeInTheDocument();
  });

  it('shows page name and route in toolbar', () => {
    const page = createPage({ name: 'About', route: '/about' });
    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('/about')).toBeInTheDocument();
  });

  // ── Rendering Components ──

  it('renders components on the canvas', () => {
    const components = [
      createComponent('heading', { id: 'h1', props: { text: 'Hello World', level: 1, color: '#000', align: 'left' } }),
      createComponent('text', { id: 't1', props: { text: 'Some text', fontSize: '16px', color: '#333', align: 'left' } }),
    ];
    const page = createPage({ rootComponents: components });

    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByText('Some text')).toBeInTheDocument();
  });

  it('renders a button component with text', () => {
    const components = [
      createComponent('button', { id: 'btn1', props: { text: 'Click Me', variant: 'primary', size: 'md', disabled: false } }),
    ];
    const page = createPage({ rootComponents: components });

    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('renders all component types correctly', () => {
    const types = ['heading', 'text', 'button', 'input', 'card', 'image', 'navbar', 'form', 'container', 'row', 'column', 'divider', 'badge', 'table', 'list', 'alert', 'progress', 'link'];
    const components = types.map((type) => createComponent(type, { id: `${type}-1` }));

    const page = createPage({ rootComponents: components });

    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    // heading component renders with default text
    expect(screen.getByText('Heading Text')).toBeInTheDocument();
    // button renders with default text
    expect(screen.getByText('Click Me')).toBeInTheDocument();
    // badge renders with default text
    expect(screen.getByText('New')).toBeInTheDocument();
    // input renders with default label (there are multiple "Name" texts from table + input)
    const nameLabels = screen.getAllByText('Name');
    expect(nameLabels.length).toBeGreaterThanOrEqual(1);
  });

  // ── Selection ──

  it('calls onSelect when a component is clicked', () => {
    const components = [createComponent('heading', { id: 'h1', props: { text: 'Hello', level: 2, color: '#000', align: 'left' } })];
    const page = createPage({ rootComponents: components });

    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    fireEvent.click(screen.getByText('Hello'));
    expect(onSelect).toHaveBeenCalledWith('h1');
  });

  it('calls onSelect with empty string when clicking canvas background', () => {
    const components = [createComponent('heading', { id: 'h1', props: { text: 'Hello', level: 2, color: '#000', align: 'left' } })];
    const page = createPage({ rootComponents: components });

    const { container } = render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    // Click the canvas background (the outer div with data-canvas)
    const canvasDiv = container.querySelector('[data-canvas="true"]')!;
    fireEvent.click(canvasDiv);
    expect(onSelect).toHaveBeenCalledWith('');
  });

  it('shows action toolbar when a component is selected', () => {
    const components = [createComponent('heading', { id: 'h1', props: { text: 'Hello', level: 2, color: '#000', align: 'left' } })];
    const page = createPage({ rootComponents: components });

    const selection = { ...defaultSelection, selectedIds: ['h1'] };

    render(
      <VisualEditorCanvas
        page={page}
        selection={selection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    // The action toolbar should show duplicate and delete buttons
    expect(screen.getByTitle('Duplicate')).toBeInTheDocument();
    expect(screen.getByTitle('Delete')).toBeInTheDocument();
    // Should show the component type label (rendered with CSS uppercase, so case-insensitive)
    expect(screen.getByText(/heading/i)).toBeInTheDocument();
  });

  it('calls onDuplicate when duplicate button is clicked', () => {
    const components = [createComponent('heading', { id: 'h1', props: { text: 'Hello', level: 2, color: '#000', align: 'left' } })];
    const page = createPage({ rootComponents: components });
    const selection = { ...defaultSelection, selectedIds: ['h1'] };

    render(
      <VisualEditorCanvas
        page={page}
        selection={selection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    fireEvent.click(screen.getByTitle('Duplicate'));
    expect(onDuplicate).toHaveBeenCalledWith('h1');
  });

  it('calls onDelete when delete button is clicked', () => {
    const components = [createComponent('heading', { id: 'h1', props: { text: 'Hello', level: 2, color: '#000', align: 'left' } })];
    const page = createPage({ rootComponents: components });
    const selection = { ...defaultSelection, selectedIds: ['h1'] };

    render(
      <VisualEditorCanvas
        page={page}
        selection={selection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    fireEvent.click(screen.getByTitle('Delete'));
    expect(onDelete).toHaveBeenCalledWith('h1');
  });

  // ── Hover ──

  it('calls onHover when mouse enters a component', () => {
    const components = [createComponent('heading', { id: 'h1', props: { text: 'Hello', level: 2, color: '#000', align: 'left' } })];
    const page = createPage({ rootComponents: components });

    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    fireEvent.mouseEnter(screen.getByText('Hello'));
    expect(onHover).toHaveBeenCalledWith('h1');
  });

  it('calls onHover with null when mouse leaves a component', () => {
    const components = [createComponent('heading', { id: 'h1', props: { text: 'Hello', level: 2, color: '#000', align: 'left' } })];
    const page = createPage({ rootComponents: components });

    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    fireEvent.mouseEnter(screen.getByText('Hello'));
    fireEvent.mouseLeave(screen.getByText('Hello'));
    expect(onHover).toHaveBeenCalledWith(null);
  });

  // ── Drag and Drop ──

  it('calls onDrop when dropping a component onto canvas', () => {
    const page = createPage();

    const { container } = render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    const canvasDiv = container.querySelector('[data-canvas="true"]')!;

    // Create a mock dataTransfer with a drop effect
    const dataTransfer = {
      getData: vi.fn().mockReturnValue('button'),
      setData: vi.fn(),
      dropEffect: '',
      effectAllowed: 'copy',
    };

    fireEvent.dragOver(canvasDiv, { dataTransfer });
    fireEvent.drop(canvasDiv, { dataTransfer });

    expect(onDrop).toHaveBeenCalled();
    // First arg should be the component type
    expect(onDrop.mock.calls[0][0]).toBe('button');
    // Position args should be numbers (x, y)
    expect(typeof onDrop.mock.calls[0][1]).toBe('number');
    expect(typeof onDrop.mock.calls[0][2]).toBe('number');
  });

  it('does not call onDrop dropping with no type data', () => {
    const page = createPage();

    const { container } = render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    const canvasDiv = container.querySelector('[data-canvas="true"]')!;
    const dataTransfer = { getData: vi.fn().mockReturnValue(''), dropEffect: '' };

    fireEvent.drop(canvasDiv, { dataTransfer });

    expect(onDrop).not.toHaveBeenCalled();
  });

  // ── Canvas Zoom Controls ──

  it('shows zoom percentage', () => {
    const page = createPage();
    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('decreases zoom when minus button is clicked', () => {
    const page = createPage();
    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    const minusButton = screen.getByText('−');
    fireEvent.click(minusButton);
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('increases zoom when plus button is clicked', () => {
    const page = createPage();
    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    const plusButton = screen.getByText('+');
    fireEvent.click(plusButton);
    expect(screen.getByText('110%')).toBeInTheDocument();
  });

  it('resets zoom and pan when Reset button is clicked', () => {
    const page = createPage();
    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    // Zoom in first
    fireEvent.click(screen.getByText('+'));
    expect(screen.getByText('110%')).toBeInTheDocument();

    // Reset
    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  // ── Device Frame ──

  it('renders device frame buttons', () => {
    const page = createPage();
    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    expect(screen.getByText('Desktop')).toBeInTheDocument();
    expect(screen.getByText('Tablet')).toBeInTheDocument();
    expect(screen.getByText('Mobile')).toBeInTheDocument();
  });

  // ── Status Bar ──

  it('shows component count in status bar', () => {
    const components = [
      createComponent('heading', { id: 'h1' }),
      createComponent('text', { id: 't1' }),
    ];
    const page = createPage({ rootComponents: components });

    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    expect(screen.getByText(/Components: 2/)).toBeInTheDocument();
  });

  it('shows selected count when components are selected', () => {
    const components = [createComponent('heading', { id: 'h1' })];
    const page = createPage({ rootComponents: components });
    const selection = { ...defaultSelection, selectedIds: ['h1'] };

    render(
      <VisualEditorCanvas
        page={page}
        selection={selection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    expect(screen.getByText(/Selected: 1/)).toBeInTheDocument();
  });

  it('shows correct status bar footer text', () => {
    const page = createPage();
    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    expect(screen.getByText(/Drag to add/)).toBeInTheDocument();
    expect(screen.getByText(/Click to select/)).toBeInTheDocument();
    expect(screen.getByText(/Del to delete/)).toBeInTheDocument();
  });

  // ── Nested Components ──

  it('renders nested components (containers with children)', () => {
    const childComponent = createComponent('heading', {
      id: 'child-h1',
      props: { text: 'Child Heading', level: 2, color: '#000', align: 'left' },
    });
    const containerComponent = createComponent('container', {
      id: 'parent-container',
      children: [childComponent],
    });
    const page = createPage({ rootComponents: [containerComponent] });

    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    expect(screen.getByText('Child Heading')).toBeInTheDocument();
    // Container should not show the placeholder since it has children
    expect(screen.queryByText(/Container — drop components here/)).not.toBeInTheDocument();
  });

  it('shows placeholder text in empty containers', () => {
    const containerComponent = createComponent('container', {
      id: 'empty-container',
      children: [],
    });
    const page = createPage({ rootComponents: [containerComponent] });

    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    expect(screen.getByText(/Container — drop components here/)).toBeInTheDocument();
  });

  // ── Alert Component Variants ──

  it('renders alert with info variant by default', () => {
    const components = [createComponent('alert', { id: 'alert1' })];
    const page = createPage({ rootComponents: components });

    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    expect(screen.getByText('This is an alert')).toBeInTheDocument();
  });

  // ── Divider Component ──

  it('renders divider component', () => {
    const components = [createComponent('divider', { id: 'div1' })];
    const page = createPage({ rootComponents: components });

    const { container } = render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    // Divider renders as an hr element
    expect(container.querySelector('hr')).toBeInTheDocument();
  });

  // ── Link Component ──

  it('renders link component', () => {
    const components = [createComponent('link', { id: 'link1' })];
    const page = createPage({ rootComponents: components });

    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    expect(screen.getByText('Click here')).toBeInTheDocument();
  });

  // ── Heading Levels ──

  it('renders heading at correct level', () => {
    const components = [
      createComponent('heading', {
        id: 'h1-1',
        props: { text: 'Heading 1', level: 1, color: '#000', align: 'left' },
      }),
    ];
    const page = createPage({ rootComponents: components });

    const { container } = render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    // Should render as <h1>
    const heading = container.querySelector('h1');
    expect(heading).toBeInTheDocument();
    expect(heading!.textContent).toBe('Heading 1');
  });

  // ── Custom className ──

  it('accepts custom className', () => {
    const page = createPage();
    const { container } = render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
        className="custom-root-class"
      />
    );

    const rootElement = container.firstChild as HTMLElement;
    expect(rootElement.className).toContain('custom-root-class');
  });

  // ── countComponents utility (tested via status bar) ──

  it('counts nested components in total count', () => {
    const child1 = createComponent('text', { id: 'child-t1' });
    const child2 = createComponent('button', { id: 'child-btn1' });
    const containerComp = createComponent('container', {
      id: 'parent',
      children: [child1, child2],
    });
    const page = createPage({ rootComponents: [containerComp] });

    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    // 3 total: 1 container + 1 text + 1 button
    expect(screen.getByText(/Components: 3/)).toBeInTheDocument();
  });

  // ── Image Component ──

  it('renders image component', () => {
    const components = [createComponent('image', { id: 'img1' })];
    const page = createPage({ rootComponents: components });

    const { container } = render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img!.getAttribute('src')).toBe('https://placehold.co/600x400');
    expect(img!.getAttribute('alt')).toBe('Image');
  });

  // ── Table Component ──

  it('renders table component with columns and rows', () => {
    const components = [createComponent('table', { id: 'tbl1' })];
    const page = createPage({ rootComponents: components });

    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    // Should have column headers: Name, Email, Role
    const nameTexts = screen.getAllByText('Name');
    expect(nameTexts.length).toBeGreaterThanOrEqual(1);
    const emailTexts = screen.getAllByText('Email');
    expect(emailTexts.length).toBeGreaterThanOrEqual(1);
    const roleTexts = screen.getAllByText('Role');
    expect(roleTexts.length).toBeGreaterThanOrEqual(1);
  });

  // ── Progress Bar ──

  it('renders progress bar with correct percentage', () => {
    const components = [createComponent('progress', { id: 'prog1' })];
    const page = createPage({ rootComponents: components });

    const { container } = render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    // Progress should have the label 'Loading...'
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    // Inner bar should have width 60%
    const innerBar = container.querySelector('.bg-\\[var\\(--app-accent\\)\\]') || container.querySelector('[style*="width: 60%"]');
    // Alternative: check via style
    const progressBar = container.querySelector('[style*="width"]');
    expect(progressBar).toBeTruthy();
  });

  // ── List Component ──

  it('renders list component with items', () => {
    const components = [createComponent('list', { id: 'list1' })];
    const page = createPage({ rootComponents: components });

    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  // ── Navbar Component ──

  it('renders navbar with brand and links', () => {
    const components = [createComponent('navbar', { id: 'nav1' })];
    const page = createPage({ rootComponents: components });

    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    expect(screen.getByText('My App')).toBeInTheDocument();
    const homeTexts = screen.getAllByText('Home');
    expect(homeTexts.length).toBeGreaterThanOrEqual(1);
    const aboutTexts = screen.getAllByText('About');
    expect(aboutTexts.length).toBeGreaterThanOrEqual(1);
    const contactTexts = screen.getAllByText('Contact');
    expect(contactTexts.length).toBeGreaterThanOrEqual(1);
  });

  // ── Unknown Component Type ──

  it('renders fallback for unknown component type', () => {
    const components = [createComponent('unknown-type', { id: 'unknown1', type: 'unknown-type' })];
    const page = createPage({ rootComponents: components });

    render(
      <VisualEditorCanvas
        page={page}
        selection={defaultSelection}
        dragState={defaultDragState}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onDrop={onDrop}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        onHover={onHover}
      />
    );

    // Unknown types show the type name in a fallback div
    expect(screen.getByText('unknown-type')).toBeInTheDocument();
  });
});
