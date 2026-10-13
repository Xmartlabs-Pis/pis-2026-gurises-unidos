import { ErrorScreen } from '@/components/error-screen';

type RouteNotFoundProps = {
  homeHref?: string;
};

export default function RouteNotFound({ homeHref = '/dashboard' }: RouteNotFoundProps) {
  return <ErrorScreen code={404} homeHref={homeHref} />;
}
