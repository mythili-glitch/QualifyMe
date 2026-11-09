import { db } from '../prisma/db';

export type ProfileData = {
  name: string;
  state: string | null;
  education: string | null;
  category: string | null;
  annualIncome: string | null;
  marks: string | null;
  skills: string | null;
  interests: string | null;
};

export type ApplicationRecord = {
  opportunityId: string;
  status: string;
};

export class UserDataRepository {
  async getProfile(userId: number): Promise<ProfileData> {
    const [user, profile] = await Promise.all([
      db.orm.public.User
        .where({ id: userId })
        .select('name')
        .first(),
      db.orm.public.Profile
        .where({ userId })
        .select(
          'state',
          'education',
          'category',
          'annualIncome',
          'marks',
          'skills',
          'interests',
        )
        .first(),
    ]);

    return {
      name: user?.name ?? '',
      state: profile?.state ?? null,
      education: profile?.education ?? null,
      category: profile?.category ?? null,
      annualIncome: profile?.annualIncome ?? null,
      marks: profile?.marks ?? null,
      skills: profile?.skills ?? null,
      interests: profile?.interests ?? null,
    };
  }

  async saveProfile(userId: number, profile: ProfileData): Promise<void> {
    const { name, ...fields } = profile;

    await db.transaction(async (tx) => {
      await tx.orm.public.User
        .where({ id: userId })
        .update({ name });

      await tx.orm.public.Profile.upsert({
        create: {
          userId,
          ...fields,
        },
        update: fields,
        conflictOn: { userId },
      });
    });
  }

  async getSavedIds(userId: number): Promise<string[]> {
    const records = await db.orm.public.SavedOpportunity
      .where({ userId })
      .select('opportunityId')
      .all();

    return records.map((record) => record.opportunityId);
  }

  async opportunityExists(opportunityId: string): Promise<boolean> {
    const opportunity = await db.orm.public.Opportunity
      .where({ id: opportunityId })
      .select('id')
      .first();

    return opportunity !== null;
  }

  async addSaved(userId: number, opportunityId: string): Promise<void> {
    const existing = await db.orm.public.SavedOpportunity
      .where({ userId, opportunityId })
      .select('id')
      .first();

    if (!existing) {
      await db.orm.public.SavedOpportunity.create({
        userId,
        opportunityId,
      });
    }
  }

  async removeSaved(userId: number, opportunityId: string): Promise<void> {
    await db.orm.public.SavedOpportunity
      .where({ userId, opportunityId })
      .delete();
  }

  async getApplications(userId: number): Promise<ApplicationRecord[]> {
    return db.orm.public.Application
      .where({ userId })
      .select('opportunityId', 'status')
      .orderBy((application) => application.createdAt.desc())
      .all();
  }

  async getApplication(
    userId: number,
    opportunityId: string,
  ): Promise<ApplicationRecord | null> {
    return db.orm.public.Application
      .where({ userId, opportunityId })
      .select('opportunityId', 'status')
      .first();
  }

  async startApplication(
    userId: number,
    opportunityId: string,
  ): Promise<ApplicationRecord> {
    const existing = await this.getApplication(userId, opportunityId);

    if (existing) return existing;

    return db.orm.public.Application
      .select('opportunityId', 'status')
      .create({
        userId,
        opportunityId,
        status: 'Interested',
      });
  }

  async updateApplicationStatus(
    userId: number,
    opportunityId: string,
    status: string,
  ): Promise<ApplicationRecord | null> {
    await db.orm.public.Application
      .where({ userId, opportunityId })
      .update({ status });

    return this.getApplication(userId, opportunityId);
  }
}