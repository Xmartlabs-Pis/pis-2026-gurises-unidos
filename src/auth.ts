import NextAuth from 'next-auth';
import { encode } from 'next-auth/jwt';
import Credentials from 'next-auth/providers/credentials';
import { toAuthUser, verifyUserCredentials } from './lib/credentials';
import prisma from './lib/prisma';
import { fullName } from './lib/users/format';
import { getAvatarColorIndex } from './lib/users/avatar';
import { getSessionMaxAge, REMEMBER_ME_MAX_AGE } from './lib/auth/session-expiration';

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: 'jwt',
    maxAge: REMEMBER_ME_MAX_AGE, // cookie ceiling; jwt.encode sets the real maxAge of the session
    updateAge: 0,
  },
  jwt: {
    encode: async ({ token, secret, salt }) =>
      encode({
        token,
        secret,
        salt,
        maxAge: getSessionMaxAge(Boolean(token?.remember)),
      }),
  },
  providers: [
    Credentials({
      credentials: {
        documentId: {},
        password: {},
        remember: {},
      },
      authorize: async (credentials) => {
        const documentId = credentials?.documentId;
        const password = credentials?.password;

        if (typeof documentId !== 'string' || typeof password !== 'string') {
          return null;
        }

        const user = await verifyUserCredentials(documentId, password);

        return user ? { ...toAuthUser(user), remember: credentials?.remember === 'true' } : null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.avatarColorIndex = user.avatarColorIndex;
        token.mustChangePassword = user.mustChangePassword;
        token.remember = user.remember;
        return token;
      }

      if (!token.sub || !token.iat) {
        return token;
      }

      const userId = Number(token.sub);

      if (!Number.isSafeInteger(userId) || userId <= 0) {
        return null;
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          documentId: true,
          role: true,
          status: true,
          passwordChangedAt: true,
          mustChangePassword: true,
          deletedAt: true,
        },
      });

      if (!currentUser || currentUser.deletedAt || currentUser.status !== 'active') {
        return null;
      }

      if (
        currentUser.passwordChangedAt &&
        Math.floor(currentUser.passwordChangedAt.getTime() / 1000) > token.iat
      ) {
        return null;
      }

      token.name = fullName(currentUser);
      token.email = currentUser.email;
      token.role = currentUser.role;
      token.avatarColorIndex = getAvatarColorIndex(currentUser.documentId);
      token.mustChangePassword = currentUser.mustChangePassword;

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.avatarColorIndex = token.avatarColorIndex;
        session.user.remember = Boolean(token.remember);
        session.user.mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) {
        return;
      }

      try {
        await prisma.user.update({
          where: { id: Number(user.id) },
          data: { lastAccess: new Date() },
        });
      } catch (error) {
        console.error('Failed to record lastAccess', error);
      }
    },
  },
});
