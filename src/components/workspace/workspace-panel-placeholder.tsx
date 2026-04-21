'use client';

export function WorkspacePanelPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6">
      <div className="text-sm font-semibold text-foreground mb-2">{title}</div>
      <div className="text-xs max-w-[260px] leading-relaxed">{description}</div>
    </div>
  );
}

