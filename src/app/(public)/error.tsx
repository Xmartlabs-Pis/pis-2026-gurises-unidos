'use client';

import RouteError from '@/components/route-error';

export default function PublicError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <RouteError error={error} retry={retry} homeHref="/" />;
}
