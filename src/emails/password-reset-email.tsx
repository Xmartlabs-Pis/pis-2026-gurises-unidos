import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Text } from 'react-email';

type PasswordResetEmailProps = {
  firstName: string;
  resetUrl: string;
  expiresInMinutes: number;
};

const STYLES = {
  body: { backgroundColor: '#f5f5f5', fontFamily: 'Arial, sans-serif', padding: '24px 0' },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    margin: '0 auto',
    maxWidth: '480px',
    padding: '32px',
  },
  heading: { color: '#171717', fontSize: '22px', margin: '0 0 16px' },
  text: { color: '#171717', fontSize: '15px', lineHeight: '24px' },
  button: {
    backgroundColor: '#171717',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '15px',
    padding: '12px 20px',
  },
  link: { color: '#2563eb', fontSize: '13px', wordBreak: 'break-all' as const },
  hr: { borderColor: '#e5e5e5', margin: '24px 0' },
  muted: { color: '#737373', fontSize: '13px', lineHeight: '20px' },
};

export default function PasswordResetEmail({
  firstName,
  resetUrl,
  expiresInMinutes,
}: PasswordResetEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Restablecé tu contraseña de Gurises Unidos</Preview>
      <Body style={STYLES.body}>
        <Container style={STYLES.container}>
          <Heading style={STYLES.heading}>Restablecer contraseña</Heading>
          <Text style={STYLES.text}>Hola {firstName},</Text>
          <Text style={STYLES.text}>
            Recibimos un pedido para restablecer la contraseña de tu cuenta. El enlace vence en{' '}
            {expiresInMinutes} minutos y se puede usar una sola vez.
          </Text>
          <Button href={resetUrl} style={STYLES.button}>
            Restablecer contraseña
          </Button>
          <Text style={STYLES.text}>
            Si el botón no funciona, copiá y pegá este enlace en tu navegador:
          </Text>
          <Link href={resetUrl} style={STYLES.link}>
            {resetUrl}
          </Link>
          <Hr style={STYLES.hr} />
          <Text style={STYLES.muted}>
            Si no pediste este cambio, ignorá este correo: tu contraseña sigue siendo la misma.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

PasswordResetEmail.PreviewProps = {
  firstName: 'Juana',
  resetUrl: 'http://localhost:3000/reset-password?token=example',
  expiresInMinutes: 60,
} satisfies PasswordResetEmailProps;
