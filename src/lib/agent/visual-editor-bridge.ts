/**
 * Visual Editor → Agent Bridge
 *
 * When a user selects an element in the visual editor, the bridge
 * translates the selection into a tool call that the agent can execute.
 *
 * Flow:
 *   1. User selects element in visual editor
 *   2. Bridge resolves the element to a file + line range
 *   3. Bridge emits a line_replace request to the agent
 *   4. Agent applies the edit surgically
 *   5. Preview auto-refreshes to show the change
 */

export interface SelectionContext {
  /** The component/instance type selected */
  elementType: string;
  /** Props of the selected element */
  props: Record<string, unknown>;
  /** Source file path (if known from generation metadata) */
  sourceFile?: string;
  /** Line range in source (if tracked) */
  lineRange?: { start: number; end: number };
}

export interface AgentEditRequest {
  /** The tool call name */
  tool: 'line_replace' | 'write_file';
  /** File path to edit */
  path: string;
  /** Instructions for the agent in natural language */
  instruction: string;
  /** The current content to replace (if known) */
  currentContent?: string;
  /** Line range (if known) */
  firstLine?: number;
  lastLine?: number;
}

/**
 * Convert a visual editor selection into an agent edit request.
 * This is the bridge between the visual mode and the agent loop.
 */
export function selectionToAgentRequest(
  context: SelectionContext,
  userIntent: string,
): AgentEditRequest {
  const path = context.sourceFile || detectSourceFile(context.elementType);

  return {
    tool: context.lineRange ? 'line_replace' : 'write_file',
    path,
    instruction: userIntent,
    currentContent: undefined, // Agent will read the file first
    firstLine: context.lineRange?.start,
    lastLine: context.lineRange?.end,
  };
}

/**
 * Build a natural-language prompt from a visual editor action.
 * This gets fed to the agent as a user message.
 */
export function buildVisualEditPrompt(
  context: SelectionContext,
  userIntent: string,
): string {
  const parts: string[] = [];

  parts.push(`Edit the component at \`${context.sourceFile || detectSourceFile(context.elementType)}\``);

  if (context.elementType) {
    parts.push(`The selected element is a \`${context.elementType}\``);
  }

  if (context.props && Object.keys(context.props).length > 0) {
    const propEntries = Object.entries(context.props)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(', ');
    parts.push(`Current props: ${propEntries}`);
  }

  parts.push(`\nUser request: ${userIntent}`);

  return parts.join('\n');
}

/**
 * Heuristically detect which source file a component type lives in.
 */
function detectSourceFile(elementType: string): string {
  const componentName = elementType.charAt(0).toUpperCase() + elementType.slice(1);
  return `components/${componentName}.tsx`;
}

/**
 * Hook for the visual editor to emit agent requests through the chat panel.
 * Usage: const { requestEdit } = useVisualAgentBridge();
 *        requestEdit({ elementType: 'Button', props: { label: 'Click' } }, 'Change color to red');
 */
export function createVisualEditRequest(
  selectedElement: SelectionContext | null,
  userIntent: string,
): { prompt: string; toolPath: string } | null {
  if (!selectedElement || !userIntent.trim()) return null;

  const prompt = buildVisualEditPrompt(selectedElement, userIntent);
  const toolPath = selectedElement.sourceFile || detectSourceFile(selectedElement.elementType);

  return { prompt, toolPath };
}
