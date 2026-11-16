import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ProjectCard } from '@/components/projects/project-card';

it.each(['public-light', 'public-dark'] as const)(
  'labels the total as beneficiaries in %s cards',
  (variant) => {
    render(
      <ProjectCard
        variant={variant}
        territory="Montevideo"
        name="Community project"
        description="Public description"
        coverPhoto={null}
        coverCrop={null}
        reach={35}
      />
    );
    expect(screen.getByText('35')).toBeDefined();
    expect(screen.getByText('beneficiarios')).toBeDefined();
    expect(screen.queryByText('personas alcanzadas')).toBeNull();
  }
);

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
