/**
 * Code Block Extraction Utilities
 *
 * Extracts code blocks from markdown content for separate display
 */

export interface CodeBlock {
  id: string;
  language: string;
  code: string;
  filename?: string;
  startTime?: number; // For streaming updates
}

export interface ParsedContent {
  text: string; // Markdown content without code blocks
  codeBlocks: CodeBlock[];
}

const COMPLETE_CODE_BLOCK_REGEX =
  /(?:(?:^|\n)\s*(?:\/\/|#|<!--)\s*(?:file|path):\s*[\w./-]+\.[a-zA-Z0-9]+\s*\n)?\s*```[a-zA-Z0-9_-]*(?:[^\n]*?filename=(?:"|')[^"']+(?:"|'))?[^\n]*\n[\s\S]*?```/gi;

const FILE_MARKER_REGEX =
  /(?:^|\n)\s*(?:\/\/|#|<!--)\s*(?:file|path):\s*[\w./-]+\.[a-zA-Z0-9]+\s*(?:-->)?/i;

const GENERATED_SUMMARY_LINE_REGEX =
  /^\s*(?:generated\s+\*\*\d+\s+files?\*\*.*|\d+\s+files?\s+generated\s*(?:→|->).*)$/gim;

/**
 * Return only the assistant-facing prose.
 *
 * Generated files belong in the file tree/code pane, not the chat transcript.
 * This function removes complete code fences, unfinished streamed code fences,
 * file-marker sections, and old "Generated 8 files..." status summaries.
 */
export function sanitizeChatContent(content: string): string {
  if (!content) return '';

  let cleaned = content.replace(COMPLETE_CODE_BLOCK_REGEX, '\n');

  const fileMarker = cleaned.search(FILE_MARKER_REGEX);
  if (fileMarker >= 0) {
    cleaned = cleaned.slice(0, fileMarker);
  }

  const fenceMatches = [...cleaned.matchAll(/```/g)];
  if (fenceMatches.length % 2 === 1) {
    const lastFence = fenceMatches[fenceMatches.length - 1];
    cleaned = cleaned.slice(0, lastFence?.index ?? cleaned.length);
  }

  cleaned = cleaned.replace(GENERATED_SUMMARY_LINE_REGEX, '');

  return cleaned
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '')
    .trim();
}

/**
 * Extract code blocks from markdown content
 *
 * Uses separate regex instances for extraction and replacement to avoid
 * the global regex state issue where .exec() modifies lastIndex.
 * When all content is code blocks (no prose), generates a brief summary.
 */
export function extractCodeBlocks(content: string): ParsedContent {
  const codeBlocks: CodeBlock[] = [];

  // ── Extract code blocks (separate regex instance) ────────────────────────
  const extractRegex = /(?:(?:^|\n)\s*(?:\/\/|#|<!--)\s*(?:file|path):\s*([\w./-]+\.[a-zA-Z0-9]+)\s*\n)?\s*```([a-zA-Z0-9_-]+)?(?:[^\n]*?filename=(?:"|')([^"']+)(?:"|'))?[^\n]*\n([\s\S]*?)```/gi;

  let matchIndex = 0;
  let match;

  while ((match = extractRegex.exec(content)) !== null) {
    const precedingName = match[1] || undefined;
    const language = match[2] || 'text';
    const filenameAttr = match[3] || undefined;
    const code = match[4] || '';

    const filename = precedingName || filenameAttr || extractFilenameFromCodeBlock(code) || generateDefaultFilename(language, matchIndex);

    const blockId = `code-block-${matchIndex}-${Date.now()}`;

    codeBlocks.push({
      id: blockId,
      language,
      code: code.trim(),
      filename,
      startTime: Date.now(),
    });

    matchIndex++;
  }

  // ── Remove code blocks from content (fresh regex, untainted lastIndex) ───
  let cleanedContent = sanitizeChatContent(content);

  // ── Clean up whitespace (preserve single blank lines between paragraphs) ──
  cleanedContent = cleanedContent
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n') // max two consecutive newlines
    .replace(/^\n+|\n+$/g, '')   // trim leading/trailing
    .trim();

  return {
    text: cleanedContent,
    codeBlocks,
  };
}

/**
 * Extract filename from code block if present
 */
export function extractFilenameFromCodeBlock(code: string): string | undefined {
  // Look for filename in first line comments
  const lines = code.split('\n');
  const firstLine = lines[0];

  if (!firstLine) return undefined;

  // Match patterns like: // File: src/App.tsx or # File: src/App.tsx
  const filenameMatch =
    firstLine.match(/^\/\/\s*(?:File:\s*)?([\w./-]+\.[a-zA-Z0-9]+)\s*$/i) ||
    firstLine.match(/^#\s*(?:File:\s*)?([\w./-]+\.[a-zA-Z0-9]+)\s*$/i) ||
    firstLine.match(/\/\*\s*(?:File:\s*)?([\w./-]+\.[a-zA-Z0-9]+)\s*\*\//i);

  return filenameMatch?.[1];
}

/**
 * Generate a default filename based on language and content
 */
export function generateDefaultFilename(language: string, index: number): string {
  const extensions: Record<string, string> = {
    typescript: 'ts',
    javascript: 'js',
    tsx: 'tsx',
    jsx: 'jsx',
    python: 'py',
    rust: 'rs',
    go: 'go',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    css: 'css',
    html: 'html',
    json: 'json',
    markdown: 'md',
    text: 'txt',
  };

  const ext = extensions[language] || 'txt';
  const baseName = language === 'tsx' || language === 'jsx' ? 'Component' : 'file';

  return `${baseName}${index > 0 ? index : ''}.${ext}`;
}

/**
 * Merge new code blocks with existing ones, updating by ID
 */
export function mergeCodeBlocks(
  existing: CodeBlock[],
  incoming: CodeBlock[]
): CodeBlock[] {
  const mergedMap = new Map<string, CodeBlock>();

  // Add existing blocks
  existing.forEach(block => mergedMap.set(block.id, block));

  // Update or add incoming blocks
  incoming.forEach(block => {
    const existingBlock = mergedMap.get(block.id);
    if (existingBlock) {
      // Update existing block
      mergedMap.set(block.id, {
        ...existingBlock,
        code: block.code, // Update code content
        filename: block.filename || existingBlock.filename,
      });
    } else {
      // Add new block
      mergedMap.set(block.id, block);
    }
  });

  return Array.from(mergedMap.values());
}

/**
 * Convert code blocks back to markdown format
 */
export function codeBlocksToMarkdown(blocks: CodeBlock[]): string {
  return blocks
    .map(block => {
      const filenameAttr = block.filename ? ` filename="${block.filename}"` : '';
      return `\`\`\`${block.language}${filenameAttr}\n${block.code}\n\`\`\``;
    })
    .join('\n\n');
}

/**
 * Parse streaming content and detect if it's inside a code block
 */
export function parseStreamingChunk(
  previousContent: string,
  newChunk: string
): { content: string; isInCodeBlock: boolean } {
  const fullContent = previousContent + newChunk;
  const codeBlockCount = (fullContent.match(/```/g) || []).length;
  const isInCodeBlock = codeBlockCount % 2 === 1;

  return {
    content: fullContent,
    isInCodeBlock,
  };
}
