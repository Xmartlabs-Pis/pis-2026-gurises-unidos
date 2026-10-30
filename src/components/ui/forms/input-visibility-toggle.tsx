import { EyeIcon, EyeOffIcon } from 'lucide-react';

export default function InputVisibilityToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="px-2 py-1"
      type="button"
      aria-label={visible ? 'Ocultar texto' : 'Mostrar texto'}
      aria-pressed={visible}
    >
      {visible ? (
        <EyeIcon
          strokeWidth={1}
          className="text-primary md:text-muted-foreground h-6 w-6 lg:h-4.5 lg:w-4.5"
        />
      ) : (
        <EyeOffIcon
          strokeWidth={1}
          className="text-primary lg:text-muted-foreground h-6 w-6 lg:h-4.5 lg:w-4.5"
        />
      )}
    </button>
  );
}
