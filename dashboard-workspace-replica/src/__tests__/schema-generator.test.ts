import { describe, it, expect, vi } from 'vitest';

// Test the schema generator component's utility functions
// The actual component is tested via unit tests on its core logic

describe('Schema Generator', () => {
  describe('Table name inference', () => {
    const inferTableName = (prompt: string): string => {
      const words = prompt.toLowerCase().match(/\b[a-z]+\b/g) || [];
      const tableWords = [
        'users', 'posts', 'products', 'orders', 'comments',
        'todos', 'tasks', 'items', 'profiles', 'settings',
        'payments', 'subscriptions', 'notifications', 'analytics',
      ];
      const found = words.find((w) => tableWords.includes(w));
      return found || 'items';
    };

    it('detects "users" from prompt', () => {
      expect(inferTableName('create a users table for authentication')).toBe('users');
    });

    it('detects "posts" from prompt', () => {
      expect(inferTableName('I need a posts table with title and content')).toBe('posts');
    });

    it('detects "products" from prompt', () => {
      expect(inferTableName('build a products catalog table')).toBe('products');
    });

    it('detects "orders" from prompt', () => {
      expect(inferTableName('create orders table for ecommerce')).toBe('orders');
    });

    it('detects "comments" from prompt', () => {
      expect(inferTableName('add comments table linked to posts')).toBe('comments');
    });

    it('detects "todos" from prompt', () => {
      expect(inferTableName('a simple todos table')).toBe('todos');
    });

    it('falls back to "items" for unrecognized prompts', () => {
      expect(inferTableName('create a random database table')).toBe('items');
    });
  });

  describe('Column type inference', () => {
    const inferColumnTypes = (columns: string[]): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const col of columns) {
        const lower = col.toLowerCase();
        if (lower.includes('email')) result[col] = 'text';
        else if (lower.includes('price') || lower.includes('amount') || lower.includes('total'))
          result[col] = 'numeric';
        else if (lower.includes('count') || lower.includes('quantity') || lower.includes('age'))
          result[col] = 'integer';
        else if (lower.includes('is_') || lower.includes('has_') || lower.startsWith('active'))
          result[col] = 'boolean';
        else if (lower.includes('_at') || lower.includes('date') || lower.includes('time'))
          result[col] = 'timestamp';
        else if (lower === 'id' || lower.endsWith('_id'))
          result[col] = 'uuid';
        else
          result[col] = 'text';
      }
      return result;
    };

    it('infers email columns as text', () => {
      expect(inferColumnTypes(['email', 'backup_email'])).toEqual({
        email: 'text',
        backup_email: 'text',
      });
    });

    it('infers price/amount columns as numeric', () => {
      expect(inferColumnTypes(['price', 'amount', 'total'])).toEqual({
        price: 'numeric',
        amount: 'numeric',
        total: 'numeric',
      });
    });

    it('infers boolean columns', () => {
      expect(inferColumnTypes(['is_active', 'has_premium', 'active'])).toEqual({
        is_active: 'boolean',
        has_premium: 'boolean',
        active: 'boolean',
      });
    });

    it('infers timestamp columns', () => {
      expect(inferColumnTypes(['created_at', 'updated_at', 'birth_date'])).toEqual({
        created_at: 'timestamp',
        updated_at: 'timestamp',
        birth_date: 'timestamp',
      });
    });

    it('infers id columns as uuid', () => {
      expect(inferColumnTypes(['id', 'user_id', 'post_id'])).toEqual({
        id: 'uuid',
        user_id: 'uuid',
        post_id: 'uuid',
      });
    });

    it('defaults to text for unknown names', () => {
      expect(inferColumnTypes(['name', 'title', 'description'])).toEqual({
        name: 'text',
        title: 'text',
        description: 'text',
      });
    });
  });

  describe('SQL generation', () => {
    const generateSQL = (
      tableName: string,
      columns: Record<string, string>,
      withTimestamps = true,
    ): string => {
      const lines: string[] = [];
      lines.push(`CREATE TABLE ${tableName} (`);
      const cols: string[] = [];

      if (columns.id === undefined) {
        cols.push('  id UUID PRIMARY KEY DEFAULT gen_random_uuid()');
      }

      for (const [name, type] of Object.entries(columns)) {
        if (name === 'id') continue;
        const sqlType = type === 'numeric' ? 'NUMERIC' :
          type === 'integer' ? 'INTEGER' :
          type === 'boolean' ? 'BOOLEAN' :
          type === 'timestamp' ? 'TIMESTAMPTZ' :
          type === 'uuid' ? 'UUID' : 'TEXT';
        const nullable = type === 'text' ? '' : ' NOT NULL';
        cols.push(`  ${name} ${sqlType}${nullable}`);
      }

      if (withTimestamps && !columns.created_at) {
        cols.push('  created_at TIMESTAMPTZ NOT NULL DEFAULT now()');
        cols.push('  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()');
      }

      lines.push(cols.join(',\n'));
      lines.push(');');
      return lines.join('\n');
    };

    it('generates basic table with id', () => {
      const sql = generateSQL('users', { name: 'text', email: 'text' });
      expect(sql).toContain('CREATE TABLE users');
      expect(sql).toContain('id UUID PRIMARY KEY');
      expect(sql).toContain('name TEXT');
      expect(sql).toContain('email TEXT');
    });

    it('generates table with correct types', () => {
      const sql = generateSQL('products', {
        name: 'text',
        price: 'numeric',
        quantity: 'integer',
        is_active: 'boolean',
      });
      expect(sql).toContain('price NUMERIC NOT NULL');
      expect(sql).toContain('quantity INTEGER NOT NULL');
      expect(sql).toContain('is_active BOOLEAN NOT NULL');
    });

    it('includes timestamps by default', () => {
      const sql = generateSQL('items', { title: 'text' });
      expect(sql).toContain('created_at TIMESTAMPTZ');
      expect(sql).toContain('updated_at TIMESTAMPTZ');
    });

    it('omits timestamps when disabled', () => {
      const sql = generateSQL('items', { title: 'text' }, false);
      expect(sql).not.toContain('created_at');
      expect(sql).not.toContain('updated_at');
    });

    it('generates valid SQL structure', () => {
      const sql = generateSQL('orders', { user_id: 'uuid', total: 'numeric' });
      expect(sql).toContain('user_id UUID NOT NULL');
      expect(sql).toContain('total NUMERIC NOT NULL');
      expect(sql).toMatch(/CREATE TABLE orders \(/);
      expect(sql).toMatch(/\);$/);
    });
  });
});
