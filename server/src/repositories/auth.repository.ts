import { db } from '../prisma/db';

export type UserAccount = {
  id: number;
  email: string;
  name: string | null;
  passwordHash: string | null;
};

export type SessionRecord = {
  id: string;
  tokenHash: string;
  userId: number;
  expiresAt: string;
};

export class AuthRepository {
  async findUserByEmail(email: string): Promise<UserAccount | null> {
    return db.orm.public.User
      .where({ email })
      .select('id', 'email', 'name', 'passwordHash')
      .first();
  }

  async findUserById(id: number): Promise<UserAccount | null> {
    return db.orm.public.User
      .where({ id })
      .select('id', 'email', 'name', 'passwordHash')
      .first();
  }

  async createUser(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<UserAccount> {
    return db.orm.public.User
      .select('id', 'email', 'name', 'passwordHash')
      .create(input);
  }

  async createSession(session: SessionRecord): Promise<void> {
    await db.orm.public.Session.create(session);
  }

  async findSessionByTokenHash(
    tokenHash: string,
  ): Promise<SessionRecord | null> {
    return db.orm.public.Session
      .where({ tokenHash })
      .select('id', 'tokenHash', 'userId', 'expiresAt')
      .first();
  }

  async deleteSessionByTokenHash(tokenHash: string): Promise<void> {
    await db.orm.public.Session.where({ tokenHash }).delete();
  }
}