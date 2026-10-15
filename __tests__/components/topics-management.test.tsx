import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TopicsManagement } from '@/components/topics/topics-management';

vi.mock('@/app/actions/topics', () => ({
  createTopic: vi.fn(),
  deleteTopic: vi.fn(),
}));

const TOPICS = [
  { id: 4, name: 'Salud', _count: { projects: 3 } },
  { id: 9, name: 'Cultura', _count: { projects: 0 } },
];

it('links topics with projects to the filtered projects page', () => {
  render(<TopicsManagement topics={TOPICS} />);

  const health = screen.getByText('Salud').closest('li');
  expect(health).not.toBeNull();
  expect(within(health!).getByRole('link', { name: 'Ver proyectos' }).getAttribute('href')).toBe(
    '/dashboard/projects?topicId=4'
  );
});

it('disables the projects link when a topic has no projects', () => {
  render(<TopicsManagement topics={TOPICS} />);

  const culture = screen.getByText('Cultura').closest('li');
  expect(culture).not.toBeNull();
  expect(within(culture!).queryByRole('link', { name: 'Ver proyectos' })).toBeNull();
  expect(within(culture!).getByText('Ver proyectos').getAttribute('aria-disabled')).toBe('true');
});
