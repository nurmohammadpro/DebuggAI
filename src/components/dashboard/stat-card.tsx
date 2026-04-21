import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DashboardStatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  color: 'red' | 'blue' | 'green' | 'amber' | 'purple';
}) {
  const colors: Record<string, string> = {
    red: 'var(--ds-red)',
    blue: 'var(--ds-blue)',
    green: 'var(--ds-green)',
    amber: 'var(--ds-amber)',
    purple: 'var(--ds-purple)',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-text3">{title}</CardTitle>
          <div
            className="p-2 rounded-ds"
            style={{ background: `${colors[color]}15`, transition: 'transform 150ms' }}
          >
            <Icon className="h-4 w-4" style={{ color: colors[color] }} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="stat" style={{ color: colors[color] }}>
          {value}
        </div>
        <p className="text-xs text-text3 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

