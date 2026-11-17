import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useProjectCover } from '@/components/projects/form/use-project-cover';
import { PROJECT_PLACEHOLDERS } from '@/lib/projects/project-placeholders';

const SAVED_UPLOAD = '/uploads/covers/11111111-1111-4111-8111-111111111111.webp';
const SAVED_PLACEHOLDER = PROJECT_PLACEHOLDERS[1];
const CROP = { x: 0, y: 10, width: 100, height: 80 };

afterEach(() => {
  vi.restoreAllMocks();
});

it('keeps the saved cover until a file is chosen', () => {
  const { result } = renderHook(() => useProjectCover(SAVED_PLACEHOLDER, null));

  expect(result.current).toMatchObject({
    file: null,
    previewUrl: SAVED_PLACEHOLDER,
    crop: null,
    canRemoveSaved: false,
    hasUnsavedSelection: false,
    removedPlaceholder: null,
  });
});

it('previews a selected file and clears a previous removal', () => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const file = new File(['image'], 'portada.png', { type: 'image/png' });
  const { result, unmount } = renderHook(() => useProjectCover(SAVED_UPLOAD, null));

  act(() => {
    result.current.remove();
    result.current.apply({ file, existingPath: null, crop: CROP });
  });

  expect(result.current).toMatchObject({
    file,
    previewUrl: 'blob:preview',
    crop: CROP,
    canRemoveSaved: false,
    hasUnsavedSelection: true,
    removedPlaceholder: null,
  });

  unmount();
  expect(revoke).toHaveBeenCalledWith('blob:preview');
});

it('reverts a crop on the saved cover without treating it as a new photo', () => {
  const nextCrop = { x: 12, y: 8, width: 70, height: 60 };
  const { result } = renderHook(() => useProjectCover(SAVED_UPLOAD, CROP));

  act(() => {
    result.current.apply({ file: null, existingPath: SAVED_UPLOAD, crop: nextCrop });
  });

  expect(result.current).toMatchObject({
    file: null,
    existingPath: SAVED_UPLOAD,
    crop: nextCrop,
    hasUnsavedSelection: false,
    hasUnsavedCrop: true,
    canRemoveSaved: true,
  });

  act(() => {
    result.current.clearUnsaved();
  });

  expect(result.current).toMatchObject({
    crop: CROP,
    existingPath: null,
    hasUnsavedCrop: false,
    canRemoveSaved: true,
  });
});

it('restores a placeholder only for an uploaded cover', () => {
  const { result } = renderHook(() => useProjectCover(SAVED_UPLOAD, CROP));

  act(() => {
    result.current.remove();
  });

  expect(PROJECT_PLACEHOLDERS).toContain(result.current.previewUrl);
  expect(result.current.crop).toBeNull();
  expect(result.current.canRemoveSaved).toBe(false);
  expect(result.current.removedPlaceholder).toBe(result.current.previewUrl);
});
