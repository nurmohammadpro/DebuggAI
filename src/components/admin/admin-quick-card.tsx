import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function AdminQuickCard({
  href,
  icon: Icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colors = {
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green:
      'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple:
      'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    orange:
      'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  };

  return (
    <Link href={href}>
      <Card className="card-elevated cursor-pointer h-full group">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-lg ${colors[color]} group-hover:scale-110 transition-transform duration-300`}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold group-hover:text-primary transition-colors duration-200">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {description}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

