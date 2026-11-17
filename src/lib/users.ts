const PASSWORD_LENGTH = 8;
const UPPERCASE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE_CHARACTERS = 'abcdefghijkmnopqrstuvwxyz';
const DIGIT_CHARACTERS = '23456789';
const PASSWORD_CHARACTERS = `${UPPERCASE_CHARACTERS}${LOWERCASE_CHARACTERS}${DIGIT_CHARACTERS}`;

export function generateTemporaryPassword() {
  const passwordCharacters = [
    getRandomCharacter(UPPERCASE_CHARACTERS),
    getRandomCharacter(LOWERCASE_CHARACTERS),
    getRandomCharacter(DIGIT_CHARACTERS),
    ...Array.from({ length: PASSWORD_LENGTH - 3 }, () => getRandomCharacter(PASSWORD_CHARACTERS)),
  ];

  for (let index = 1; index < passwordCharacters.length; index += 1) {
    const randomIndex = getRandomIndex(index + 1);

    [passwordCharacters[index], passwordCharacters[randomIndex]] = [
      passwordCharacters[randomIndex],
      passwordCharacters[index],
    ];
  }

  return passwordCharacters.join('');
}

function getRandomCharacter(characters: string) {
  const randomIndex = getRandomIndex(characters.length);
  return characters[randomIndex];
}

function getRandomIndex(length: number) {
  const limit = Math.floor(0x1_0000_0000 / length) * length;
  const buffer = new Uint32Array(1);
  do crypto.getRandomValues(buffer);
  while (buffer[0] >= limit);
  return buffer[0] % length;
}
