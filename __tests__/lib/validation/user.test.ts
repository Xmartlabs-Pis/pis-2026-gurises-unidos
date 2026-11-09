import { describe, expect, test } from 'vitest';
import { userFormSchema } from '@/lib/validation/user';

const VALID_USER = {
  firstName: 'Ana',
  lastName: 'García',
  documentId: '7.777.777-7',
  email: 'ana@example.com',
  role: 'coordinator',
};

function passwordErrors(password: string | undefined) {
  const result = userFormSchema.safeParse({
    ...VALID_USER,
    creationMethod: 'password',
    password,
  });
  return result.success ? [] : (result.error.flatten().fieldErrors.password ?? []);
}

describe('userFormSchema', () => {
  test('defaults to the invitation method', () => {
    const result = userFormSchema.parse(VALID_USER);

    expect(result.creationMethod).toBe('invitation');
  });

  test('does not require a password for an invitation', () => {
    expect(userFormSchema.safeParse({ ...VALID_USER, creationMethod: 'invitation' }).success).toBe(
      true
    );
    expect(
      userFormSchema.safeParse({ ...VALID_USER, creationMethod: 'invitation', password: '' })
        .success
    ).toBe(true);
  });

  test('ignores an invalid password when the method is an invitation', () => {
    const result = userFormSchema.safeParse({
      ...VALID_USER,
      creationMethod: 'invitation',
      password: 'x',
    });

    expect(result.success).toBe(true);
  });

  test('rejects an unknown creation method', () => {
    const result = userFormSchema.safeParse({ ...VALID_USER, creationMethod: 'magic' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.creationMethod).toBeDefined();
    }
  });

  test('accepts a valid temporary password and normalizes the profile data', () => {
    const result = userFormSchema.parse({
      ...VALID_USER,
      firstName: ' Ana ',
      email: ' ANA@EXAMPLE.COM ',
      creationMethod: 'password',
      password: 'Temporary1',
    });

    expect(result).toMatchObject({
      firstName: 'Ana',
      documentId: '77777777',
      email: 'ana@example.com',
      creationMethod: 'password',
      password: 'Temporary1',
    });
  });

  test.each([
    ['missing', undefined, 'La contraseña es obligatoria.'],
    ['empty', '', 'La contraseña es obligatoria.'],
    ['too short', 'Abc1234', 'La contraseña debe tener al menos 8 caracteres.'],
    [
      'without an uppercase letter',
      'temporary1',
      'La contraseña debe tener al menos una mayúscula.',
    ],
    [
      'without a lowercase letter',
      'TEMPORARY1',
      'La contraseña debe tener al menos una minúscula.',
    ],
    ['without a digit', 'Temporaryy', 'La contraseña debe tener al menos un número.'],
    [
      'longer than 72 characters',
      `Aa1${'x'.repeat(70)}`,
      'La contraseña no puede superar los 72 caracteres.',
    ],
  ])('rejects a password that is %s', (_label, password, message) => {
    expect(passwordErrors(password)).toContain(message);
  });

  test('accepts a password of exactly 8 and exactly 72 characters', () => {
    expect(passwordErrors('Abcdef12')).toEqual([]);
    expect(passwordErrors(`Aa1${'x'.repeat(69)}`)).toEqual([]);
  });

  test('reports password errors alongside profile errors', () => {
    const result = userFormSchema.safeParse({
      ...VALID_USER,
      firstName: '',
      creationMethod: 'password',
      password: 'short',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.firstName).toBeDefined();
      expect(errors.password).toBeDefined();
    }
  });
});
