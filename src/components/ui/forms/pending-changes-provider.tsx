'use client';

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { NavigationGuardProvider, useNavigationGuard } from 'nextjs-nav-guard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { notify } from '@/lib/notify';

type PendingForm = {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => Promise<boolean>;
  description?: string;
};

type Confirmation = {
  resolve: (accepted: boolean) => void;
  settled: boolean;
};

type PendingChangesContextValue = {
  register: (id: string, form: PendingForm) => void;
  unregister: (id: string) => void;
  confirmLeave: () => Promise<boolean>;
  runWithoutConfirmation: (action: () => void) => void;
};

const PendingChangesContext = createContext<PendingChangesContextValue | null>(null);

function PendingChangesController({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const currentForm = useRef<(PendingForm & { id: string }) | null>(null);
  const confirmation = useRef<Confirmation | null>(null);
  const bypass = useRef(false);
  const saving = useRef(false);
  const [dialog, setDialog] = useState<PendingForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const finish = useCallback((accepted: boolean) => {
    const pending = confirmation.current;
    if (!pending || pending.settled) return;
    pending.settled = true;
    pending.resolve(accepted);
    setDialog(null);
    setIsSaving(false);
    queueMicrotask(() => {
      if (confirmation.current === pending) confirmation.current = null;
    });
  }, []);

  const confirmLeave = useCallback((): Promise<boolean> => {
    if (confirmation.current || saving.current || currentForm.current?.isSaving) {
      return Promise.resolve(false);
    }
    const form = currentForm.current;
    if (!form?.hasUnsavedChanges) return Promise.resolve(true);
    return new Promise((resolve) => {
      confirmation.current = { resolve, settled: false };
      setDialog(form);
    });
  }, []);

  useNavigationGuard({
    enabled: ({ to, type }) => {
      if (bypass.current || !currentForm.current) return false;
      const form = currentForm.current;
      if (type === 'beforeunload') return form.hasUnsavedChanges || form.isSaving;
      if (type === 'refresh') return false;
      const target = new URL(to, window.location.href);
      if (target.origin === window.location.origin && target.pathname === pathname) return false;
      return Boolean(confirmation.current || form.hasUnsavedChanges || form.isSaving);
    },
    confirm: confirmLeave,
  });

  const register = useCallback((id: string, form: PendingForm) => {
    currentForm.current = { ...form, id };
  }, []);

  const unregister = useCallback(
    (id: string) => {
      if (currentForm.current?.id !== id) return;
      currentForm.current = null;
      finish(false);
    },
    [finish]
  );

  const runWithoutConfirmation = useCallback((action: () => void) => {
    bypass.current = true;
    try {
      action();
    } finally {
      bypass.current = false;
    }
  }, []);

  const context = useMemo(
    () => ({ register, unregister, confirmLeave, runWithoutConfirmation }),
    [register, unregister, confirmLeave, runWithoutConfirmation]
  );

  async function saveAndLeave() {
    const pending = confirmation.current;
    if (!pending || pending.settled || saving.current || !dialog) return;
    saving.current = true;
    setIsSaving(true);
    let saved = false;
    try {
      saved = await dialog.onSave();
    } catch {
      notify.error({ title: 'No se pudieron guardar los cambios. Intentá de nuevo.' });
    } finally {
      saving.current = false;
      if (confirmation.current === pending) finish(saved);
    }
  }

  return (
    <PendingChangesContext.Provider value={context}>
      {children}
      <AlertDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open && !saving.current) finish(false);
        }}
      >
        <AlertDialogContent className="sm:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Tenés cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Si salís sin guardar, los cambios pendientes se descartarán.
              {dialog?.description && <span className="mt-2 block">{dialog.description}</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-wrap">
            <AlertDialogCancel disabled={isSaving}>Seguir editando</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => {
                if (!saving.current) finish(true);
              }}
            >
              Salir sin guardar
            </AlertDialogAction>
            <AlertDialogAction type="button" disabled={isSaving} onClick={saveAndLeave}>
              {isSaving ? 'Guardando…' : 'Guardar y salir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PendingChangesContext.Provider>
  );
}

export function PendingChangesProvider({ children }: { children: ReactNode }) {
  return (
    <NavigationGuardProvider>
      <PendingChangesController>{children}</PendingChangesController>
    </NavigationGuardProvider>
  );
}

export function usePendingChangesContext() {
  const context = useContext(PendingChangesContext);
  if (!context) throw new Error('PendingChangesProvider is missing');
  return context;
}

export function usePendingChanges(form: PendingForm) {
  const { register, unregister, runWithoutConfirmation } = usePendingChangesContext();
  const id = useId();

  useLayoutEffect(() => {
    register(id, form);
  });

  useLayoutEffect(() => () => unregister(id), [id, unregister]);

  return { runWithoutConfirmation };
}
