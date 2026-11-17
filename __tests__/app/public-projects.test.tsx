import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import ProjectsPage from '@/app/(public)/projects/page';
import { getPublishedYears } from '@/lib/metrics/queries';
import { getPublishedTopics } from '@/lib/projects/public-projects';
import { ProjectsByTopic } from '@/components/projects/projects-by-topic';

vi.mock('@/lib/metrics/queries', () => ({ getPublishedYears: vi.fn() }));
vi.mock('@/lib/projects/public-projects', () => ({ getPublishedTopics: vi.fn() }));
vi.mock('@/components/projects/projects-by-topic', () => ({
  ProjectsByTopic: vi.fn(({ year }: { year: number }) => <div>Projects for {year}</div>),
}));
vi.mock('next/server', () => ({ connection: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/projects',
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPublishedYears).mockResolvedValue([2026, 2025]);
  vi.mocked(getPublishedTopics).mockResolvedValue([{ id: 4, name: 'Education' }]);
});

test('renders the public project view with the requested published year and shared footer', async () => {
  render(await ProjectsPage({ searchParams: Promise.resolve({ year: '2025' }) }));
  expect(screen.getByRole('heading', { name: 'Todos nuestros proyectos', level: 1 })).toBeDefined();
  expect(screen.getByText('Projects for 2025')).toBeDefined();
  expect(ProjectsByTopic).toHaveBeenCalledWith({ year: 2025 });
  expect(getPublishedTopics).toHaveBeenCalledWith(2025);
  expect(screen.getByRole('link', { name: 'Volver al informe' }).getAttribute('href')).toBe(
    '/?year=2025'
  );
  expect(screen.getByRole('link', { name: 'Education' }).getAttribute('href')).toBe(
    '/projects?year=2025#topic-4'
  );
  expect(screen.getByRole('contentinfo')).toBeDefined();
  expect(screen.queryByRole('link', { name: 'Quiero colaborar' })).toBeNull();
  expect(
    screen.getByText(
      'Trabajamos con niños, niñas, adolescentes, familias y comunidades en el territorio uruguayo y la región.'
    )
  ).toBeDefined();
  expect(screen.queryByRole('group', { name: 'Impacto 2025' })).toBeNull();
});

test.each([undefined, '2024', 'invalid'])(
  'defaults to the latest published year for year %s',
  async (year) => {
    render(await ProjectsPage({ searchParams: Promise.resolve({ year }) }));
    expect(screen.getByText('Projects for 2026')).toBeDefined();
  }
);
