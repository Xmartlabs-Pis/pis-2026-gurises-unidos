import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

vi.mock('@/app/actions/profile', () => ({ updateProfile: vi.fn() }));
vi.mock('@/app/actions/password', () => ({ changePassword: vi.fn() }));

const { routerBackMock, routerReplaceMock } = vi.hoisted(() => ({
  routerBackMock: vi.fn(),
  routerReplaceMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: routerBackMock, replace: routerReplaceMock }),
}));

import { ProfileForm } from '@/components/profile-form';

const PROFILE = {
  firstName: 'Ana',
  lastName: 'García',
  documentId: '41234567',
  email: 'ana@example.com',
  role: 'coordinator' as const,
  status: 'active' as const,
  createdAt: new Date('2026-01-01T12:00:00.000Z'),
  lastAccess: new Date('2026-01-02T12:00:00.000Z'),
  updatedAt: new Date('2026-01-03T12:00:00.000Z'),
};

describe('ProfileForm', () => {
  test('prefills the editable personal data', () => {
    render(<ProfileForm profile={PROFILE} />);

    expect((screen.getByRole('textbox', { name: 'Nombre' }) as HTMLInputElement).value).toBe('Ana');
    expect((screen.getByRole('textbox', { name: 'Apellido' }) as HTMLInputElement).value).toBe(
      'García'
    );
    expect(
      (screen.getByRole('textbox', { name: 'Correo electrónico' }) as HTMLInputElement).value
    ).toBe('ana@example.com');
  });

  test('shows account data without exposing editable role, status, document, or password fields', () => {
    const { container } = render(<ProfileForm profile={PROFILE} />);
    const documentInput = screen.getByRole('textbox', {
      name: 'Documento (Cédula)',
    }) as HTMLInputElement;

    expect(documentInput.value).toBe('41234567');
    expect(documentInput.readOnly).toBe(true);
    expect(documentInput.hasAttribute('name')).toBe(false);
    expect(screen.getByText('Coordinador')).toBeDefined();
    expect(screen.getByText('Activo')).toBeDefined();
    expect(container.querySelector('[name="role"]')).toBeNull();
    expect(container.querySelector('[name="status"]')).toBeNull();
    expect(container.querySelector('[name="password"]')).toBeNull();
  });

  test('formats account dates and absent values', () => {
    render(<ProfileForm profile={{ ...PROFILE, lastAccess: null }} />);

    expect(screen.getByText('01/01/2026')).toBeDefined();
    expect(screen.getByText('Nunca')).toBeDefined();
    expect(screen.getByText('03/01/2026')).toBeDefined();
  });

  test('blocks submission and displays client validation errors', async () => {
    render(<ProfileForm profile={PROFILE} />);
    const firstNameInput = screen.getByRole('textbox', { name: 'Nombre' });
    const emailInput = screen.getByRole('textbox', { name: 'Correo electrónico' });
    const submitButton = screen.getByRole('button', { name: 'Guardar cambios' });

    fireEvent.change(firstNameInput, { target: { value: '' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    await act(async () => {
      fireEvent.submit((submitButton as HTMLButtonElement).form!);
    });

    await waitFor(() => {
      expect(screen.getByText('El nombre es obligatorio.')).toBeDefined();
      expect(screen.getByText('Ingresá un correo electrónico válido.')).toBeDefined();
    });
  });

  test('navigates back when canceled', () => {
    render(<ProfileForm profile={PROFILE} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(routerBackMock).toHaveBeenCalledOnce();
  });
});
