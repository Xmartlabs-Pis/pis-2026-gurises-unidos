import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useProjectCover } from '@/components/projects/form/use-project-cover';
import { PROJECT_PLACEHOLDERS } from '@/lib/projects/project-placeholders';

const SAVED_UPLOAD = '/uploads/covers/11111111-1111-4111-8111-111111111111.webp';
const SAVED_PLACEHOLDER = PROJECT_PLACEHOLDERS[1];

afterEach(() => {
  vi.restoreAllMocks();
});

it('keeps the saved cover until a file is chosen', () => {
  const { result } = renderHook(() => useProjectCover(SAVED_PLACEHOLDER));

  expect(result.current).toMatchObject({
    file: null,
    previewUrl: SAVED_PLACEHOLDER,
    fieldImageUrl: SAVED_PLACEHOLDER,
    canRemove: false,
    removedPlaceholder: null,
  });
});

it('previews a selected file and clears a previous removal', () => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const file = new File(['image'], 'portada.png', { type: 'image/png' });
  const { result, unmount } = renderHook(() => useProjectCover(SAVED_UPLOAD));

  act(() => {
    result.current.remove();
    result.current.changeFile(file);
  });

  expect(result.current).toMatchObject({
    file,
    previewUrl: 'blob:preview',
    fieldImageUrl: null,
    canRemove: false,
    removedPlaceholder: null,
  });

  unmount();
  expect(revoke).toHaveBeenCalledWith('blob:preview');
});

it('restores a placeholder only for an uploaded cover', () => {
  const { result } = renderHook(() => useProjectCover(SAVED_UPLOAD));

  act(() => {
    result.current.remove();
  });

  expect(PROJECT_PLACEHOLDERS).toContain(result.current.previewUrl);
  expect(result.current.fieldImageUrl).toBe(result.current.removedPlaceholder);
  expect(result.current.canRemove).toBe(false);
});
