import { Router, type Response } from 'express';
import {
  requireAuth,
  type AuthenticatedLocals,
} from '../middleware/require-auth';
import {
  UserDataError,
  UserDataService,
} from '../services/user-data.service';

const router = Router();
const userDataService = new UserDataService();

function getUserId(response: Response): number {
  return (response.locals as AuthenticatedLocals).authUser.id;
}

function sendError(response: Response, error: unknown): void {
  if (error instanceof UserDataError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error('User data request failed:', error);
  response.status(500).json({
    message: 'Could not complete that request.',
  });
}

router.use(requireAuth);

router.get('/profile', async (_request, response) => {
  try {
    const profile = await userDataService.getProfile(getUserId(response));
    response.json({ profile });
  } catch (error) {
    sendError(response, error);
  }
});

router.put('/profile', async (request, response) => {
  try {
    const profile = await userDataService.saveProfile(
      getUserId(response),
      request.body,
    );
    response.json({ profile });
  } catch (error) {
    sendError(response, error);
  }
});

router.get('/saved', async (_request, response) => {
  try {
    const savedIds = await userDataService.getSavedIds(getUserId(response));
    response.json({ savedIds });
  } catch (error) {
    sendError(response, error);
  }
});

router.put('/saved/:opportunityId', async (request, response) => {
  try {
    const savedIds = await userDataService.addSaved(
      getUserId(response),
      request.params.opportunityId,
    );
    response.json({ savedIds });
  } catch (error) {
    sendError(response, error);
  }
});

router.delete('/saved/:opportunityId', async (request, response) => {
  try {
    const savedIds = await userDataService.removeSaved(
      getUserId(response),
      request.params.opportunityId,
    );
    response.json({ savedIds });
  } catch (error) {
    sendError(response, error);
  }
});

router.get('/applications', async (_request, response) => {
  try {
    const applications = await userDataService.getApplications(
      getUserId(response),
    );
    response.json({ applications });
  } catch (error) {
    sendError(response, error);
  }
});

router.post('/applications/:opportunityId', async (request, response) => {
  try {
    const application = await userDataService.startApplication(
      getUserId(response),
      request.params.opportunityId,
    );
    response.json({ application });
  } catch (error) {
    sendError(response, error);
  }
});

router.put('/applications/:opportunityId', async (request, response) => {
  try {
    const application = await userDataService.updateApplicationStatus(
      getUserId(response),
      request.params.opportunityId,
      request.body?.status,
    );
    response.json({ application });
  } catch (error) {
    sendError(response, error);
  }
});

export default router;