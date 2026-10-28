import type { ProjectDetail } from '@/lib/projects/detail';

type ProjectInformationProps = Pick<
  ProjectDetail['project'],
  'publicDescription' | 'internalNotes'
>;

export function ProjectInformation({ publicDescription, internalNotes }: ProjectInformationProps) {
  const sections = [
    {
      id: 'project-public-description',
      title: 'Descripción pública',
      content: publicDescription,
      emptyMessage: 'Este proyecto todavía no tiene una descripción pública.',
    },
    {
      id: 'project-internal-notes',
      title: 'Notas internas',
      content: internalNotes,
      emptyMessage: 'Este proyecto todavía no tiene notas internas.',
    },
  ];

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      {sections.map(({ id, title, content, emptyMessage }) => (
        <section
          key={id}
          aria-labelledby={id}
          className="border-border bg-card min-w-0 rounded-[14px] border p-4 sm:p-5"
        >
          <h2 id={id} className="text-sm font-semibold">
            {title}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-5 [overflow-wrap:anywhere] whitespace-pre-wrap">
            {content?.trim() ? content : emptyMessage}
          </p>
        </section>
      ))}
    </div>
  );
}
