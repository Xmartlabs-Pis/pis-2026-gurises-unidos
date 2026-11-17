import { Button, Heading, Hr, Link, Text } from 'react-email';
import { EMAIL_STYLES, EmailLayout } from '@/emails/_components/email-layout';

type PasswordResetEmailProps = {
  firstName: string;
  resetUrl: string;
  expiresInMinutes: number;
};

export default function PasswordResetEmail({
  firstName,
  resetUrl,
  expiresInMinutes,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Restablecé tu contraseña de Gurises Unidos">
      <Heading style={EMAIL_STYLES.heading}>Restablecé tu contraseña</Heading>
      <Text style={EMAIL_STYLES.text}>
        Hola, {firstName}. Recibimos un pedido para cambiar la contraseña de tu cuenta en la
        plataforma de Gurises Unidos.
      </Text>
      <Button href={resetUrl} style={EMAIL_STYLES.button} className="email-button">
        Restablecer contraseña
      </Button>
      <Text style={EMAIL_STYLES.muted}>
        El link vence en {expiresInMinutes} minutos. Si no pediste el cambio, ignorá este email: tu
        contraseña sigue igual.
      </Text>
      <Hr style={EMAIL_STYLES.hr} />
      <Text style={EMAIL_STYLES.fallback}>
        ¿El botón no funciona? Copiá este link en el navegador:
      </Text>
      <Link href={resetUrl} style={EMAIL_STYLES.link}>
        {resetUrl}
      </Link>
    </EmailLayout>
  );
}

PasswordResetEmail.PreviewProps = {
  firstName: 'Lucía',
  resetUrl: 'http://localhost:3000/reset-password?token=example',
  expiresInMinutes: 60,
} satisfies PasswordResetEmailProps;
