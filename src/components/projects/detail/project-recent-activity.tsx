const RECENT_ACTIVITIES = [
  {
    date: '22 May 2026',
    name: 'Taller de convivencia grupal',
    type: 'Taller',
    beneficiaries: 32,
    responsible: 'Ana García',
  },
  {
    date: '18 May 2026',
    name: 'Visita familiar domiciliaria',
    type: 'Visita',
    beneficiaries: 8,
    responsible: 'Carlos Méndez',
  },
  {
    date: '12 May 2026',
    name: 'Actividad territorial lúdica',
    type: 'Territorial',
    beneficiaries: 45,
    responsible: 'Ana García',
  },
  {
    date: '05 May 2026',
    name: 'Encuentro comunitario mensual',
    type: 'Comunidad',
    beneficiaries: 67,
    responsible: 'Laura Pérez',
  },
  {
    date: '28 Abr 2026',
    name: 'Articulación con escuela pública',
    type: 'Institucional',
    beneficiaries: 22,
    responsible: 'Carlos Méndez',
  },
] as const;

export function ProjectRecentActivity() {
  return (
    <section
      aria-labelledby="recent-activity-title"
      hidden
      className="md:border-border md:bg-card md:overflow-hidden md:rounded-[14px] md:border"
    >
      <div className="flex items-center justify-between gap-4 md:px-5 md:py-4">
        <h2 id="recent-activity-title" className="text-base font-semibold md:text-sm">
          Actividad reciente
        </h2>
        <span className="text-text-accent text-sm font-medium">Ver todo →</span>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-surface-subtle text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-5 py-3 font-medium">Fecha</th>
              <th className="px-5 py-3 font-medium">Actividad</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Beneficiarios</th>
              <th className="px-5 py-3 font-medium">Responsable</th>
            </tr>
          </thead>
          <tbody>
            {RECENT_ACTIVITIES.map((activity) => (
              <tr key={`${activity.date}-${activity.name}`} className="border-border border-t">
                <td className="text-muted-foreground px-5 py-3 whitespace-nowrap">
                  {activity.date}
                </td>
                <td className="px-5 py-3 font-medium">{activity.name}</td>
                <td className="text-muted-foreground px-5 py-3">{activity.type}</td>
                <td className="px-5 py-3 tabular-nums">{activity.beneficiaries}</td>
                <td className="text-muted-foreground px-5 py-3 whitespace-nowrap">
                  {activity.responsible}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-3 space-y-2.5 md:hidden">
        {RECENT_ACTIVITIES.slice(0, 4).map((activity) => (
          <li
            key={`${activity.date}-${activity.name}`}
            className="border-border bg-card rounded-xl border px-3 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <time className="text-muted-foreground text-xs">{activity.date}</time>
              <span className="bg-surface-subtle rounded-full px-3 py-1 text-xs">
                {activity.type}
              </span>
            </div>
            <p className="mt-1.5 text-sm font-medium">{activity.name}</p>
            <div className="text-muted-foreground mt-2 flex items-center justify-between gap-3 text-xs">
              <span>{activity.responsible}</span>
              <span className="text-foreground whitespace-nowrap">
                {activity.beneficiaries} beneficiarios
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
