import { cn } from 'cn';

interface Props {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, className }: Props) {
  return (
    <header className={cn('flex flex-col gap-1.5', className)}>
      <p className="text-muted-foreground text-sm leading-5 font-normal tracking-normal">
        {eyebrow}
      </p>
      <h1 className="text-popover-foreground text-3xl leading-9 font-bold tracking-normal">
        {title}
      </h1>
      <p className="text-muted-foreground text-sm leading-4.5 font-normal tracking-normal">
        {description}
      </p>
    </header>
  );
}
