'use client';

import dynamic from 'next/dynamic';

const UruguayMap = dynamic(() => import('@/components/uruguay-map'), {
  ssr: false,
  loading: () => <div className="bg-card h-full w-full rounded-xl" />,
});

export function UruguayMapLoader() {
  return <UruguayMap />;
}
