import 'dotenv/config';
import { db } from './prisma/db';
import {
  OpportunityRepository,
  type OpportunityRecord,
} from './repositories/opportunity.repository';

const demoOpportunities: OpportunityRecord[] = [
  {
    id: 'demo-scholarship',
    title: 'Demo merit scholarship',
    type: 'scholarship',
    provider: 'Demo provider',
    location: 'India',
    deadline: '2026-12-15',
    description: 'Sample scholarship record for development.',
  },
  {
    id: 'demo-scheme',
    title: 'Demo student support scheme',
    type: 'scheme',
    provider: 'Demo government department',
    location: 'Maharashtra',
    deadline: '2026-12-20',
    description: 'Sample scheme record for development.',
  },
  {
    id: 'demo-internship',
    title: 'Demo software internship',
    type: 'internship',
    provider: 'Demo employer',
    location: 'Remote',
    deadline: '2027-01-10',
    description: 'Sample internship record for development.',
  },
  {
    id: 'demo-job',
    title: 'Demo graduate trainee role',
    type: 'job',
    provider: 'Demo employer',
    location: 'India',
    deadline: '2027-01-20',
    description: 'Sample job record for development.',
  },
];

const opportunityRepository = new OpportunityRepository();

try {
  await opportunityRepository.upsertMany(demoOpportunities);
  console.log(`Saved ${demoOpportunities.length} demo opportunities.`);
} finally {
  await db.close();
}