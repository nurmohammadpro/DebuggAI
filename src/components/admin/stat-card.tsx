import { Card, CardContent } from '@/components/ui/card';

export function AdminStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
}) {
  return (
    <Card className="group card-elevated">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
          <div
            className={`p-2 rounded-lg bg-gradient-to-br ${gradient} group-hover:scale-110 transition-transform duration-300`}
          >
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        <div
          className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
        >
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

