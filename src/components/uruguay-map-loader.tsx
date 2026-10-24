'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui/skeleton';
import type { DepartmentProjectCounts } from '@/lib/projects/department-project-counts';

const UruguayMap = dynamic(() => import('@/components/uruguay-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-xl" />,
});

type UruguayMapLoaderProps = {
  projectCounts: DepartmentProjectCounts[];
};

export function UruguayMapLoader({ projectCounts }: UruguayMapLoaderProps) {
  return <UruguayMap projectCounts={projectCounts} />;
}
