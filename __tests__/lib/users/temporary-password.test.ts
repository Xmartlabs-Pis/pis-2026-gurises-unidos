import { expect, test } from 'vitest';
import { generateTemporaryPassword } from '@/lib/users';

test('generateTemporaryPassword returns 8 unambiguous characters with an uppercase, a lowercase and a digit', () => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const password = generateTemporaryPassword();

    expect(password).toHaveLength(8);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/\d/);
    expect(password).not.toMatch(/[0O1lI]/);
  }
});
