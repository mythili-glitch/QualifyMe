import 'dotenv/config';
import { db } from './prisma/db';

const email = `qualifyme-${Date.now()}@example.com`;

await db.orm.public.User.create({ email });

const users = await db.orm.public.User.select('id', 'email').all();

console.dir(users, { depth: null });

await db.close();