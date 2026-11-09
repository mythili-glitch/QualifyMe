import {
  UserDataRepository,
  type ApplicationRecord,
  type ProfileData,
} from '../repositories/user-data.repository';

export class UserDataError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'UserDataError';
  }
}

const applicationStatuses = [
  'Interested',
  'Preparing documents',
  'Submitted',
  'Decision received',
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseOpportunityId(value: unknown): string {
  if (typeof value !== 'string') {
    throw new UserDataError(400, 'Invalid opportunity ID.');
  }

  const opportunityId = value.trim();

  if (!opportunityId || opportunityId.length > 200) {
    throw new UserDataError(400, 'Invalid opportunity ID.');
  }

  return opportunityId;
}

function parseProfile(input: unknown): ProfileData {
  if (!isObject(input)) {
    throw new UserDataError(400, 'Enter your profile details.');
  }

  const body = input;
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!name || name.length > 80) {
    throw new UserDataError(400, 'Enter a name up to 80 characters long.');
  }

  function optionalText(
    field: string,
    maxLength: number,
  ): string | null {
    const value = body[field];

    if (value === undefined || value === null) return null;

    if (typeof value !== 'string') {
      throw new UserDataError(400, `Check the ${field} field.`);
    }

    const cleanValue = value.trim();

    if (cleanValue.length > maxLength) {
      throw new UserDataError(400, `The ${field} field is too long.`);
    }

    return cleanValue || null;
  }

  const annualIncome = optionalText('annualIncome', 20);

  if (
    annualIncome !== null &&
    (!/^\d+(\.\d{1,2})?$/.test(annualIncome) ||
      Number(annualIncome) < 0)
  ) {
    throw new UserDataError(400, 'Enter annual income as a valid amount.');
  }

  const marks = optionalText('marks', 8);

  if (
    marks !== null &&
    (!/^\d+(\.\d{1,2})?$/.test(marks) ||
      Number(marks) < 0 ||
      Number(marks) > 100)
  ) {
    throw new UserDataError(400, 'Enter marks between 0 and 100.');
  }

  return {
    name,
    state: optionalText('state', 100),
    education: optionalText('education', 100),
    category: optionalText('category', 50),
    annualIncome,
    marks,
    skills: optionalText('skills', 500),
    interests: optionalText('interests', 500),
  };
}

function parseApplicationStatus(value: unknown): ApplicationStatus {
  if (
    typeof value !== 'string' ||
    !applicationStatuses.includes(value as ApplicationStatus)
  ) {
    throw new UserDataError(400, 'Choose a valid application status.');
  }

  return value as ApplicationStatus;
}

export class UserDataService {
  constructor(
    private readonly repository = new UserDataRepository(),
  ) {}

  getProfile(userId: number): Promise<ProfileData> {
    return this.repository.getProfile(userId);
  }

  async saveProfile(userId: number, input: unknown): Promise<ProfileData> {
    const profile = parseProfile(input);
    await this.repository.saveProfile(userId, profile);
    return profile;
  }

  getSavedIds(userId: number): Promise<string[]> {
    return this.repository.getSavedIds(userId);
  }

  async addSaved(
    userId: number,
    rawOpportunityId: unknown,
  ): Promise<string[]> {
    const opportunityId = parseOpportunityId(rawOpportunityId);

    if (!(await this.repository.opportunityExists(opportunityId))) {
      throw new UserDataError(404, 'That opportunity could not be found.');
    }

    await this.repository.addSaved(userId, opportunityId);
    return this.repository.getSavedIds(userId);
  }

  async removeSaved(
    userId: number,
    rawOpportunityId: unknown,
  ): Promise<string[]> {
    const opportunityId = parseOpportunityId(rawOpportunityId);
    await this.repository.removeSaved(userId, opportunityId);
    return this.repository.getSavedIds(userId);
  }

  getApplications(userId: number): Promise<ApplicationRecord[]> {
    return this.repository.getApplications(userId);
  }

  async startApplication(
    userId: number,
    rawOpportunityId: unknown,
  ): Promise<ApplicationRecord> {
    const opportunityId = parseOpportunityId(rawOpportunityId);

    if (!(await this.repository.opportunityExists(opportunityId))) {
      throw new UserDataError(404, 'That opportunity could not be found.');
    }

    return this.repository.startApplication(userId, opportunityId);
  }

  async updateApplicationStatus(
    userId: number,
    rawOpportunityId: unknown,
    rawStatus: unknown,
  ): Promise<ApplicationRecord> {
    const opportunityId = parseOpportunityId(rawOpportunityId);
    const status = parseApplicationStatus(rawStatus);

    const application = await this.repository.updateApplicationStatus(
      userId,
      opportunityId,
      status,
    );

    if (!application) {
      throw new UserDataError(404, 'Start tracking this opportunity first.');
    }

    return application;
  }
}