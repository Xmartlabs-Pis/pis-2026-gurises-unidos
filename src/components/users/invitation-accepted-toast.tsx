'use client';

import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/components/ui/toast';

const INVITATION_ACCEPTED_PARAM = 'invitationAccepted';

function InvitationAcceptedToastContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const accepted = searchParams.get(INVITATION_ACCEPTED_PARAM) === '1';
  const shown = useRef(false);

  useEffect(() => {
    if (!accepted) {
      shown.current = false;
      return;
    }

    if (shown.current) return;
    shown.current = true;

    toast.add({
      type: 'success',
      title: 'Registro completo',
      description: 'La persona invitada ya puede iniciar sesión con su cédula y su contraseña.',
    });

    const params = new URLSearchParams(searchParams.toString());
    params.delete(INVITATION_ACCEPTED_PARAM);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [accepted, pathname, router, searchParams]);

  return null;
}

export function InvitationAcceptedToast() {
  return (
    <Suspense fallback={null}>
      <InvitationAcceptedToastContent />
    </Suspense>
  );
}
