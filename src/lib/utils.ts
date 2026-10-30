export { cn } from 'cn';

export function getInitials(name: string | null | undefined) {
  return (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? '')
    .join('')
    .toUpperCase();
}

/**
 * Normalize the document id by removing all spaces, dots and dashes
 * @example "4.123.456-7" -> "41234567"
 */
export function normalizeDocumentId(documentId: string) {
  const normalized = documentId.replace(/[ .\-]/g, '');
  return /^\d{7}$/.test(normalized) ? normalized.padStart(8, '0') : normalized;
}
