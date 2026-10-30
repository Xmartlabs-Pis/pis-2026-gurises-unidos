import { normalizeDocumentId } from '@/lib/utils';
import { AVATAR_COLOR_CLASSNAMES } from './constants';

export function getAvatarColorIndex(documentId: string) {
  const verificationDigit = Number(normalizeDocumentId(documentId).at(-1));
  return Number.isInteger(verificationDigit) ? verificationDigit : 0;
}

export function getAvatarColorClassName(index: number | undefined) {
  return AVATAR_COLOR_CLASSNAMES[index ?? 0] ?? AVATAR_COLOR_CLASSNAMES[0];
}
