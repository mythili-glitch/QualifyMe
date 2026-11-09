import { Router, type Request, type Response } from 'express';
import {
  AuthError,
  AuthService,
  SESSION_DURATION_MS,
} from '../services/auth.service';

const router = Router();
const authService = new AuthService();
const cookieName = 'qualifyme_session_v1';

function readSessionToken(request: Request): string | null {
  const cookiePrefix = `${cookieName}=`;
  const cookie = (request.headers.cookie ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(cookiePrefix));

  return cookie ? cookie.slice(cookiePrefix.length) : null;
}

function setSessionCookie(response: Response, token: string): void {
  response.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_MS,
  });
}

function clearSessionCookie(response: Response): void {
  response.clearCookie(cookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

function sendError(response: Response, error: unknown): void {
  if (error instanceof AuthError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error('Authentication request failed:', error);
  response.status(500).json({
    message: 'Something went wrong. Please try again.',
  });
}

router.post('/register', async (request, response) => {
  try {
    const result = await authService.register(request.body);
    setSessionCookie(response, result.token);
    response.status(201).json({ user: result.user });
  } catch (error) {
    sendError(response, error);
  }
});

router.post('/login', async (request, response) => {
  try {
    const result = await authService.login(request.body);
    setSessionCookie(response, result.token);
    response.json({ user: result.user });
  } catch (error) {
    sendError(response, error);
  }
});

router.get('/me', async (request, response) => {
  try {
    const user = await authService.getCurrentUser(
      readSessionToken(request),
    );

    if (!user) {
      clearSessionCookie(response);
    }

    response.json({ user });
  } catch (error) {
    sendError(response, error);
  }
});

router.post('/logout', async (request, response) => {
  try {
    await authService.logout(readSessionToken(request));
    clearSessionCookie(response);
    response.status(204).end();
  } catch (error) {
    sendError(response, error);
  }
});

export default router;