import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import authRouter from './routes/auth.routes.js';
import userDataRouter from './routes/user-data.routes.js';
import { OpportunityRepository } from './repositories/opportunity.repository';

const app = express();
const port = Number(process.env.PORT) || 3001;
const opportunityRepository = new OpportunityRepository();

app.disable('x-powered-by');

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }),
);

app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    message: 'QualifyMe API is running',
  });
});

// Keep this public route before the authenticated user-data router.
app.get('/api/opportunities', async (_request, response) => {
  try {
    const opportunities = await opportunityRepository.findAll();
    response.json(opportunities);
  } catch (error) {
    console.error('Could not load opportunities:', error);
    response.status(500).json({
      message: 'Could not load opportunities.',
    });
  }
});

app.use('/api/auth', authRouter);
app.use('/api', userDataRouter);

app.listen(port, () => {
  console.log(`QualifyMe API listening at http://localhost:${port}`);
});