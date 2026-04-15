/**
 * Code Extraction Utility
 *
 * Extracts code blocks from AI markdown responses.
 * Supports multiple languages and formats.
 */

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
