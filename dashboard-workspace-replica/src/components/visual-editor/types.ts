/**
 * Visual Editor Type Definitions
 *
 * Provides the component model for the drag-and-drop visual builder.
 * Each component has a type, props, children, and position data.
 */

export type ComponentCategory =
  | 'layout'
  | 'forms'
  | 'data'
  | 'navigation'
  | 'typography'
  | 'media'
  | 'feedback'
  | 'custom';

export interface ComponentDefinition {
  /** Unique identifier for the component type (e.g. 'button', 'card', 'input') */
  type: string;
  /** Human-readable label */
  label: string;
  /** Component category for the palette */
  category: ComponentCategory;
  /** Icon identifier (lucide icon name) */
  icon: string;
  /** Default props when a new instance is created */
  defaultProps: Record<string, unknown>;
  /** Default children types (for layout components) */
  defaultChildren?: string[];
  /** The JSX/HTML template string with {{placeholder}} for prop values */
  template?: string;
  /** Description shown in the palette tooltip */
  description: string;
  /** Minimum dimensions on canvas */
  minWidth?: number;
  minHeight?: number;
  /** Whether the component can contain children */
  droppable?: boolean;
}

export interface ComponentInstance {
  /** Unique instance ID */
  id: string;
  /** Component type reference */
  type: string;
  /** Position on the canvas (absolute or relative) */
  position: { x: number; y: number };
  /** Size on the canvas */
  size: { width: number; height: number };
  /** Resolved props for this instance */
  props: Record<string, unknown>;
  /** Child component instances */
  children: ComponentInstance[];
  /** CSS class overrides */
  className?: string;
}

export interface EditorPage {
  /** Unique page/screen ID */
  id: string;
  /** Page name (e.g. "Home", "About") */
  name: string;
  /** Route path (e.g. "/", "/about") */
  route: string;
  /** Root component instances on this page */
  rootComponents: ComponentInstance[];
}

export interface EditorProject {
  pages: EditorPage[];
  activePageId: string;
  /** Global CSS */
  globalCss: string;
  /** Imported component libraries */
  libraries: string[];
}

export interface DragState {
  isDragging: boolean;
  /** The component type being dragged from palette */
  dragType: string | null;
  /** Position of the drop indicator */
  dropPosition: { x: number; y: number } | null;
  /** Target container ID for drop */
  dropTargetId: string | null;
}

export interface SelectionState {
  selectedIds: string[];
  hoveredId: string | null;
  /** Whether resizing */
  isResizing: boolean;
  resizeHandle: string | null;
}

export const BUILT_IN_COMPONENTS: ComponentDefinition[] = [
  // Layout
  {
    type: 'container',
    label: 'Container',
    category: 'layout',
    icon: 'Square',
    defaultProps: { maxWidth: '1200px', padding: '16px', background: 'transparent' },
    description: 'A responsive container for page sections',
    droppable: true,
    minWidth: 200,
    minHeight: 50,
  },
  {
    type: 'row',
    label: 'Row',
    category: 'layout',
    icon: 'Columns2',
    defaultProps: { gap: '16px', alignItems: 'flex-start', justifyContent: 'flex-start' },
    description: 'A horizontal flex row for placing items side by side',
    droppable: true,
    minWidth: 200,
    minHeight: 40,
  },
  {
    type: 'column',
    label: 'Column',
    category: 'layout',
    icon: 'Columns3',
    defaultProps: { width: '1fr', gap: '8px' },
    description: 'A vertical flex column',
    droppable: true,
    minWidth: 50,
    minHeight: 40,
  },
  {
    type: 'card',
    label: 'Card',
    category: 'layout',
    icon: 'CreditCard',
    defaultProps: { padding: '24px', radius: '8px', shadow: 'sm', background: '#ffffff' },
    description: 'A card container with optional header/footer',
    droppable: true,
    minWidth: 150,
    minHeight: 80,
  },
  {
    type: 'section',
    label: 'Section',
    category: 'layout',
    icon: 'LayoutPanelTop',
    defaultProps: { padding: '64px 16px', background: '#f9fafb' },
    description: 'A full-width page section',
    droppable: true,
    minWidth: 200,
    minHeight: 100,
  },
  {
    type: 'grid',
    label: 'Grid',
    category: 'layout',
    icon: 'Grid3x3',
    defaultProps: { columns: 3, gap: '16px' },
    description: 'A CSS grid layout for arranging items',
    droppable: true,
    minWidth: 200,
    minHeight: 80,
  },
  {
    type: 'divider',
    label: 'Divider',
    category: 'layout',
    icon: 'Minus',
    defaultProps: { margin: '24px 0' },
    description: 'A horizontal divider line',
    minHeight: 2,
  },

  // Typography
  {
    type: 'heading',
    label: 'Heading',
    category: 'typography',
    icon: 'Heading1',
    defaultProps: { level: 2, text: 'Heading Text', align: 'left', color: '#111827' },
    description: 'A page heading (h1-h6)',
    minHeight: 30,
  },
  {
    type: 'text',
    label: 'Text',
    category: 'typography',
    icon: 'Type',
    defaultProps: { text: 'Lorem ipsum dolor sit amet.', fontSize: '16px', color: '#374151', align: 'left' },
    description: 'A paragraph of text',
    minHeight: 20,
  },
  {
    type: 'badge',
    label: 'Badge',
    category: 'typography',
    icon: 'Tag',
    defaultProps: { text: 'New', variant: 'default' },
    description: 'A small badge/label',
    minWidth: 40,
    minHeight: 20,
  },

  // Forms
  {
    type: 'button',
    label: 'Button',
    category: 'forms',
    icon: 'MousePointerClick',
    defaultProps: { text: 'Click Me', variant: 'primary', size: 'md', disabled: false },
    description: 'A clickable button',
    minWidth: 80,
    minHeight: 36,
  },
  {
    type: 'input',
    label: 'Text Input',
    category: 'forms',
    icon: 'SquarePen',
    defaultProps: { placeholder: 'Enter text...', label: 'Name', type: 'text', required: false },
    description: 'A text input field',
    minWidth: 140,
    minHeight: 36,
  },
  {
    type: 'textarea',
    label: 'Textarea',
    category: 'forms',
    icon: 'AlignLeft',
    defaultProps: { placeholder: 'Enter description...', label: 'Description', rows: 4 },
    description: 'A multi-line text input',
    minWidth: 140,
    minHeight: 80,
  },
  {
    type: 'select',
    label: 'Select',
    category: 'forms',
    icon: 'ListChecks',
    defaultProps: { label: 'Choose', options: 'Option 1,Option 2,Option 3', placeholder: 'Select...' },
    description: 'A dropdown select field',
    minWidth: 140,
    minHeight: 36,
  },
  {
    type: 'checkbox',
    label: 'Checkbox',
    category: 'forms',
    icon: 'CheckSquare',
    defaultProps: { label: 'Accept terms', checked: false },
    description: 'A checkbox input',
    minHeight: 24,
  },
  {
    type: 'radio',
    label: 'Radio Group',
    category: 'forms',
    icon: 'CircleDot',
    defaultProps: { label: 'Choose one', options: 'Option A,Option B,Option C' },
    description: 'A radio button group',
    minHeight: 60,
  },
  {
    type: 'form',
    label: 'Form',
    category: 'forms',
    icon: 'FileText',
    defaultProps: { onSubmit: 'handleSubmit' },
    description: 'A form container that wraps inputs',
    droppable: true,
    minWidth: 200,
    minHeight: 100,
  },

  // Data Display
  {
    type: 'table',
    label: 'Table',
    category: 'data',
    icon: 'Table',
    defaultProps: { columns: 'Name,Email,Role', rows: 3 },
    description: 'A data table',
    minWidth: 250,
    minHeight: 120,
  },
  {
    type: 'list',
    label: 'List',
    category: 'data',
    icon: 'List',
    defaultProps: { items: 'Item 1,Item 2,Item 3', type: 'unordered' },
    description: 'A bullet or numbered list',
    minWidth: 100,
    minHeight: 60,
  },
  {
    type: 'image',
    label: 'Image',
    category: 'media',
    icon: 'Image',
    defaultProps: { src: 'https://placehold.co/600x400', alt: 'Image', borderRadius: '0px', objectFit: 'cover' },
    description: 'An image element',
    minWidth: 50,
    minHeight: 50,
  },
  {
    type: 'video',
    label: 'Video',
    category: 'media',
    icon: 'Video',
    defaultProps: { src: '', embedUrl: '', aspectRatio: '16/9' },
    description: 'A video or embedded iframe',
    minWidth: 200,
    minHeight: 112,
  },
  {
    type: 'icon',
    label: 'Icon',
    category: 'media',
    icon: 'Smile',
    defaultProps: { name: 'Heart', size: '24', color: '#ef4444' },
    description: 'An icon element',
    minWidth: 24,
    minHeight: 24,
  },

  // Navigation
  {
    type: 'navbar',
    label: 'Navbar',
    category: 'navigation',
    icon: 'Navigation',
    defaultProps: { brand: 'My App', links: 'Home,About,Contact', position: 'static' },
    description: 'A top navigation bar',
    minWidth: 200,
    minHeight: 56,
  },
  {
    type: 'link',
    label: 'Link',
    category: 'navigation',
    icon: 'Link',
    defaultProps: { text: 'Click here', href: '#', target: '_self' },
    description: 'A hyperlink',
    minHeight: 20,
  },
  {
    type: 'breadcrumbs',
    label: 'Breadcrumbs',
    category: 'navigation',
    icon: 'ChevronRight',
    defaultProps: { items: 'Home / Products / Details' },
    description: 'Breadcrumb navigation trail',
    minHeight: 24,
  },

  // Feedback
  {
    type: 'alert',
    label: 'Alert',
    category: 'feedback',
    icon: 'AlertTriangle',
    defaultProps: { text: 'This is an alert', variant: 'info', dismissible: false },
    description: 'An alert/notification banner',
    minWidth: 150,
    minHeight: 40,
  },
  {
    type: 'progress',
    label: 'Progress Bar',
    category: 'feedback',
    icon: 'Loader',
    defaultProps: { value: 60, max: 100, label: 'Loading...' },
    description: 'A progress indicator',
    minWidth: 100,
    minHeight: 20,
  },
  {
    type: 'spinner',
    label: 'Spinner',
    category: 'feedback',
    icon: 'LoaderCircle',
    defaultProps: { size: '24', color: '#6366f1' },
    description: 'A loading spinner',
    minWidth: 24,
    minHeight: 24,
  },
];

export function getComponentDefinition(type: string): ComponentDefinition | undefined {
  return BUILT_IN_COMPONENTS.find((c) => c.type === type);
}
