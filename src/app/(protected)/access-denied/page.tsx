import { forbidden } from 'next/navigation';

export default function AccessDeniedPage() {
  forbidden();
}
