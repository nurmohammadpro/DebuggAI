/**
 * Code Extraction Utility
 *
 * Extracts code blocks and file trees from AI markdown responses.
 * Supports:
 * - Single code fences (```tsx ... ```)
 * - File markers with fences (// File: app/page.tsx ```tsx ... ```)
 * - Multiple files with split-by-marker format
 */

const FILE_MARKER_REGEX = /^\s*(?:\/\/|#)\s*File:\s*([\w./-]+\.[a-zA-Z0-9]+)\s*$/im;
const FENCE_REGEX = /```(\w*)\n([\s\S]*?)```/g;
const FENCE_WITH_FILENAME = /```(\w*)\n([\s\S]*?)```/;

/**
 * Extract code from markdown response
 * Tries multiple patterns in order: tsx, jsx, typescript, any code fence
 *
 * @param markdown - AI response text with markdown code blocks
 * @returns Extracted code or null if no code found
 */
export function extractCode(markdown: string): string | null {
  // Pattern priorities: most specific to least specific
  const patterns = [
    // TSX with language tag
    /```tsx\n([\s\S]*?)```/,
    // JSX with language tag
    /```jsx\n([\s\S]*?)```/,
    // TypeScript with language tag
    /```typescript\n([\s\S]*?)```/,
    // TypeScript with ts tag
    /```ts\n([\s\S]*?)```/,
    // JavaScript with language tag
    /```javascript\n([\s\S]*?)```/,
    // JavaScript with js tag
    /```js\n([\s\S]*?)```/,
    // Any code fence with language
    /```[a-z]*\n([\s\S]*?)```/,
    // Generic code fence (no language)
    /```\n([\s\S]*?)```/,
  ];

  for (const pattern of patterns) {
    const match = markdown.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  // Last resort: if the whole response looks like a component, use it as-is
  if (
    markdown.includes('export default') &&
    (markdown.includes('return (') || markdown.includes('return <'))
  ) {
    return markdown.trim();
  }

  // Another fallback: look for anything that looks like a function/class
  if (
    (markdown.includes('function ') || markdown.includes('const ') || markdown.includes('class ')) &&
    markdown.includes('{') &&
    markdown.includes('}')
  ) {
    return markdown.trim();
  }

  return null;
}

/**
 * Extract multiple code blocks from markdown
 * Useful for responses with multiple code examples
 *
 * @param markdown - AI response text with multiple code blocks
 * @returns Array of extracted code blocks
 */
export function extractMultipleCodes(markdown: string): string[] {
  const codes: string[] = [];
  const pattern = /```(?:tsx|jsx|typescript|ts|javascript|js|[a-z]*)\n([\s\S]*?)```/g;

  let match;
  while ((match = pattern.exec(markdown)) !== null) {
    if (match[1]) {
      codes.push(match[1].trim());
    }
  }

  return codes;
}

/**
 * Extract files with their paths from AI markdown that uses file markers.
 *
 * Handles two formats:
 * 1. File marker comment before/inside a code fence:
 *    // File: app/page.tsx
 *    ```tsx
 *    ...code...
 *    ```
 *
 * 2. File header markers with plain code (no fences):
 *    // File: app/page.tsx
 *    const Component = () => { ... };
 *
 * 3. Standalone code fences (assigned a generated name based on content)
 *
 * @param markdown - AI response text with file markers and code blocks
 * @returns Array of { path, content, language } objects
 */
export function extractFilesFromMarkdown(
  markdown: string
): Array<{ path: string; content: string; language?: string }> {
  const files: Array<{ path: string; content: string; language?: string }> = [];
  const seen = new Set<string>();

  // Split the markdown into chunks at each file marker boundary
  const lines = markdown.split('\n');
  let currentPath: string | null = null;
  let currentLines: string[] = [];
  let inFence = false;
  let fenceEndIdx = 0;

  const flush = () => {
    if (!currentPath) {
      if (currentLines.length > 0) {
        // No path assigned — check if it's a code block
        const content = currentLines.join('\n').trim();
        if (content) {
          const path = generateFilePath(content, seen);
          if (path && !seen.has(path)) {
            seen.add(path);
            files.push({ path, content, language: languageFromExt(path) });
          }
        }
      }
      return;
    }
    const normalized = currentPath.replace(/^(\.\/)+/, '').replace(/\\/g, '/');
    if (seen.has(normalized)) return;
    const content = currentLines.join('\n').trim();
    if (!content) return;
    seen.add(normalized);
    files.push({
      path: normalized,
      // Avoid the RegExp dotAll (/s) flag to keep TS target compatibility.
      content: content.replace(/^```\w*\n([\s\S]*)```$/, '$1').trim(),
      language: languageFromExt(normalized),
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track fence open/close to handle code inside fences
    if (/^```/.test(line)) {
      if (!inFence) {
        inFence = true;
        fenceEndIdx = i;
      } else {
        inFence = false;
      }
    }

    // Check for file marker (e.g. "// File: app/page.tsx" or "# File: app.py")
    const markerMatch = line.match(FILE_MARKER_REGEX);
    if (markerMatch) {
      flush();
      currentPath = markerMatch[1];
      currentLines = [];
      continue;
    }

    currentLines.push(line);
  }

  flush();

  // Fallback: if no files were found via markers, try extracting from fences
  if (files.length === 0) {
    for (const [_, lang, code] of markdown.matchAll(FENCE_REGEX)) {
      const trimmed = code.trim();
      if (!trimmed) continue;

      // Check if first line of code is a file marker comment
      const firstLine = trimmed.split('\n')[0] || '';
      const inlineMarker = firstLine.match(FILE_MARKER_REGEX);
      const path = inlineMarker?.[1] || generateFilePath(trimmed, seen);

      if (!seen.has(path)) {
        seen.add(path);
        const content = inlineMarker
          ? trimmed.split('\n').slice(1).join('\n').trim()
          : trimmed;
        files.push({ path, content, language: lang || lang || languageFromExt(path) });
      }
    }
  }

  return files;
}

function generateFilePath(code: string, seen: Set<string>): string {
  // Heuristic: if it looks like a React component, use a sensible name
  const compMatch = code.match(/(?:export\s+)?(?:default\s+)?function\s+(\w+)/);
  const constMatch = code.match(/const\s+(\w+)/);
  const name = compMatch?.[1] || constMatch?.[1] || 'index';

  // Determine extension
  const ext = code.includes('React') || /=>\s*</.test(code) || /render\s*\(/.test(code)
    ? '.tsx'
    : code.includes('export default') || code.includes('module.exports')
      ? '.js'
      : code.includes(':') && !code.includes('=>')
        ? '.ts'
        : '.tsx';

  // Avoid collisions
  let path = `components/${name}${ext}`;
  if (seen.has(path)) {
    let i = 2;
    while (seen.has(path.replace(/[/]/, `/${name}${i}`))) i++;
    path = `components/${name}${i}${ext}`;
  }

  return path;
}

function languageFromExt(path: string): string | undefined {
  const lower = path.toLowerCase();
  if (lower.endsWith('.tsx')) return 'typescript';
  if (lower.endsWith('.ts')) return 'typescript';
  if (lower.endsWith('.jsx')) return 'javascript';
  if (lower.endsWith('.js')) return 'javascript';
  if (lower.endsWith('.css')) return 'css';
  if (lower.endsWith('.html')) return 'html';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.md')) return 'markdown';
  if (lower.endsWith('.py')) return 'python';
  if (lower.endsWith('.rb')) return 'ruby';
  if (lower.endsWith('.go')) return 'go';
  if (lower.endsWith('.php')) return 'php';
  return undefined;
}

/**
 * Extract language from code fence
 *
 * @param markdown - AI response text with code blocks
 * @returns Language name or null
 */
export function extractLanguage(markdown: string): string | null {
  const pattern = /```([a-z+A-Z#]*)\n/;
  const match = markdown.match(pattern);
  return match?.[1] || null;
}

/**
 * Check if markdown contains a code block
 *
 * @param markdown - Text to check
 * @returns True if code block is present
 */
export function hasCodeBlock(markdown: string): boolean {
  return /```(?:\w*)\n[\s\S]*?```/.test(markdown);
}
