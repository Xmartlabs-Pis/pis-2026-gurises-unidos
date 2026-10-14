'use client';

import { useEffect } from 'react';
import { ErrorScreen } from '@/components/error-screen';
import { Button } from '@/components/ui/button';

export default function RouteError({
  error,
  retry,
  homeHref,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  homeHref?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      code={500}
      reference={error?.digest}
      homeHref={homeHref}
      actions={
        <Button size="lg" onClick={() => retry()}>
          Intentar de nuevo
        </Button>
      }
    />
  );
}
