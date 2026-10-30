export function ProjectYearEmptyState({ year }: { year: number }) {
  return (
    <section className="border-border bg-card rounded-[14px] border px-6 py-10 text-center">
      <h2 className="text-lg font-semibold">Sin datos para {year}</h2>
      <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm leading-5">
        Todavía no hay información de beneficiarios cargada para este proyecto en el período
        seleccionado.
      </p>
    </section>
  );
}
