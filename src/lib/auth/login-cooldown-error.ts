import { CredentialsSignin } from '@auth/core/errors';

export class LoginCooldownError extends CredentialsSignin {
  code = 'login_cooldown';

  constructor(public readonly nextAllowedAt: Date) {
    super();
  }
}
