import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DashboardQuickLink({
  href,
  icon: Icon,
  label,
  highlight = false,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href}>
      <Button
        variant="outline"
        className={`w-full justify-start group/btn ${highlight ? 'border-purple/30' : ''}`}
      >
        <Icon
          className={`mr-2 h-4 w-4 transition-transform group-hover/btn:scale-110 ${highlight ? 'text-purple' : ''}`}
        />
        <span className="flex-1 text-left">{label}</span>
        <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
      </Button>
    </Link>
  );
}

