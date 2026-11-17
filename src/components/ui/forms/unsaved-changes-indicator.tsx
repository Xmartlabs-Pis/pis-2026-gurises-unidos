export function UnsavedChangesIndicator({ visible }: { visible: boolean }) {
  return (
    <span role="status" aria-live="polite" className="text-muted-foreground text-sm">
      {visible && (
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full bg-amber-500" />
          Cambios sin guardar
        </span>
      )}
    </span>
  );
}
