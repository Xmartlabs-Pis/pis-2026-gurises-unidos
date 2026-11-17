import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { BeneficiaryDistribution } from '@/components/projects/detail/beneficiary-distribution';
import { InstitutionalContribution } from '@/components/projects/detail/institutional-contribution';
import { ProjectMetrics } from '@/components/projects/detail/project-metrics';
import { ProjectPublicCard } from '@/components/projects/detail/project-public-card';
import { ProjectRecentActivity } from '@/components/projects/detail/project-recent-activity';
import type { ProjectDetail } from '@/lib/projects/detail';

const BENEFICIARIES: ProjectDetail['distribution'] = [
  { key: 'directChildrenAdolescents', label: 'NNA directos', value: 80 },
  { key: 'indirectChildrenAdolescents', label: 'NNA indirectos', value: 20 },
  { key: 'youth18To29', label: 'Jóvenes (18 a 29)', value: 10 },
  { key: 'families', label: 'Familias', value: 25 },
  { key: 'coordinatedInstitutions', label: 'Instituciones coordinadas', value: 5 },
  { key: 'communityLeaders', label: 'Referentes comunitarios', value: 12 },
  { key: 'basicServiceStaff', label: 'Personal de servicios básicos', value: 18 },
];

test('uses a two-column metric grid on mobile', () => {
  const { container } = render(
    <ProjectMetrics
      metrics={{
        childrenReached: {
          value: 100,
          previousValue: 82,
          absoluteChange: 18,
          percentageChange: 22,
          trend: 'increased',
        },
        families: {
          value: 25,
          previousValue: 20,
          absoluteChange: 5,
          percentageChange: 25,
          trend: 'increased',
        },
        institutions: {
          value: 5,
          previousValue: 5,
          absoluteChange: 0,
          percentageChange: 0,
          trend: 'stable',
        },
        annualGrowth: 21.4,
      }}
      comparisonYear={2025}
    />
  );

  expect(container.querySelector('dl')?.classList.contains('grid-cols-2')).toBe(true);
});

test('shows distribution values without bar tracks on mobile', () => {
  render(<BeneficiaryDistribution data={BENEFICIARIES} year={2026} />);

  expect(screen.getByRole('meter', { name: 'NNA directos' }).className).toContain('hidden h-1.5');
  expect(screen.getByRole('meter', { name: 'NNA directos' }).className).toContain('sm:block');
});

test('uses a distinct color for each system beneficiary category', () => {
  render(<BeneficiaryDistribution data={BENEFICIARIES} year={2026} />);

  const colors = BENEFICIARIES.map(({ label }) =>
    Array.from(screen.getByRole('meter', { name: label }).firstElementChild?.classList ?? []).find(
      (className) => className.startsWith('bg-beneficiary-')
    )
  );

  expect(colors).toEqual([
    'bg-beneficiary-children',
    'bg-beneficiary-indirect-children',
    'bg-beneficiary-youth',
    'bg-beneficiary-families',
    'bg-beneficiary-institutions',
    'bg-beneficiary-community-leaders',
    'bg-beneficiary-staff',
  ]);
  expect(new Set(colors).size).toBe(BENEFICIARIES.length);
});

test('shows every beneficiary category in the provided order', () => {
  render(
    <BeneficiaryDistribution
      data={[
        ...BENEFICIARIES,
        { key: 'customVolunteers' as const, label: 'Voluntarios', value: 7 },
      ]}
      year={2026}
    />
  );

  const rows = screen.getAllByRole('listitem');
  expect(rows.map((row) => row.textContent)).toEqual([
    'NNA directos80',
    'NNA indirectos20',
    'Jóvenes (18 a 29)10',
    'Familias25',
    'Instituciones coordinadas5',
    'Referentes comunitarios12',
    'Personal de servicios básicos18',
    'Voluntarios7',
  ]);
  expect(screen.getByRole('meter', { name: 'Voluntarios' }).getAttribute('aria-valuenow')).toBe(
    '7'
  );
});

test('keeps the public card horizontal and separates contribution rows on mobile', () => {
  const { container } = render(
    <>
      <ProjectPublicCard name="El Resorte" coverPhoto={null} />
      <InstitutionalContribution
        data={{
          nationalReach: { projectValue: 342, nationalValue: 4286, percentage: 8 },
          activeProjects: { projectCount: 1, totalCount: 27 },
          territories: {
            count: 1,
            items: ['Montevideo'],
          },
        }}
      />
    </>
  );

  expect(
    screen
      .getByRole('heading', { name: 'Tarjeta pública' })
      .closest('section')
      ?.className.includes('grid-cols-[7rem_minmax(0,1fr)]')
  ).toBe(true);
  expect(screen.getByText('del alcance nacional').closest('div')?.className).toContain('border-b');
  expect(container.textContent).toContain('342 de 4.286 NNA totales');
});

test('uses activity cards and limits the mobile list to four entries', () => {
  const { container } = render(<ProjectRecentActivity />);
  const mobileList = container.querySelector('ul');

  expect(mobileList?.className).toContain('md:hidden');
  expect(mobileList?.querySelectorAll('li')).toHaveLength(4);
  expect(mobileList?.textContent).toContain('Taller de convivencia grupal');
  expect(mobileList?.textContent).toContain('32 beneficiarios');
  expect(mobileList?.textContent).not.toContain('Articulación con escuela pública');
});
