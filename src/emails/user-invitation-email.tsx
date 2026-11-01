import { Button, Heading, Hr, Link, Text } from 'react-email';
import { EMAIL_STYLES, EmailLayout } from '@/emails/_components/email-layout';

type UserInvitationEmailProps = {
  firstName: string;
  invitedByName: string;
  invitedByFirstName: string;
  roleLabel: string;
  invitationUrl: string;
  expiresInDays: number;
};

export default function UserInvitationEmail({
  firstName,
  invitedByName,
  invitedByFirstName,
  roleLabel,
  invitationUrl,
  expiresInDays,
}: UserInvitationEmailProps) {
  return (
    <EmailLayout preview="Te damos la bienvenida a la plataforma">
      <Heading style={EMAIL_STYLES.heading}>Te damos la bienvenida a la plataforma</Heading>
      <Text style={EMAIL_STYLES.text}>
        Hola, {firstName}. {invitedByName} te creó una cuenta con el rol de {roleLabel} en la
        plataforma de Gurises Unidos. Para entrar vas a usar tu cédula y la contraseña que creés
        ahora.
      </Text>
      <Button href={invitationUrl} style={EMAIL_STYLES.button} className="email-button">
        Crear mi contraseña
      </Button>
      <Text style={EMAIL_STYLES.muted}>
        El link vence en {expiresInDays} días. Si se vence, pedile a {invitedByFirstName} que te
        mande otro.
      </Text>
      <Hr style={EMAIL_STYLES.hr} />
      <Text style={EMAIL_STYLES.fallback}>
        ¿El botón no funciona? Copiá este link en el navegador:
      </Text>
      <Link href={invitationUrl} style={EMAIL_STYLES.link}>
        {invitationUrl}
      </Link>
    </EmailLayout>
  );
}

UserInvitationEmail.PreviewProps = {
  firstName: 'Lucía',
  invitedByName: 'María Rodríguez',
  invitedByFirstName: 'María',
  roleLabel: 'Coordinadora',
  invitationUrl: 'http://localhost:3000/accept-invitation?token=example',
  expiresInDays: 7,
} satisfies UserInvitationEmailProps;
