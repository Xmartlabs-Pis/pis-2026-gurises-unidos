import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { CoverFrame } from '@/components/projects/cover/cover-frame';

it('centers the image when no crop is stored', () => {
  const { container } = render(
    <CoverFrame src="/images/project-placeholders/1.webp" alt="Portada" />
  );
  const image = container.querySelector('img');
  expect(image?.className).toContain('object-cover');
  expect(image?.getAttribute('style')).toContain('left: 0px');
});

it('positions the image from the saved crop', () => {
  const { container } = render(
    <CoverFrame
      src="/uploads/covers/11111111-1111-4111-8111-111111111111.webp"
      alt="Portada"
      crop={{ x: 0, y: 25, width: 100, height: 50 }}
      sizes="(min-width: 1024px) 25rem, 18.75rem"
    />
  );
  const image = container.querySelector('img');
  expect(image?.className ?? '').not.toContain('object-cover');
  const style = image?.getAttribute('style') ?? '';
  expect(style).toContain('width: 100%');
  expect(style).toContain('height: 200%');
  expect(style).toContain('top: -50%');
  expect(image?.getAttribute('sizes')).toBe('(min-width: 1024px) 25rem, 18.75rem');
});

it('asks for a larger image when the crop zooms in', () => {
  const { container } = render(
    <CoverFrame
      src="/uploads/covers/11111111-1111-4111-8111-111111111111.webp"
      alt="Portada"
      crop={{ x: 0, y: 0, width: 50, height: 50 }}
      sizes="(min-width: 1024px) 25rem, 18.75rem"
    />
  );
  expect(container.querySelector('img')?.getAttribute('sizes')).toBe(
    '(min-width: 1024px) calc(25rem * 2), calc(18.75rem * 2)'
  );
});
