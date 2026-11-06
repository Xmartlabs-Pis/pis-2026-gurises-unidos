import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ProjectCard } from '@/components/projects/project-card';

it('keeps the public cover frame at 16:9 so a stored crop is not stretched', () => {
  const { container } = render(
    <ProjectCard
      variant="public-light"
      territory="Montevideo"
      name="Comedor"
      description="Una descripción pública"
      coverPhoto="/uploads/covers/11111111-1111-4111-8111-111111111111.webp"
      coverCrop={{ x: 0, y: 25, width: 100, height: 50 }}
      reach={15}
    />
  );

  const frame = container.querySelector('img')?.parentElement;
  expect(frame?.className).toContain('aspect-video');
  expect(frame?.className).not.toMatch(/(^|\s)h-\d/);
});
