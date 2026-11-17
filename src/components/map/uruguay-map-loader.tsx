'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui/skeleton';
import type { UruguayMapProps } from '@/components/map/uruguay-map';

const UruguayMap = dynamic(() => import('@/components/map/uruguay-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-xl" />,
});

export function UruguayMapLoader(props: UruguayMapProps) {
  return <UruguayMap {...props} />;
}
