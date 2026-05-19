import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertyPanel } from '@/components/visual-editor/property-panel';
import type { ComponentInstance } from '@/components/visual-editor/types';
import { BUILT_IN_COMPONENTS } from '@/components/visual-editor/types';

function createComponent(
  type: string,
  overrides: Partial<ComponentInstance> = {}
): ComponentInstance {
  const def = BUILT_IN_COMPONENTS.find((c) => c.type === type);
  const base: ComponentInstance = {
    id: `comp-${type}-1`,
    type,
    position: { x: 10, y: 20 },
    size: { width: 200, height: 40 },
    props: { ...(def?.defaultProps || {}) },
    children: [],
  };
  return { ...base, ...overrides };
}

describe('PropertyPanel', () => {
  const onUpdateProps = vi.fn();
  const onUpdateSize = vi.fn();
  const onMove = vi.fn();
  const onDelete = vi.fn();
  const onDuplicate = vi.fn();
  const onReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Empty State ──

  it('renders empty state when no component is selected', () => {
    render(
      <PropertyPanel
        component={null}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    expect(screen.getByText('Properties')).toBeInTheDocument();
    expect(screen.getByText(/Select a component on the canvas/)).toBeInTheDocument();
    expect(screen.getByText(/to edit its properties/)).toBeInTheDocument();
  });

  it('does not show action buttons when no component is selected', () => {
    render(
      <PropertyPanel
        component={null}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    expect(screen.queryByTitle('Duplicate')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Reset to defaults')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
  });

  // ── Component Info ──

  it('shows component label and type when selected', () => {
    const button = createComponent('button');
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    const buttonLabels = screen.getAllByText('Button');
    expect(buttonLabels.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('button')).toBeInTheDocument();
  });

  it('shows component info for heading type', () => {
    const heading = createComponent('heading');
    render(
      <PropertyPanel
        component={heading}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    const headingLabels = screen.getAllByText('Heading');
    expect(headingLabels.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('heading')).toBeInTheDocument();
  });

  // ── Action Buttons ──

  it('renders duplicate, reset, and delete action buttons', () => {
    const button = createComponent('button');
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    expect(screen.getByTitle('Duplicate')).toBeInTheDocument();
    expect(screen.getByTitle('Reset to defaults')).toBeInTheDocument();
    expect(screen.getByTitle('Delete')).toBeInTheDocument();
  });

  it('calls onDuplicate when duplicate button is clicked', () => {
    const button = createComponent('button');
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    fireEvent.click(screen.getByTitle('Duplicate'));
    expect(onDuplicate).toHaveBeenCalledWith('comp-button-1');
  });

  it('calls onReset when reset button is clicked', () => {
    const button = createComponent('button');
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    fireEvent.click(screen.getByTitle('Reset to defaults'));
    expect(onReset).toHaveBeenCalledWith('comp-button-1');
  });

  it('calls onDelete when delete button is clicked', () => {
    const button = createComponent('button');
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    fireEvent.click(screen.getByTitle('Delete'));
    expect(onDelete).toHaveBeenCalledWith('comp-button-1');
  });

  // ── Layout Section ──

  it('renders layout section with width input', () => {
    const button = createComponent('button', { size: { width: 150, height: 40 } });
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    expect(screen.getByText('Layout')).toBeInTheDocument();
    expect(screen.getByText('Width')).toBeInTheDocument();
    expect(screen.getByText('Height')).toBeInTheDocument();
    expect(screen.getByText('X Position')).toBeInTheDocument();
    expect(screen.getByText('Y Position')).toBeInTheDocument();
  });

  it('shows correct width and height values', () => {
    const button = createComponent('button', { size: { width: 300, height: 50 } });
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    // Width input should have value 300
    const widthInputs = screen.getAllByDisplayValue('300');
    expect(widthInputs.length).toBeGreaterThanOrEqual(1);

    // Height input should have value 50
    const heightInputs = screen.getAllByDisplayValue('50');
    expect(heightInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('shows correct position values', () => {
    const button = createComponent('button', { position: { x: 100, y: 200 } });
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    expect(screen.getAllByDisplayValue('100').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByDisplayValue('200').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onUpdateSize when width changes', () => {
    const button = createComponent('button', { id: 'btn-1', size: { width: 200, height: 40 } });
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    const widthInput = screen.getByDisplayValue('200');
    fireEvent.change(widthInput, { target: { value: '250' } });

    expect(onUpdateSize).toHaveBeenCalledWith('btn-1', 250, 40);
  });

  it('calls onUpdateSize when height changes', () => {
    const button = createComponent('button', { id: 'btn-1', size: { width: 200, height: 40 } });
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    const heightInput = screen.getByDisplayValue('40');
    fireEvent.change(heightInput, { target: { value: '60' } });

    expect(onUpdateSize).toHaveBeenCalledWith('btn-1', 200, 60);
  });

  // ── Component-Specific Props ──

  it('renders component-specific props for button type', () => {
    const button = createComponent('button');
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    // Button should show Text, Variant, Size, Disabled props
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Variant')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('renders component-specific props for heading type', () => {
    const heading = createComponent('heading');
    render(
      <PropertyPanel
        component={heading}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    // Heading should show Level, Text, Align, Color props
    expect(screen.getByText('Level')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Align')).toBeInTheDocument();
    expect(screen.getByText('Color')).toBeInTheDocument();
  });

  it('renders component-specific props for container type', () => {
    const container = createComponent('container');
    render(
      <PropertyPanel
        component={container}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    expect(screen.getByText('Max Width')).toBeInTheDocument();
    expect(screen.getByText('Padding')).toBeInTheDocument();
    expect(screen.getByText('Background')).toBeInTheDocument();
  });

  it('renders component-specific props for input type', () => {
    const input = createComponent('input');
    render(
      <PropertyPanel
        component={input}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    expect(screen.getByText('Placeholder')).toBeInTheDocument();
    expect(screen.getByText('Label')).toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  // ── Prop Change Handlers ──

  it('calls onUpdateProps when a text prop changes', () => {
    const button = createComponent('button', { id: 'btn-1' });
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    // Find the text input for the "text" prop (value should be "Click Me")
    const textInput = screen.getByDisplayValue('Click Me');
    fireEvent.change(textInput, { target: { value: 'Submit' } });

    expect(onUpdateProps).toHaveBeenCalledWith('btn-1', expect.objectContaining({ text: 'Submit' }));
  });

  it('calls onUpdateProps when a select prop changes', () => {
    const button = createComponent('button', { id: 'btn-1' });
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    // Find the variant select and change it
    const variantSelect = screen.getByDisplayValue('primary');
    fireEvent.change(variantSelect, { target: { value: 'secondary' } });

    expect(onUpdateProps).toHaveBeenCalledWith('btn-1', expect.objectContaining({ variant: 'secondary' }));
  });

  it('calls onUpdateProps when a checkbox prop changes', () => {
    const button = createComponent('button', { id: 'btn-1' });
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    // Find the disabled checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(onUpdateProps).toHaveBeenCalledWith('btn-1', expect.objectContaining({ disabled: true }));
  });

  // ── CSS Class Override ──

  it('renders advanced section with CSS class input', () => {
    const button = createComponent('button');
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.getByText('CSS Class')).toBeInTheDocument();
  });

  it('calls onUpdateProps when CSS class changes', () => {
    const button = createComponent('button', { id: 'btn-1' });
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    const cssInput = screen.getByPlaceholderText('custom-class');
    fireEvent.change(cssInput, { target: { value: 'my-custom-class' } });

    expect(onUpdateProps).toHaveBeenCalledWith('btn-1', expect.objectContaining({ className: 'my-custom-class' }));
  });

  // ── Edge Cases ──

  it('handles component with unknown type by showing empty state', () => {
    // When type is unknown, getComponentDefinition returns undefined => empty state
    const unknown: ComponentInstance = {
      id: 'unknown-1',
      type: 'nonexistent',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 40 },
      props: {},
      children: [],
    };
    render(
      <PropertyPanel
        component={unknown}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    // Should show empty state since component type is not in BUILT_IN_COMPONENTS
    expect(screen.getByText(/Select a component/)).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const button = createComponent('button');
    const { container } = render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
        className="custom-panel"
      />
    );

    const rootElement = container.firstChild as HTMLElement;
    expect(rootElement.className).toContain('custom-panel');
  });

  it('enables position inputs and calls onMove on change', () => {
    const button = createComponent('button', { position: { x: 50, y: 75 } });
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    // X position input should be enabled and show the value
    const xInput = screen.getByDisplayValue('50');
    expect(xInput).not.toBeDisabled();

    // Changing it should call onMove
    fireEvent.change(xInput, { target: { value: '100' } });
    expect(onMove).toHaveBeenCalledWith('comp-button-1', 100, 75);
  });

  // ── Section Structure ──

  it('shows header section with action buttons for selected component', () => {
    const button = createComponent('button');
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    // Header should still contain "Properties" text
    expect(screen.getByText('Properties')).toBeInTheDocument();
  });

  // ── Color Input ──

  it('renders color input for color props', () => {
    const heading = createComponent('heading', {
      props: { color: '#111827', text: 'Hello', level: 2, align: 'left' },
    });
    render(
      <PropertyPanel
        component={heading}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    // Color input is rendered as a combination of color picker and text input
    // The color value should be visible
    const colorInputs = screen.getAllByDisplayValue('#111827');
    expect(colorInputs.length).toBeGreaterThanOrEqual(1);
  });

  // ── Size Select for Button ──

  it('renders size select for button with md, sm, lg options', () => {
    const button = createComponent('button');
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    const sizeSelect = screen.getByDisplayValue('md');
    expect(sizeSelect).toBeInTheDocument();
    expect(sizeSelect.tagName).toBe('SELECT');
  });

  // ── Level Select for Heading ──

  it('renders level select for heading with H1-H6 options', () => {
    const heading = createComponent('heading');
    render(
      <PropertyPanel
        component={heading}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    // Check that the select has H1 option
    expect(screen.getByText('H1')).toBeInTheDocument();
    // Should have H2 as a selectable option too
    expect(screen.getByText('H2')).toBeInTheDocument();
    expect(screen.getByText('H6')).toBeInTheDocument();
  });

  // ── Image Type Props ──

  it('renders image-specific props', () => {
    const image = createComponent('image');
    render(
      <PropertyPanel
        component={image}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    expect(screen.getByText('Src')).toBeInTheDocument();
    expect(screen.getByText('Alt')).toBeInTheDocument();
    expect(screen.getByText('Border Radius')).toBeInTheDocument();
    expect(screen.getByText('Object Fit')).toBeInTheDocument();
  });

  // ── Navbar Type Props ──

  it('renders navbar-specific props', () => {
    const navbar = createComponent('navbar');
    render(
      <PropertyPanel
        component={navbar}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    expect(screen.getByText('Brand')).toBeInTheDocument();
    expect(screen.getByText('Links')).toBeInTheDocument();
    expect(screen.getByText('Position')).toBeInTheDocument();
  });

  // ── Table Type Props ──

  it('renders table-specific props', () => {
    const table = createComponent('table');
    render(
      <PropertyPanel
        component={table}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    expect(screen.getByText('Columns')).toBeInTheDocument();
    expect(screen.getByText('Rows')).toBeInTheDocument();
  });

  // ── Props for All Component Types ──

  it('renders props correctly for all built-in component types', () => {
    // Test a few more diverse types
    const typesToTest = ['form', 'select', 'textarea', 'section', 'video'];

    typesToTest.forEach((type) => {
      const comp = createComponent(type);
      const { unmount } = render(
        <PropertyPanel
          component={comp}
          onUpdateProps={onUpdateProps}
          onUpdateSize={onUpdateSize}
        onMove={onMove}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onReset={onReset}
        />
      );

      // Should show the component label
      const def = BUILT_IN_COMPONENTS.find((c) => c.type === type);
      const labels = screen.getAllByText(def!.label);
      expect(labels.length).toBeGreaterThanOrEqual(1);
      // Should show Layout section
      expect(screen.getByText('Layout')).toBeInTheDocument();
      // Should show Advanced section
      expect(screen.getByText('Advanced')).toBeInTheDocument();

      unmount();
    });
  });

  // ── Props Preserve Existing Values ──

  it('preserves existing props when updating a single prop', () => {
    const button = createComponent('button', {
      id: 'btn-1',
      props: { text: 'Submit', variant: 'primary', size: 'lg', disabled: true },
    });
    render(
      <PropertyPanel
        component={button}
        onUpdateProps={onUpdateProps}
        onUpdateSize={onUpdateSize}
        onMove={onMove}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onReset={onReset}
      />
    );

    // Change the variant
    const variantSelect = screen.getByDisplayValue('primary');
    fireEvent.change(variantSelect, { target: { value: 'danger' } });

    // Should preserve all other props
    expect(onUpdateProps).toHaveBeenCalledWith('btn-1', {
      text: 'Submit',
      variant: 'danger',
      size: 'lg',
      disabled: true,
    });
  });
});
