import bcrypt from 'bcryptjs';
import { describe, expect, test } from 'vitest';
import { makeUser, TEST_PASSWORD, TEST_PASSWORD_HASH } from './user';

describe('makeUser', () => {
  test('assigns distinct ids, document ids, and emails by default', () => {
    const first = makeUser();
    const second = makeUser();

    expect(first.id).not.toBe(second.id);
    expect(first.documentId).not.toBe(second.documentId);
    expect(first.email).not.toBe(second.email);
  });
});

test('TEST_PASSWORD_HASH is a bcrypt hash of TEST_PASSWORD', async () => {
  await expect(bcrypt.compare(TEST_PASSWORD, TEST_PASSWORD_HASH)).resolves.toBe(true);
});
