/**
 * Skills Retrieval — Load .claude/skills/*.md and inject top-k into prompt.
 *
 * Simple keyword-matching approach: score each skill against the user prompt
 * and inject the top matches. Can be upgraded to embeddings later.
 */

import fs from 'fs';
import path from 'path';

export interface Skill {
  name: string;
  content: string;
  score: number;
}

const SKILLS_DIR = path.join(process.cwd(), '.claude', 'skills');

// Cache skills in memory so we don't re-read disk on every turn
let _skillsCache: Array<{ name: string; content: string }> | null = null;

function loadSkills(): Array<{ name: string; content: string }> {
  if (_skillsCache) return _skillsCache;
  try {
    const entries = fs.readdirSync(SKILLS_DIR);
    _skillsCache = entries
      .filter((f) => f.endsWith('.md'))
      .map((f) => {
        const name = f.replace(/\.md$/, '');
        const content = fs.readFileSync(path.join(SKILLS_DIR, f), 'utf-8');
        return { name, content };
      });
  } catch {
    _skillsCache = [];
  }
  return _skillsCache;
}

/**
 * Score and inject skills relevant to the current prompt.
 * @param prompt — User's current message
 * @param maxSkills — Maximum skills to inject
 * @param maxChars — Maximum characters of skill content to inject
 */
export function getRelevantSkills(
  prompt: string,
  maxSkills = 2,
  maxChars = 800,
  stackHints?: string[],
): string {
  const skills = loadSkills();
  if (!skills.length) return '';

  const lower = prompt.toLowerCase();

  const domainTerms: [string, number, string[]][] = [
    ['next.js', 4, ['next.js', 'nextjs', 'app router', 'server component', 'layout.tsx', 'page.tsx']],
    ['react', 4, ['react', 'jsx', 'tsx', 'component', 'hook', 'usestate', 'useeffect']],
    ['tailwind', 3, ['tailwind', 'css', 'utility class', 'responsive', 'grid', 'flex', 'dark mode']],
    ['typescript', 2, ['typescript', 'type', 'interface', 'generic']],
    ['supabase', 4, ['supabase', 'auth', 'row level', 'postgres', 'realtime', 'storage']],
    ['api', 3, ['api', 'endpoint', 'rest', 'fetch', 'route handler', 'cors']],
    ['database', 3, ['database', 'sql', 'query', 'migration', 'schema']],
    ['deploy', 2, ['deploy', 'production', 'build', 'docker', 'vercel']],
    ['security', 2, ['security', 'auth', 'encrypt', 'jwt', 'csrf', 'xss']],
    ['ui-polish', 3, ['polish', 'animation', 'transition', 'hover', 'responsive', 'spacing', 'layout']],
    ['debug', 3, ['debug', 'error', 'fix', 'bug', 'broken', 'crash', 'type error']],
    ['payment', 2, ['payment', 'stripe', 'checkout', 'subscription']],
  ];

  const scored: Skill[] = skills.map((s) => {
    const skillLower = (s.name + ' ' + s.content).toLowerCase();
    let score = 0;
    for (const kw of s.name.split(/[-_]/)) {
      if (lower.includes(kw)) score += 3;
      if (skillLower.includes(kw)) score += 1;
    }
    for (const [, weight, terms] of domainTerms) {
      for (const t of terms) {
        if (lower.includes(t) && skillLower.includes(t)) { score += weight; break; }
      }
    }
    if (stackHints) {
      for (const hint of stackHints) {
        if (skillLower.includes(hint.toLowerCase())) score += 2;
      }
    }
    return { ...s, score };
  });

  const top = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSkills);

  if (!top.length) return '';

  return '\n\n## Relevant project knowledge\n\n' +
    top
      .map((s) => {
        const excerpt = s.content.slice(0, maxChars);
        return `### ${s.name}\n${excerpt}${s.content.length > maxChars ? '\n...(truncated)' : ''}`;
      })
      .join('\n\n');
}
