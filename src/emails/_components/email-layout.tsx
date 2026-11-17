import type { ReactNode } from 'react';
import {
  Body,
  Column,
  Container,
  Font,
  Head,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from 'react-email';
import { getAppUrl } from '@/lib/app-url';

export const FONT_FAMILY = 'Mulish, Arial, Helvetica, sans-serif';
const MULISH_WOFF2 = 'https://fonts.gstatic.com/s/mulish/v18/1Ptvg83HX_SGhgqk3wotYKNnBQ.woff2';
const HEADER_BACKGROUND = '#0e3a2e';
const DIVIDER_COLOR = '#e5e5e5';

export const EMAIL_STYLES = {
  body: { backgroundColor: '#f5f5f5', fontFamily: FONT_FAMILY, padding: '24px 0' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #E5E5E7',
    margin: '0 auto',
    maxWidth: '600px',
    overflow: 'hidden' as const,
  },
  header: {
    backgroundColor: HEADER_BACKGROUND,
    padding: '20px 40px',
  },
  logo: { borderRadius: '6px', display: 'block' },
  brand: {
    color: '#ffffff',
    fontFamily: FONT_FAMILY,
    fontSize: '15px',
    fontWeight: 400,
    lineHeight: '24px',
    margin: '0',
    paddingLeft: '10px',
  },
  content: { padding: '40px' },
  heading: {
    color: '#171717',
    fontFamily: FONT_FAMILY,
    fontSize: '28px',
    fontWeight: 700,
    lineHeight: '34px',
    margin: '0 0 16px',
  },
  text: {
    color: '#333333',
    fontFamily: FONT_FAMILY,
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 24px',
  },
  button: {
    backgroundColor: '#171717',
    borderRadius: '10px',
    color: '#ffffff',
    display: 'inline-block',
    fontFamily: FONT_FAMILY,
    fontSize: '14px',
    padding: '12px 16px',
  },
  muted: {
    color: '#737373',
    fontFamily: FONT_FAMILY,
    fontSize: '14px',
    lineHeight: '20px',
    margin: '16px 0 0',
  },
  hr: { borderColor: DIVIDER_COLOR, margin: '16px 0' },
  fallback: {
    color: '#737373',
    fontFamily: FONT_FAMILY,
    fontSize: '12px',
    lineHeight: '16px',
    margin: '0 0 4px',
  },
  link: {
    color: '#171717',
    fontFamily: FONT_FAMILY,
    fontSize: '12px',
    lineHeight: '16px',
    wordBreak: 'break-all' as const,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  footer: {
    borderTop: `1px solid ${DIVIDER_COLOR}`,
    borderColor: DIVIDER_COLOR,
    padding: '24px 40px',
  },
  footerText: {
    color: '#737373',
    fontFamily: FONT_FAMILY,
    fontSize: '13px',
    lineHeight: '20px',
    margin: '0',
  },
};

function getLogoUrl() {
  if (process.env.REACT_EMAIL_INTERNAL_PREVIEW_SERVER_LOCATION) {
    return '/static/logo.png';
  }
  return new URL('/images/logo.png', getAppUrl()).toString();
}

type EmailLayoutProps = {
  preview: string;
  children: ReactNode;
};

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="es">
      <Head>
        <Font
          fontFamily="Mulish"
          fallbackFontFamily={['Arial', 'Helvetica', 'sans-serif']}
          webFont={{ url: MULISH_WOFF2, format: 'woff2' }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Mulish"
          fallbackFontFamily={['Arial', 'Helvetica', 'sans-serif']}
          webFont={{ url: MULISH_WOFF2, format: 'woff2' }}
          fontWeight={700}
          fontStyle="normal"
        />
        <style>
          {`
            @media only screen and (max-width: 480px) {
              .email-pad-header { padding: 20px 24px !important; }
              .email-pad-content { padding: 40px 24px !important; }
              .email-pad-footer { padding: 24px !important; }
              .email-button {
                width: 100% !important;
                display: block !important;
                box-sizing: border-box !important;
                text-align: center !important;
              }
            }
            @media (prefers-color-scheme: dark) {
              .email-button { background-color: ${HEADER_BACKGROUND} !important; }
            }
            body[data-applied-color-inversion] .email-button {
              background-color: ${HEADER_BACKGROUND} !important;
            }
          `}
        </style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={EMAIL_STYLES.body}>
        <Container style={EMAIL_STYLES.card}>
          <Section style={EMAIL_STYLES.header} tdClassName="email-pad-header">
            <Row>
              <Column style={{ width: '28px', verticalAlign: 'middle' }}>
                <Img
                  src={getLogoUrl()}
                  width="24"
                  height="24"
                  alt="Gurises Unidos"
                  style={EMAIL_STYLES.logo}
                />
              </Column>
              <Column style={{ verticalAlign: 'middle' }}>
                <Text style={EMAIL_STYLES.brand}>Gurises Unidos</Text>
              </Column>
            </Row>
          </Section>
          <Section style={EMAIL_STYLES.content} tdClassName="email-pad-content">
            {children}
          </Section>
          <Section style={EMAIL_STYLES.footer} tdClassName="email-pad-footer">
            <Text style={EMAIL_STYLES.footerText}>
              Te llega este email porque tenés una cuenta en la plataforma. Es automático: no lo
              respondas. Si necesitás ayuda, hablá con el administrador de tu equipo.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
