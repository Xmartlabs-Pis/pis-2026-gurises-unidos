import type { UserTokenFailureReason } from '@/lib/auth/user-tokens';

export const INVITATION_TOKEN_ERROR_MESSAGES: Record<UserTokenFailureReason, string> = {
  invalid: 'La invitación no es válida. Pedile al administrador que te envíe una nueva.',
  used: 'Esta invitación ya fue usada. Si ya completaste tu registro, iniciá sesión.',
  expired: 'Esta invitación venció. Pedile al administrador que te envíe una nueva.',
  replaced: 'Esta invitación fue reemplazada por una más nueva. Usá el enlace del último correo.',
};
