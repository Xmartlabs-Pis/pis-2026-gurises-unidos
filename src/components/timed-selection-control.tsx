'use client';

import { Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TimedSelectionControl({
  isPaused,
  onToggle,
  label,
}: {
  isPaused: boolean;
  onToggle: () => void;
  label: string;
}) {
  const Icon = isPaused ? Play : Pause;
  const action = `${isPaused ? 'Reanudar' : 'Pausar'} rotación de ${label}`;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={action}
      aria-pressed={isPaused}
      title={action}
      onClick={onToggle}
      className="text-foreground pointer-events-auto shrink-0 bg-white"
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}
