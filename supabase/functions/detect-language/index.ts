/**
 * Language Detection Edge Function
 *
 * Analyzes code to determine the programming language.
 * Uses syntax patterns and heuristics.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface DetectRequest {
  code: string;
}

interface DetectResponse {
  language: string;
  confidence: number;
  alternatives?: Array<{ language: string; confidence: number }>;
}

// Language patterns for detection
const languagePatterns: Array<{
  language: string;
  patterns: RegExp[];
  keywords: string[];
  extensions: string[];
}> = [
  {
    language: 'typescript',
    patterns: [
      /^\s*(interface|type|enum)\s+\w+/m,
      /^\s*:\s*(string|number|boolean|any|void|never)\b/m,
      /^\s*import\s+.*\s+from\s+['"]/m,
      /^\s*export\s+(default\s+)?(class|function|const|interface|type)/m,
    ],
    keywords: ['interface', 'type', 'enum', 'namespace', 'declare', 'readonly'],
    extensions: ['.ts', '.tsx'],
  },
  {
    language: 'javascript',
    patterns: [
      /^\s*(const|let|var)\s+\w+\s*=/m,
      /^\s*function\s*\w*\s*\(/m,
      /^\s*=>\s*/m,
      /^\s*import\s+.*\s+from\s+['"]/m,
      /^\s*module\.exports/m,
    ],
    keywords: ['const', 'let', 'var', 'function', 'async', 'await', 'require', 'exports'],
    extensions: ['.js', '.jsx', '.mjs'],
  },
  {
    language: 'python',
    patterns: [
      /^\s*(def|class)\s+\w+/m,
      /^\s*from\s+\w+\s+import/m,
      /^\s*print\s*\(/m,
      /^\s*if\s+__name__\s*==\s*['"]__main__['"]/m,
      /^\s*@\w+/m,
    ],
    keywords: ['def', 'class', 'import', 'from', 'as', 'if', 'elif', 'else', 'for', 'while', 'try', 'except'],
    extensions: ['.py'],
  },
  {
    language: 'php',
    patterns: [
      /<\?php/,
      /^\s*\$\w+/m,
      /^\s*(public|private|protected)\s+\s*(function|static)/m,
      /^\s*echo\s+/m,
      /->\s*\w+/,
    ],
    keywords: ['function', 'class', 'public', 'private', 'protected', 'static', 'echo', 'print', 'if', 'else', 'foreach'],
    extensions: ['.php'],
  },
  {
    language: 'go',
    patterns: [
      /^\s*func\s+/m,
      /^\s*package\s+\w+/m,
      /^\s*import\s+\(/m,
      /^\s*var\s+\w+/m,
      /:=\s*/,
    ],
    keywords: ['func', 'package', 'import', 'var', 'const', 'type', 'struct', 'interface', 'go', 'chan', 'select'],
    extensions: ['.go'],
  },
  {
    language: 'ruby',
    patterns: [
      /^\s*(def|class)\s+\w+/m,
      /^\s*require\s+/m,
      /^\s*end\s*$/m,
      /^\s*@[\w]+/m,
      /=>\s*/,
      /^\s*(if|unless|while|until)\s+/m,
    ],
    keywords: ['def', 'class', 'module', 'require', 'include', 'if', 'unless', 'while', 'until', 'end', 'do'],
    extensions: ['.rb'],
  },
  {
    language: 'java',
    patterns: [
      /^\s*public\s+(class|interface|enum)\s+/m,
      /^\s*(private|protected|public)\s+/m,
      /^\s*(static|final|abstract)\s+/m,
      /System\./,
      /@\w+/,
    ],
    keywords: ['class', 'interface', 'extends', 'implements', 'public', 'private', 'protected', 'static', 'final', 'abstract'],
    extensions: ['.java'],
  },
  {
    language: 'csharp',
    patterns: [
      /^\s*using\s+/m,
      /^\s*namespace\s+\w+/m,
      /^\s*(public|private|internal|protected)\s+/m,
      /Console\./,
    ],
    keywords: ['using', 'namespace', 'class', 'interface', 'struct', 'enum', 'public', 'private', 'internal', 'protected'],
    extensions: ['.cs'],
  },
  {
    language: 'rust',
    patterns: [
      /^\s*fn\s+\w+/m,
      /^\s*let\s+mut\s+/m,
      /^\s*impl\s+\w+/m,
      /^\s*use\s+/m,
      /->\s*/,
      /!\s*/,
    ],
    keywords: ['fn', 'let', 'mut', 'const', 'static', 'struct', 'enum', 'impl', 'trait', 'use', 'mod'],
    extensions: ['.rs'],
  },
];

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { code }: DetectRequest = await req.json();

    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Score each language
    const scores: Array<{ language: string; score: number }> = [];

    for (const lang of languagePatterns) {
      let score = 0;

      // Check patterns
      for (const pattern of lang.patterns) {
        if (pattern.test(code)) {
          score += 10;
        }
      }

      // Check keywords (weighted by frequency)
      for (const keyword of lang.keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g');
        const matches = code.match(regex);
        if (matches) {
          score += matches.length * 2;
        }
      }

      if (score > 0) {
        scores.push({ language: lang.language, score });
      }
    }

    // Sort by score (highest first)
    scores.sort((a, b) => b.score - a.score);

    if (scores.length === 0) {
      // No language detected - default to plaintext/unknown
      return new Response(
        JSON.stringify({
          language: 'unknown',
          confidence: 0,
        } as DetectResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate confidence (highest score / total score)
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    const confidence = scores[0].score / totalScore;

    // Build alternatives (lower scored languages)
    const alternatives = scores.slice(1).map((s) => ({
      language: s.language,
      confidence: s.score / totalScore,
    }));

    return new Response(
      JSON.stringify({
        language: scores[0].language,
        confidence: Math.min(confidence, 1),
        alternatives: alternatives.length > 0 ? alternatives : undefined,
      } as DetectResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Language detection error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
