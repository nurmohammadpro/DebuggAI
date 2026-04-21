'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WEB_BUILDER_STACKS } from '@/lib/constants';

export function ProjectsFilters({
  query,
  onQueryChange,
  stack,
  onStackChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  stack: string;
  onStackChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="sm:col-span-2 space-y-1">
        <Label className="text-xs text-muted-foreground">Search</Label>
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by prompt or description…"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Stack</Label>
        <Select value={stack} onValueChange={(v) => onStackChange(v || 'all')}>
          <SelectTrigger>
            <SelectValue placeholder="All stacks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stacks</SelectItem>
            {WEB_BUILDER_STACKS.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
