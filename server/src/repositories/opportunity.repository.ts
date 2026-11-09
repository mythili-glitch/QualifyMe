import { db } from '../prisma/db';

export type OpportunityRecord = {
  id: string;
  title: string;
  type: string;
  provider: string;
  location: string;
  deadline: string;
  description: string;
};

export class OpportunityRepository {
  async findAll(): Promise<OpportunityRecord[]> {
    const opportunities = await db.orm.public.Opportunity
      .select(
        'id',
        'title',
        'type',
        'provider',
        'location',
        'deadline',
        'description',
      )
      .orderBy((opportunity) => opportunity.deadline.asc())
      .all();

    return opportunities;
  }

  async upsertMany(opportunities: OpportunityRecord[]): Promise<void> {
    for (const opportunity of opportunities) {
      await db.orm.public.Opportunity.upsert({
        create: opportunity,
        update: {
          title: opportunity.title,
          type: opportunity.type,
          provider: opportunity.provider,
          location: opportunity.location,
          deadline: opportunity.deadline,
          description: opportunity.description,
        },
        conflictOn: { id: opportunity.id },
      });
    }
  }
}