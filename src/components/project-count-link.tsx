import Link from 'next/link';

type ProjectCountLinkProps = {
  projectCount: number;
  href: string;
};

export function ProjectCountLink({ projectCount, href }: ProjectCountLinkProps) {
  const label = projectCount === 1 ? '1 proyecto' : `${projectCount} proyectos`;

  if (projectCount === 0) {
    return <span className="text-muted-foreground text-xs leading-4 font-normal">{label}</span>;
  }

  return (
    <Link
      href={href}
      className="text-primary text-xs leading-4 font-normal underline-offset-4 hover:underline"
    >
      {label}
    </Link>
  );
}
