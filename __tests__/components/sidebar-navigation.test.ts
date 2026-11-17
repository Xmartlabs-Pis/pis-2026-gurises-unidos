import { describe, expect, test } from 'vitest';
import { filterNavGroups, NAV_GROUPS } from '@/components/layout/app-sidebar/navigation';

describe('sidebar navigation', () => {
  test.each(['admin', 'coordinator'] as const)('links %s users to the public report', (role) => {
    const items = filterNavGroups(NAV_GROUPS, role).flatMap((group) => group.items);

    expect(items.find((item) => item.id === 'publicReport')).toMatchObject({
      title: 'Reporte Público',
      href: '/',
    });
  });
});
