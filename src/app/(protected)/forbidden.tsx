import { ErrorScreen } from '@/components/error-screen';

export default function Forbidden() {
  return <ErrorScreen code={403} />;
}
