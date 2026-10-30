import { describe, expect, test } from 'vitest';
import { profileFormSchema, type ProfileFormValues } from '@/lib/validation/profile';

describe('profileFormSchema', () => {
  test('trims names and normalizes the email', () => {
    expect(
      profileFormSchema.parse({
        firstName: ' Ana ',
        lastName: ' García ',
        email: ' ANA@EXAMPLE.COM ',
      })
    ).toEqual({
      firstName: 'Ana',
      lastName: 'García',
      email: 'ana@example.com',
    });
  });

  test.each<[keyof ProfileFormValues, ProfileFormValues]>([
    ['firstName', { firstName: '', lastName: 'García', email: 'ana@example.com' }],
    ['lastName', { firstName: 'Ana', lastName: '', email: 'ana@example.com' }],
    ['email', { firstName: 'Ana', lastName: 'García', email: '' }],
  ])('requires %s', (field, values) => {
    const result = profileFormSchema.safeParse(values);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors[field]).toBeDefined();
    }
  });

  test('rejects an invalid email address', () => {
    const result = profileFormSchema.safeParse({
      firstName: 'Ana',
      lastName: 'García',
      email: 'invalid-email',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain(
        'Ingresá un correo electrónico válido.'
      );
    }
  });
});
