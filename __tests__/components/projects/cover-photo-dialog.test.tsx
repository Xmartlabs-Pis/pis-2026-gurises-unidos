import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { CoverPhotoDialog } from '@/components/projects/form/cover-photo-dialog';
import type { CoverCrop } from '@/lib/projects/cover-crop';

vi.mock('react-easy-crop', async () => {
  const React = await import('react');
  return {
    default: function MockCropper({
      onCropComplete,
    }: {
      onCropComplete?: (area: { x: number; y: number; width: number; height: number }) => void;
    }) {
      React.useEffect(() => {
        onCropComplete?.({ x: 0, y: 12.5, width: 100, height: 75 });
      }, [onCropComplete]);
      return <div data-testid="cover-cropper" />;
    },
  };
});

const SOURCE = '/uploads/covers/11111111-1111-4111-8111-111111111111.webp';
const MOCK_CROP = { x: 0, y: 12.5, width: 100, height: 75 };
const SAVED_CROP = { x: 5, y: 10, width: 80, height: 70 };

function renderDialog(initialCrop: CoverCrop | null) {
  const onApply = vi.fn();
  render(
    <CoverPhotoDialog
      open
      onOpenChange={() => {}}
      covers={[]}
      loadingCovers={false}
      coversError={false}
      image={{ source: SOURCE, file: null, initialCrop }}
      onRequestUpload={() => {}}
      onChooseExisting={() => {}}
      onApply={onApply}
    />
  );
  return onApply;
}

it('keeps the saved crop when the cropper reports its default area first', async () => {
  const onApply = renderDialog(SAVED_CROP);
  await screen.findByTestId('cover-cropper');
  await act(async () => {});
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
  expect(onApply).toHaveBeenCalledWith({
    file: null,
    existingPath: SOURCE,
    crop: SAVED_CROP,
  });
});

it('keeps loaded covers in one horizontal row that loads the images lazily', () => {
  const covers = Array.from({ length: 12 }, (_, index) => ({
    path: `/uploads/covers/${index.toString(16).padStart(8, '0')}-1111-4111-8111-111111111111.webp`,
    projectName: `Proyecto ${index}`,
    usedBy: 1,
  }));
  render(
    <CoverPhotoDialog
      open
      onOpenChange={() => {}}
      covers={covers}
      loadingCovers={false}
      coversError={false}
      image={null}
      onRequestUpload={() => {}}
      onChooseExisting={() => {}}
      onApply={() => {}}
    />
  );

  const strip = document.querySelector('[data-cover-strip]');
  expect(strip?.className).toContain('overflow-x-auto');
  expect(strip?.className).not.toContain('grid');
  expect(screen.getByRole('button', { name: 'Proyecto 0' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Proyecto 11' })).toBeTruthy();
  const images = strip?.querySelectorAll('img') ?? [];
  expect(images).toHaveLength(covers.length);
  expect([...images].every((image) => image.getAttribute('loading') === 'lazy')).toBe(true);
});

it('uses the cropper area when the image has no saved crop', async () => {
  const onApply = renderDialog(null);
  await screen.findByTestId('cover-cropper');
  await act(async () => {});
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
  expect(onApply).toHaveBeenCalledWith({
    file: null,
    existingPath: SOURCE,
    crop: MOCK_CROP,
  });
});
