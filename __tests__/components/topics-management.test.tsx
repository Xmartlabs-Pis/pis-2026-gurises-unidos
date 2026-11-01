import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TopicsManagement } from '@/components/topics/topics-management';

vi.mock('@/app/actions/topics', () => ({
  createTopic: vi.fn(),
  deleteTopic: vi.fn(),
  editTopic: vi.fn(),
}));

const TOPICS = [
  { id: 4, name: 'Salud', _count: { projects: 3 } },
  { id: 9, name: 'Cultura', _count: { projects: 0 } },
];

it('links topics with projects to the filtered projects page', () => {
  render(<TopicsManagement topics={TOPICS} />);

  const health = screen.getByText('Salud').closest('li');
  expect(health).not.toBeNull();
  expect(within(health!).getByRole('link', { name: '3 proyectos' }).getAttribute('href')).toBe(
    '/dashboard/projects?topicId=4&status=all&beneficiaryYear=all'
  );
});

it('keeps the project count as plain text when a topic has no projects', () => {
  render(<TopicsManagement topics={TOPICS} />);

  const culture = screen.getByText('Cultura').closest('li');
  expect(culture).not.toBeNull();
  expect(within(culture!).queryByRole('link')).toBeNull();
  expect(within(culture!).getByText('0 proyectos').tagName).toBe('SPAN');
});
