import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import {
  AuthRepository,
  type UserAccount,
} from '../repositories/auth.repository';

const SCRYPT_N = 2 ** 14;
const SCRYPT_R = 8;
const SCRYPT_P = 5;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_SALT_LENGTH = 16;

export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const SCRYPT_OPTIONS = {
  N: SCRYPT_N,
  r: SCRYPT_R,
  p: SCRYPT_P,
  maxmem: SCRYPT_MAX_MEMORY,
};

export type PublicUser = {
  id: number;
  email: string;
  name: string | null;
};

export type AuthResult = {
  user: PublicUser;
  token: string;
};

export class AuthError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

function derivePasswordKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      PASSWORD_KEY_LENGTH,
      SCRYPT_OPTIONS,
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(Buffer.from(derivedKey));
      },
    );
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(PASSWORD_SALT_LENGTH);
  const key = await derivePasswordKey(password, salt);

  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('hex'),
    key.toString('hex'),
  ].join('$');
}

async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [algorithm, n, r, p, saltHex, keyHex] = storedHash.split('$');

  if (
    algorithm !== 'scrypt' ||
    n !== String(SCRYPT_N) ||
    r !== String(SCRYPT_R) ||
    p !== String(SCRYPT_P) ||
    !/^[a-f0-9]{32}$/i.test(saltHex ?? '') ||
    !/^[a-f0-9]{128}$/i.test(keyHex ?? '')
  ) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const expectedKey = Buffer.from(keyHex, 'hex');
  const actualKey = await derivePasswordKey(password, salt);

  return timingSafeEqual(actualKey, expectedKey);
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function isValidEmail(email: string): boolean {
  return (
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export class AuthService {
  constructor(
    private readonly repository = new AuthRepository(),
  ) {}

  async register(input: unknown): Promise<AuthResult> {
    const body = isObject(input) ? input : {};
    const name =
      typeof body.name === 'string' ? body.name.trim() : '';
    const email =
      typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';
    const password =
      typeof body.password === 'string' ? body.password : '';

    if (!name || name.length > 80) {
      throw new AuthError(400, 'Enter a name up to 80 characters long.');
    }

    if (!isValidEmail(email)) {
      throw new AuthError(400, 'Enter a valid email address.');
    }

    const passwordLength = Array.from(password).length;

    if (passwordLength < 15 || passwordLength > 256) {
      throw new AuthError(
        400,
        'Choose a password between 15 and 256 characters.',
      );
    }

    const existingUser = await this.repository.findUserByEmail(email);

    if (existingUser) {
      throw new AuthError(409, 'An account with this email already exists.');
    }

    const passwordHash = await hashPassword(password);
    const user = await this.repository.createUser({
      name,
      email,
      passwordHash,
    });

    return this.startSession(user);
  }

  async login(input: unknown): Promise<AuthResult> {
    const body = isObject(input) ? input : {};
    const email =
      typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';
    const password =
      typeof body.password === 'string' ? body.password : '';

    if (
      !isValidEmail(email) ||
      !password ||
      Array.from(password).length > 256
    ) {
      throw new AuthError(401, 'Email or password is incorrect.');
    }

    const user = await this.repository.findUserByEmail(email);

    if (
      !user?.passwordHash ||
      !(await verifyPassword(password, user.passwordHash))
    ) {
      throw new AuthError(401, 'Email or password is incorrect.');
    }

    return this.startSession(user);
  }

  async getCurrentUser(token: string | null): Promise<PublicUser | null> {
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      return null;
    }

    const tokenHash = hashSessionToken(token);
    const session = await this.repository.findSessionByTokenHash(tokenHash);

    if (!session) {
      return null;
    }

    const expiresAt = Date.parse(session.expiresAt);

    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      await this.repository.deleteSessionByTokenHash(tokenHash);
      return null;
    }

    const user = await this.repository.findUserById(session.userId);

    return user ? this.toPublicUser(user) : null;
  }

  async logout(token: string | null): Promise<void> {
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      return;
    }

    await this.repository.deleteSessionByTokenHash(
      hashSessionToken(token),
    );
  }

  private async startSession(user: UserAccount): Promise<AuthResult> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(
      Date.now() + SESSION_DURATION_MS,
    ).toISOString();

    await this.repository.createSession({
      id: randomUUID(),
      tokenHash,
      userId: user.id,
      expiresAt,
    });

    return {
      user: this.toPublicUser(user),
      token,
    };
  }

  private toPublicUser(user: UserAccount): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}