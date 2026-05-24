/**
 * Schema & API Generation API
 *
 * Generates database schemas and API route code from natural language prompts.
 * Uses structured AI generation with specific output formats.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { withRateLimit } from '@/lib/server/plan-enforcement';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth.errorResponse) return auth.errorResponse;

    const rateLimit = await withRateLimit(auth.user!.id, 'web_builder');
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify(rateLimit.body), {
        status: rateLimit.status,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    const body = await request.json();
    const { prompt, type = 'full', projectId, format = 'supabase' } = body as {
      prompt: string;
      type: 'schema' | 'api' | 'full';
      projectId?: string;
      format: 'supabase' | 'prisma' | 'drizzle' | 'raw';
    };

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Build the generation prompt based on type
    const systemPrompt = `You are DeBuggAI's schema and API generator. Generate production-ready database schemas and API routes based on natural language descriptions.

Rules:
1. Generate complete, working code
2. Follow best practices for the specified format
3. Include proper validation, error handling, and security
4. Add helpful comments
5. Use proper TypeScript types
6. Follow RESTful conventions for APIs
7. Include proper indexes and constraints for database schemas`;

    const userPrompt = buildGenerationPrompt(prompt, type, format);

    // Get AI API credentials
    const apiKey = process.env.AI_API_KEY;
    const baseUrl = process.env.AI_BASE_URL || 'https://api.deepseek.com/v1';
    const model = process.env.AI_MODEL || 'deepseek-chat';

    if (!apiKey) {
      return NextResponse.json(
        {
          code: generateFallbackSchema(prompt, type, format),
          type,
          format,
          warning: 'AI_API_KEY not configured. Using template-based generation.',
        }
      );
    }

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      return NextResponse.json(
        {
          code: generateFallbackSchema(prompt, type, format),
          type,
          format,
          warning: `AI generation failed. Using template-based generation. (${errorText.slice(0, 100)})`,
        }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse the response for structured output
    const parsed = parseGeneratedContent(content, type);

    return NextResponse.json({
      ...parsed,
      type,
      format,
      raw: content,
    });
  } catch (error) {
    console.error('Schema generation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Generation failed',
        code: null,
      },
      { status: 500 }
    );
  }
}

function buildGenerationPrompt(prompt: string, type: string, format: string): string {
  const formatInstructions = format === 'supabase'
    ? 'Use Supabase SQL syntax with PostgreSQL features (RLS policies, triggers, functions).'
    : format === 'prisma'
    ? 'Use Prisma schema syntax with models, enums, and relations.'
    : format === 'drizzle'
    ? 'Use Drizzle ORM schema syntax with drizzle-orm.'
    : 'Use raw SQL (PostgreSQL).';

  if (type === 'schema') {
    return `Generate a complete database schema for the following requirements:

Prompt: "${prompt}"

${formatInstructions}

Include:
1. All necessary tables with proper column types and constraints
2. Primary keys and foreign key relationships
3. Indexes for performance
4. Row Level Security policies (for Supabase)
5. Timestamps (created_at, updated_at)
6. Proper column defaults and nullability

Respond with ONLY the schema code in markdown code blocks.`;
  }

  if (type === 'api') {
    return `Generate a complete API route file for the following requirements:

Prompt: "${prompt}"

${formatInstructions}

Generate Next.js API route(s) using proper request handling:
1. HTTP methods (GET, POST, PUT, PATCH, DELETE)
2. Input validation with Zod or similar
3. Error handling with proper status codes
4. Authentication checks
5. Response formatting
6. TypeScript types

Respond with ONLY the API route code in markdown code blocks.`;
  }

  // Full generation (schema + API)
  return `Generate a complete backend setup for the following requirements:

Prompt: "${prompt}"

${formatInstructions}

Generate:
1. Database schema (all tables, relationships, indexes, RLS)
2. API routes (CRUD endpoints for each resource)
3. Types/interfaces for all data models
4. Seed data (optional but helpful)

Respond with the schema and API code in separate markdown code blocks.`;
}

function parseGeneratedContent(content: string, type: string) {
  const schemaMatch = content.match(/```(?:sql|prisma|typescript|ts)?\n([\s\S]*?)```/g);
  const blocks = schemaMatch?.map((b) => {
    const code = b.replace(/```\w*\n?/, '').replace(/```$/, '').trim();
    const lang = b.match(/```(\w*)/)?.[1] || 'sql';
    return { language: lang, code };
  }) || [];

  const schemaBlock = blocks.find((b) => ['sql', 'prisma'].includes(b.language)) || blocks[0];
  const apiBlock = blocks.find((b) => ['typescript', 'ts', 'javascript'].includes(b.language));

  return {
    schema: schemaBlock?.code || '',
    apiCode: apiBlock?.code || '',
    tables: extractTableNames(schemaBlock?.code || ''),
    endpoints: extractEndpoints(apiBlock?.code || ''),
  };
}

function extractTableNames(schema: string): string[] {
  const tableRegex = /(?:CREATE TABLE|model|table)\s+["']?(\w+)["']?/gi;
  const matches = [...schema.matchAll(tableRegex)];
  return [...new Set(matches.map((m) => m[1]!))];
}

function extractEndpoints(apiCode: string): string[] {
  const endpointRegex = /(?:route|app\.(?:get|post|put|patch|delete)|router\.(?:get|post|put|patch|delete))\s*\(['"]([^'"]+)/gi;
  const matches = [...apiCode.matchAll(endpointRegex)];
  return [...new Set(matches.map((m) => m[1]!))];
}

/**
 * Fallback template generator when AI is unavailable
 */
function generateFallbackSchema(prompt: string, type: string, format: string): string {
  // Extract entity names from prompt
  const words = prompt.toLowerCase().split(/\s+/);
  const entityIdx = words.findIndex((w) => ['app', 'system', 'platform', 'tool', 'service', 'database', 'api'].includes(w));
  const entity = entityIdx >= 0 && entityIdx + 1 < words.length
    ? words[entityIdx + 1]!.replace(/[^a-z0-9]/g, '')
    : 'resource';

  const tableName = entity + 's';
  const pascalName = tableName.charAt(0).toUpperCase() + tableName.slice(1);

  if (format === 'supabase') {
    return `-- Generated schema for: "${prompt}"
-- Auto-generated template - customize as needed

CREATE TABLE IF NOT EXISTS public.${tableName} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_${tableName}_user ON public.${tableName}(user_id);
CREATE INDEX IF NOT EXISTS idx_${tableName}_status ON public.${tableName}(status);
CREATE INDEX IF NOT EXISTS idx_${tableName}_created ON public.${tableName}(created_at DESC);

-- RLS
ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "${tableName}_select_own" ON public.${tableName}
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "${tableName}_insert_own" ON public.${tableName}
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "${tableName}_update_own" ON public.${tableName}
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "${tableName}_delete_own" ON public.${tableName}
  FOR DELETE USING (user_id = auth.uid());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_${tableName}_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_${tableName}_updated_at
  BEFORE UPDATE ON public.${tableName}
  FOR EACH ROW
  EXECUTE FUNCTION public.update_${tableName}_updated_at();
`;
  }

  if (format === 'prisma') {
    return `// Generated Prisma schema for: "${prompt}"
// Auto-generated template - customize as needed

model ${pascalName} {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  name        String
  description String?
  status      String   @default("active")
  metadata    Json     @default("{}")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
  @@index([createdAt])
  @@map("${tableName}")
}

model User {
  id          String   @id @default(uuid())
  email       String   @unique
  name        String?
  ${tableName} ${pascalName}[]

  @@map("profiles")
}
`;
  }

  // Fallback SQL
  return `-- Generated schema for: "${prompt}"
-- PostgreSQL

CREATE TABLE IF NOT EXISTS ${tableName} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_${tableName}_user_id ON ${tableName}(user_id);
CREATE INDEX idx_${tableName}_status ON ${tableName}(status);
CREATE INDEX idx_${tableName}_created_at ON ${tableName}(created_at DESC);
`;
}
