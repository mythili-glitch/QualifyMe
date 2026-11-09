import type { Request, RequestHandler } from 'express';
import { AuthService, type PublicUser } from '../services/auth.service';

const authService = new AuthService();
const cookieName = 'qualifyme_session_v1';

export type AuthenticatedLocals = {
  authUser: PublicUser;
};

function readSessionToken(request: Request): string | null {
  const cookiePrefix = `${cookieName}=`;
  const cookie = (request.headers.cookie ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(cookiePrefix));

  return cookie ? cookie.slice(cookiePrefix.length) : null;
}

export const requireAuth: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const user = await authService.getCurrentUser(readSessionToken(request));

    if (!user) {
      response.status(401).json({ message: 'Please sign in to continue.' });
      return;
    }

    response.locals.authUser = user;
    next();
  } catch (error) {
    console.error('Could not verify the signed-in user:', error);
    response.status(500).json({ message: 'Could not verify your account.' });
  }
};