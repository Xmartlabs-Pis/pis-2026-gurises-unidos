import { useState, type ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

type Attempt = {
  to: string;
  type: 'push' | 'replace' | 'refresh' | 'popstate' | 'beforeunload';
};

const navigation = vi.hoisted(() => ({
  enabled: (() => false) as (attempt: Attempt) => boolean,
  confirm: () => Promise.resolve(true),
}));

vi.unmock('@/components/ui/forms/pending-changes-provider');

vi.mock('next/navigation', () => ({
  usePathname: () => '/management/users/1/edit',
}));

vi.mock('nextjs-nav-guard', () => ({
  NavigationGuardProvider: ({ children }: { children: ReactNode }) => children,
  useNavigationGuard: (options: typeof navigation) => {
    Object.assign(navigation, options);
  },
}));

import {
  PendingChangesProvider,
  usePendingChanges,
  usePendingChangesContext,
} from '@/components/ui/forms/pending-changes-provider';

function Editor({ save, onLeave }: { save: () => Promise<boolean>; onLeave: () => void }) {
  const [dirty, setDirty] = useState(false);
  const { confirmLeave } = usePendingChangesContext();

  usePendingChanges({
    hasUnsavedChanges: dirty,
    isSaving: false,
    onSave: async () => {
      const saved = await save();
      if (saved) setDirty(false);
      return saved;
    },
  });

  function navigate() {
    if (!navigation.enabled({ to: '/dashboard', type: 'push' })) {
      onLeave();
      return;
    }

    void navigation.confirm().then((accepted) => {
      if (accepted) onLeave();
    });
  }

  return (
    <>
      <button onClick={() => setDirty(true)}>Edit</button>
      <button onClick={navigate}>Navigate</button>
      <button
        onClick={() => {
          void confirmLeave().then((accepted) => {
            if (accepted) onLeave();
          });
        }}
      >
        Logout
      </button>
      <output>{dirty ? 'dirty' : 'clean'}</output>
    </>
  );
}

function setup(save = vi.fn(async () => true)) {
  const onLeave = vi.fn();

  render(
    <PendingChangesProvider>
      <Editor save={save} onLeave={onLeave} />
    </PendingChangesProvider>
  );

  return { save, onLeave };
}

test('leaves without confirmation when there are no changes', () => {
  const { onLeave } = setup();

  fireEvent.click(screen.getByText('Navigate'));

  expect(onLeave).toHaveBeenCalledOnce();
  expect(screen.queryByRole('alertdialog')).toBeNull();
});

test.each(['Seguir editando', 'Salir sin guardar'])('%s does not save', async (label) => {
  const { save, onLeave } = setup();

  fireEvent.click(screen.getByText('Edit'));
  fireEvent.click(screen.getByText('Navigate'));
  fireEvent.click(await screen.findByRole('button', { name: label }));

  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());

  expect(save).not.toHaveBeenCalled();
  expect(onLeave).toHaveBeenCalledTimes(label === 'Salir sin guardar' ? 1 : 0);
});

test.each(['Navigate', 'Logout'])('saves before allowing %s', async (action) => {
  const { save, onLeave } = setup();

  fireEvent.click(screen.getByText('Edit'));
  fireEvent.click(screen.getByText(action));
  fireEvent.click(await screen.findByRole('button', { name: 'Guardar y salir' }));

  await waitFor(() => expect(onLeave).toHaveBeenCalledOnce());

  expect(save).toHaveBeenCalledOnce();
  expect(screen.getByText('clean')).toBeDefined();
});

test('keeps changes and cancels the exit when saving fails', async () => {
  const { onLeave } = setup(vi.fn(async () => false));

  fireEvent.click(screen.getByText('Edit'));
  fireEvent.click(screen.getByText('Navigate'));
  fireEvent.click(await screen.findByRole('button', { name: 'Guardar y salir' }));

  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());

  expect(onLeave).not.toHaveBeenCalled();
  expect(screen.getByText('dirty')).toBeDefined();
});

test('allows preview changes and refresh while protecting page unload', () => {
  setup();
  fireEvent.click(screen.getByText('Edit'));

  expect(navigation.enabled({ to: '/management/users/1/edit?year=2025', type: 'push' })).toBe(
    false
  );
  expect(navigation.enabled({ to: '/dashboard', type: 'refresh' })).toBe(false);
  expect(navigation.enabled({ to: '', type: 'beforeunload' })).toBe(true);
});
