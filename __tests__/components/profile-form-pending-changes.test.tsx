import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import type { ProfileFormState } from '@/lib/validation/profile';

type Attempt = {
  to: string;
  type: 'push' | 'replace' | 'refresh' | 'popstate' | 'beforeunload';
};

const { navigation, leaveMock } = vi.hoisted(() => ({
  navigation: {
    enabled: (() => false) as (attempt: Attempt) => boolean,
    confirm: () => Promise.resolve(true),
  },
  leaveMock: vi.fn(),
}));

vi.unmock('@/components/ui/forms/pending-changes-provider');

vi.mock('next/navigation', () => ({
  usePathname: () => '/management/profile',
  unstable_rethrow: () => {},
  useRouter: () => ({
    back: () => {
      if (!navigation.enabled({ to: '/dashboard', type: 'popstate' })) {
        leaveMock();
        return;
      }
      void navigation.confirm().then((accepted) => {
        if (accepted) leaveMock();
      });
    },
  }),
}));

vi.mock('nextjs-nav-guard', () => ({
  NavigationGuardProvider: ({ children }: { children: ReactNode }) => children,
  useNavigationGuard: (options: typeof navigation) => {
    Object.assign(navigation, options);
  },
}));

vi.mock('@/app/actions/profile', () => ({ updateProfile: vi.fn() }));
vi.mock('@/components/users/change-password-form', () => ({ ChangePasswordForm: () => null }));
vi.mock('@/lib/notify', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

import { updateProfile } from '@/app/actions/profile';
import { ProfileForm } from '@/components/profile-form';
import { PendingChangesProvider } from '@/components/ui/forms/pending-changes-provider';

const PROFILE = {
  firstName: 'Ana',
  lastName: 'García',
  documentId: '41234567',
  email: 'ana@example.com',
  role: 'coordinator' as const,
  status: 'active' as const,
  createdAt: new Date('2026-01-01T12:00:00.000Z'),
  lastAccess: null,
  updatedAt: null,
};

const SAVED_RESULT: ProfileFormState = {
  success: true,
  values: { firstName: 'María', lastName: 'García', email: 'ana@example.com' },
};

beforeEach(() => {
  leaveMock.mockReset();
  vi.mocked(updateProfile).mockReset().mockResolvedValue(SAVED_RESULT);
  render(
    <PendingChangesProvider>
      <ProfileForm profile={PROFILE} />
    </PendingChangesProvider>
  );
});

function editName(value = 'María') {
  fireEvent.change(screen.getByRole('textbox', { name: 'Nombre' }), {
    target: { value },
  });
}

test('shows pending changes after editing and clears them when the original value is restored', async () => {
  expect(screen.queryByText('Cambios sin guardar')).toBeNull();
  editName();
  expect(await screen.findByText('Cambios sin guardar')).toBeDefined();
  editName('Ana');
  await waitFor(() => expect(screen.queryByText('Cambios sin guardar')).toBeNull());
});

test('leaves directly when the profile is unchanged', () => {
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(leaveMock).toHaveBeenCalledOnce();
  expect(screen.queryByRole('alertdialog')).toBeNull();
});

test.each([
  ['Seguir editando', 0],
  ['Salir sin guardar', 1],
] as const)('%s resolves the exit without saving', async (label, exits) => {
  editName();
  await screen.findByText('Cambios sin guardar');
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  fireEvent.click(await screen.findByRole('button', { name: label }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  expect(leaveMock).toHaveBeenCalledTimes(exits);
  expect(updateProfile).not.toHaveBeenCalled();
  expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveProperty('value', 'María');
});

test('waits for a successful save before leaving', async () => {
  let finishSave!: (result: ProfileFormState) => void;
  vi.mocked(updateProfile).mockImplementationOnce(
    () =>
      new Promise<ProfileFormState>((resolve) => {
        finishSave = resolve;
      })
  );
  editName();
  await screen.findByText('Cambios sin guardar');
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Guardar y salir' }));
  await waitFor(() => expect(updateProfile).toHaveBeenCalledOnce());
  expect(leaveMock).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Guardando…' })).toHaveProperty('disabled', true);
  await act(async () => {
    finishSave(SAVED_RESULT);
  });
  await waitFor(() => expect(leaveMock).toHaveBeenCalledOnce());
  expect(screen.queryByText('Cambios sin guardar')).toBeNull();
  const data = vi.mocked(updateProfile).mock.calls[0][1];
  expect(data.get('firstName')).toBe('María');
});

test('keeps pending changes and stays on the form when saving fails', async () => {
  vi.mocked(updateProfile).mockResolvedValueOnce({ formError: 'Save failed' });
  editName();
  await screen.findByText('Cambios sin guardar');
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Guardar y salir' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  expect(leaveMock).not.toHaveBeenCalled();
  expect(screen.getByText('Cambios sin guardar')).toBeDefined();
});

test('blocks save and leave when the profile has invalid values', async () => {
  editName('');
  await screen.findByText('Cambios sin guardar');
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Guardar y salir' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  expect(screen.getByText('El nombre es obligatorio.')).toBeDefined();
  expect(updateProfile).not.toHaveBeenCalled();
  expect(leaveMock).not.toHaveBeenCalled();
  expect(screen.getByText('Cambios sin guardar')).toBeDefined();
});

test('normal saving clears pending changes and stays on the profile', async () => {
  editName();
  await screen.findByText('Cambios sin guardar');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(updateProfile).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.queryByText('Cambios sin guardar')).toBeNull());
  expect(leaveMock).not.toHaveBeenCalled();
});
