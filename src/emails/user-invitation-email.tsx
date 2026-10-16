import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Text } from 'react-email';

type UserInvitationEmailProps = {
  firstName: string;
  invitationUrl: string;
  expiresInDays: number;
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

export default function UserInvitationEmail({
  firstName,
  invitationUrl,
  expiresInDays,
}: UserInvitationEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Te invitaron a la plataforma de Gurises Unidos</Preview>
      <Body style={STYLES.body}>
        <Container style={STYLES.container}>
          <Heading style={STYLES.heading}>Completá tu registro</Heading>
          <Text style={STYLES.text}>Hola {firstName},</Text>
          <Text style={STYLES.text}>
            Te crearon una cuenta en la plataforma de gestión de Gurises Unidos. Para empezar a
            usarla, elegí tu contraseña. El enlace vence en {expiresInDays} días y se puede usar una
            sola vez.
          </Text>
          <Button href={invitationUrl} style={STYLES.button}>
            Completar registro
          </Button>
          <Text style={STYLES.text}>
            Si el botón no funciona, copiá y pegá este enlace en tu navegador:
          </Text>
          <Link href={invitationUrl} style={STYLES.link}>
            {invitationUrl}
          </Link>
          <Hr style={STYLES.hr} />
          <Text style={STYLES.muted}>Si no esperabas esta invitación, ignorá este correo.</Text>
        </Container>
      </Body>
    </Html>
  );
}

UserInvitationEmail.PreviewProps = {
  firstName: 'Juana',
  invitationUrl: 'http://localhost:3000/accept-invitation?token=example',
  expiresInDays: 7,
} satisfies UserInvitationEmailProps;
