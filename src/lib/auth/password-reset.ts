import type { UserTokenFailureReason } from '@/lib/auth/user-tokens';

export const RESET_TOKEN_ERROR_MESSAGES: Record<UserTokenFailureReason, string> = {
  invalid: 'El enlace no es válido. Pedí uno nuevo.',
  used: 'Este enlace ya fue usado. Pedí uno nuevo.',
  expired: 'Este enlace venció. Pedí uno nuevo.',
  replaced: 'Pediste un enlace más nuevo. Usá el del último correo.',
};
