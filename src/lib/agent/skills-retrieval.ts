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
): string {
  const skills = loadSkills();
  if (!skills.length) return '';

  const lower = prompt.toLowerCase();

  // Score each skill by keyword overlap
  const scored: Skill[] = skills.map((s) => {
    const skillLower = (s.name + ' ' + s.content).toLowerCase();
    const keywords = s.name.split(/[-_]/);
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 3;
      if (skillLower.includes(kw)) score += 1;
    }
    // Also check full content for relevant terms
    const terms = ['next.js', 'react', 'tailwind', 'css', 'typescript', 'supabase', 'api', 'database', 'deploy', 'security', 'ui', 'polish', 'debug', 'payment', 'migrate'];
    for (const t of terms) {
      if (lower.includes(t) && skillLower.includes(t)) score += 2;
    }
    return { ...s, score };
  });

  // Sort by score descending, take top matches
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
