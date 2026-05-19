import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ComponentPalette } from '@/components/visual-editor/component-palette';
import { BUILT_IN_COMPONENTS, getComponentDefinition } from '@/components/visual-editor/types';

describe('ComponentPalette', () => {
  const onDragStart = vi.fn();
  const onDragEnd = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──

  it('renders the palette header', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    expect(screen.getByText('Components')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    expect(screen.getByPlaceholderText('Find component...')).toBeInTheDocument();
  });

  it('renders all category tabs by default', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    const categories = ['Layout', 'Typography', 'Forms', 'Data', 'Media', 'Navigation', 'Feedback'];
    categories.forEach((cat) => {
      expect(screen.getByRole('button', { name: cat })).toBeInTheDocument();
    });
  });

  it('renders layout category components by default', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    const layoutComponents = BUILT_IN_COMPONENTS.filter((c) => c.category === 'layout');
    layoutComponents.forEach((comp) => {
      expect(screen.getByText(comp.label)).toBeInTheDocument();
    });
  });

  it('renders the footer hint text', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    expect(screen.getByText('Drag components onto the canvas')).toBeInTheDocument();
  });

  // ── Category Filtering ──

  it('shows typography components when typography tab is clicked', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Typography' }));

    const typographyComponents = BUILT_IN_COMPONENTS.filter((c) => c.category === 'typography');
    typographyComponents.forEach((comp) => {
      expect(screen.getByText(comp.label)).toBeInTheDocument();
    });

    // Layout components should not be visible
    const layoutComponents = BUILT_IN_COMPONENTS.filter((c) => c.category === 'layout');
    layoutComponents.forEach((comp) => {
      expect(screen.queryByText(comp.label)).not.toBeInTheDocument();
    });
  });

  it('switches between all category tabs correctly', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    const categories = ['Typography', 'Forms', 'Data', 'Media', 'Navigation', 'Feedback'] as const;

    categories.forEach((catLabel) => {
      const catId = catLabel.toLowerCase() as any;
      fireEvent.click(screen.getByRole('button', { name: catLabel }));
      const categoryComponents = BUILT_IN_COMPONENTS.filter((c) => c.category === catId);
      expect(categoryComponents.length).toBeGreaterThan(0);
      // Check first component of the category renders
      expect(screen.getByText(categoryComponents[0].label)).toBeInTheDocument();
    });
  });

  it('highlights the active category tab', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    const layoutTab = screen.getByRole('button', { name: 'Layout' });
    expect(layoutTab.className).toContain('app-accent');

    fireEvent.click(screen.getByRole('button', { name: 'Forms' }));
    expect(screen.getByRole('button', { name: 'Layout' }).className).not.toContain('app-accent');
    expect(screen.getByRole('button', { name: 'Forms' }).className).toContain('app-accent');
  });

  // ── Search ──

  it('filters components by label name', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    const searchInput = screen.getByPlaceholderText('Find component...');
    fireEvent.change(searchInput, { target: { value: 'Button' } });

    expect(screen.getByText('Button')).toBeInTheDocument();
    expect(screen.queryByText('Container')).not.toBeInTheDocument();
    expect(screen.queryByText('Heading')).not.toBeInTheDocument();
  });

  it('filters components by type name', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    const searchInput = screen.getByPlaceholderText('Find component...');
    fireEvent.change(searchInput, { target: { value: 'navbar' } });

    expect(screen.getByText('Navbar')).toBeInTheDocument();
  });

  it('filters components by description text', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    const searchInput = screen.getByPlaceholderText('Find component...');
    fireEvent.change(searchInput, { target: { value: 'breadcrumb' } });

    expect(screen.getByText('Breadcrumbs')).toBeInTheDocument();
  });

  it('shows empty state when no components match search', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    const searchInput = screen.getByPlaceholderText('Find component...');
    fireEvent.change(searchInput, { target: { value: 'zzzzzxyxyx' } });

    expect(screen.getByText('No matching components')).toBeInTheDocument();
  });

  it('hides category tabs when searching', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    const searchInput = screen.getByPlaceholderText('Find component...');

    // Tabs are visible before search
    expect(screen.getByRole('button', { name: 'Layout' })).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Button' } });

    // Tabs should not be visible during search
    expect(screen.queryByRole('button', { name: 'Layout' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Forms' })).not.toBeInTheDocument();
  });

  it('shows no matching components for empty category when no components', () => {
    // Custom components array to simulate an empty category
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    // 'custom' category doesn't exist in CATEGORIES, but if we search for something impossible
    const searchInput = screen.getByPlaceholderText('Find component...');
    fireEvent.change(searchInput, { target: { value: '___' } });

    expect(screen.getByText('No matching components')).toBeInTheDocument();
  });

  // ── Search Clears Category Filter ──

  it('searches across all categories when typing', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    // Start on Layout, see layout components
    const formsTab = screen.getByRole('button', { name: 'Forms' });
    fireEvent.click(formsTab);

    // Search for a typography component while on forms tab
    const searchInput = screen.getByPlaceholderText('Find component...');
    fireEvent.change(searchInput, { target: { value: 'Heading' } });

    // Should find heading even though we're on forms tab
    expect(screen.getByText('Heading')).toBeInTheDocument();
  });

  // ── Drag Events ──

  it('calls onDragStart when a component starts being dragged', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);

    // Button is in the Forms category, switch to it first
    fireEvent.click(screen.getByRole('button', { name: 'Forms' }));

    const buttonElement = screen.getByText('Button').closest('[draggable]')!;

    // Note: jsdom has limited DataTransfer support. We simulate what we can.
    const dataTransfer = {
      setData: vi.fn(),
      effectAllowed: '',
    };

    fireEvent.dragStart(buttonElement, { dataTransfer });

    expect(onDragStart).toHaveBeenCalledWith('button');
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'button');
    expect(dataTransfer.effectAllowed).toBe('copy');
  });

  it('calls onDragEnd when drag ends', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);

    // Button is in the Forms category, switch to it first
    fireEvent.click(screen.getByRole('button', { name: 'Forms' }));

    const buttonElement = screen.getByText('Button').closest('[draggable]')!;

    fireEvent.dragEnd(buttonElement);

    expect(onDragEnd).toHaveBeenCalled();
  });

  it('calls onDragStart for different component types', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);

    // Test with a form component - switch to Forms tab first
    fireEvent.click(screen.getByRole('button', { name: 'Forms' }));

    const inputElement = screen.getByText('Text Input').closest('[draggable]')!;
    const dataTransfer = { setData: vi.fn(), effectAllowed: '' };

    fireEvent.dragStart(inputElement, { dataTransfer });
    expect(onDragStart).toHaveBeenCalledWith('input');
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'input');
  });

  // ── Palette Items Show Descriptions ──

  it('shows descriptions for palette items', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);

    BUILT_IN_COMPONENTS.filter((c) => c.category === 'layout').forEach((comp) => {
      expect(screen.getByText(comp.description)).toBeInTheDocument();
    });
  });

  it('shows descriptions when searching', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    const searchInput = screen.getByPlaceholderText('Find component...');
    fireEvent.change(searchInput, { target: { value: 'alert' } });

    const alert = BUILT_IN_COMPONENTS.find((c) => c.type === 'alert')!;
    expect(screen.getByText(alert.description)).toBeInTheDocument();
  });

  // ── getComponentDefinition utility ──

  it('getComponentDefinition returns a definition for known types', () => {
    const def = getComponentDefinition('button');
    expect(def).toBeDefined();
    expect(def!.type).toBe('button');
    expect(def!.label).toBe('Button');
    expect(def!.category).toBe('forms');
  });

  it('getComponentDefinition returns undefined for unknown types', () => {
    expect(getComponentDefinition('unknown_type')).toBeUndefined();
  });

  it('getComponentDefinition has defaultProps for all built-in components', () => {
    BUILT_IN_COMPONENTS.forEach((comp) => {
      expect(comp.defaultProps).toBeDefined();
      expect(Object.keys(comp.defaultProps).length).toBeGreaterThan(0);
    });
  });

  it('getComponentDefinition has valid categories for all components', () => {
    const validCategories = ['layout', 'forms', 'data', 'navigation', 'typography', 'media', 'feedback', 'custom'];
    BUILT_IN_COMPONENTS.forEach((comp) => {
      expect(validCategories).toContain(comp.category);
    });
  });

  // ── BUILT_IN_COMPONENTS Data Integrity ──

  it('has at least 27 built-in components', () => {
    expect(BUILT_IN_COMPONENTS.length).toBeGreaterThanOrEqual(27);
  });

  it('all components have unique types', () => {
    const types = BUILT_IN_COMPONENTS.map((c) => c.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('all components have required fields populated', () => {
    BUILT_IN_COMPONENTS.forEach((comp) => {
      expect(comp.type).toBeTruthy();
      expect(comp.label).toBeTruthy();
      expect(comp.description).toBeTruthy();
      expect(comp.icon).toBeTruthy();
      expect(typeof comp.minWidth === 'number' || comp.minWidth === undefined).toBe(true);
      expect(typeof comp.minHeight === 'number' || comp.minHeight === undefined).toBe(true);
    });
  });

  // ── Edge Cases ──

  it('handles null/undefined search gracefully', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    const searchInput = screen.getByPlaceholderText('Find component...');
    // Empty string should show all layout components (default category)
    fireEvent.change(searchInput, { target: { value: '' } });
    const layoutComponents = BUILT_IN_COMPONENTS.filter((c) => c.category === 'layout');
    layoutComponents.forEach((comp) => {
      expect(screen.getByText(comp.label)).toBeInTheDocument();
    });
  });

  it('renders with custom className', () => {
    const { container } = render(
      <ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} className="custom-class" />
    );
    const firstDiv = container.firstChild as HTMLElement;
    expect(firstDiv.className).toContain('custom-class');
  });

  it('renders all component items with drag handles on hover', () => {
    render(<ComponentPalette onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    const layoutComponents = BUILT_IN_COMPONENTS.filter((c) => c.category === 'layout');
    // Each palette item should be draggable
    layoutComponents.forEach((comp) => {
      const item = screen.getByText(comp.label).closest('[draggable]');
      expect(item).toBeTruthy();
    });
  });
});
