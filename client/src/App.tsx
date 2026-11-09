import { useEffect, useState, type FormEvent } from 'react';
import './App.css';

const API_BASE = 'http://localhost:3001/api';

type ApiOpportunityType =
  | 'scholarship'
  | 'scheme'
  | 'internship'
  | 'job';

type ApiOpportunity = {
  id: string;
  title: string;
  type: ApiOpportunityType;
  provider: string;
  location: string;
  deadline: string;
  description: string;
};

type Opportunity = {
  id: string;
  name: string;
  type: string;
  location: string;
  state: string;
  deadline: string;
  reason: string;
  provider: string;
  benefit: string;
  criteria: string[];
  documents: string[];
};

type ApplicationStatus =
  | 'Interested'
  | 'Preparing documents'
  | 'Submitted'
  | 'Decision received';

type UserProfile = {
  name: string;
  state: string;
  education: string;
  category: string;
  annualIncome: string;
  marks: string;
  skills: string;
  interests: string;
};

type ApiProfile = {
  name: string;
  state: string | null;
  education: string | null;
  category: string | null;
  annualIncome: string | null;
  marks: string | null;
  skills: string | null;
  interests: string | null;
};

type PublicUser = {
  id: number;
  email: string;
  name: string | null;
};

type AuthMode = 'login' | 'register';

type AuthSubmission = {
  mode: AuthMode;
  name: string;
  email: string;
  password: string;
};

type DataStateProps = {
  isLoading: boolean;
  loadError: string;
  onRetry: () => void;
};

const emptyProfile: UserProfile = {
  name: '',
  state: '',
  education: '',
  category: '',
  annualIncome: '',
  marks: '',
  skills: '',
  interests: '',
};

const opportunityTypeLabels: Record<ApiOpportunityType, string> = {
  scholarship: 'Scholarship',
  scheme: 'Government scheme',
  internship: 'Internship',
  job: 'Job',
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return (
    value === 'Interested' ||
    value === 'Preparing documents' ||
    value === 'Submitted' ||
    value === 'Decision received'
  );
}

async function requestApi<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    ...(body === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
  });

  let payload: unknown = null;

  if (response.status !== 204) {
    payload = await response.json().catch(() => null);
  }

  if (!response.ok) {
    const message =
      isObject(payload) && typeof payload.message === 'string'
        ? payload.message
        : 'Could not complete that request. Please try again.';

    throw new Error(message);
  }

  return payload as T;
}

function isApiOpportunity(value: unknown): value is ApiOpportunity {
  if (!isObject(value)) return false;

  const validTypes = ['scholarship', 'scheme', 'internship', 'job'];

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.type === 'string' &&
    validTypes.includes(value.type) &&
    typeof value.provider === 'string' &&
    typeof value.location === 'string' &&
    typeof value.deadline === 'string' &&
    typeof value.description === 'string'
  );
}

function formatDeadline(deadline: string): string {
  const match = deadline.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 'Check provider';

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const deadlineDate = new Date(Date.UTC(year, month - 1, day));

  if (
    deadlineDate.getUTCFullYear() !== year ||
    deadlineDate.getUTCMonth() !== month - 1 ||
    deadlineDate.getUTCDate() !== day
  ) {
    return 'Check provider';
  }

  const today = new Date();
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const daysLeft = Math.round(
    (deadlineDate.getTime() - todayUtc) / (1000 * 60 * 60 * 24),
  );

  if (daysLeft < 0) return 'Passed';
  if (daysLeft === 0) return 'Today';
  if (daysLeft === 1) return 'In 1 day';

  return `In ${daysLeft} days`;
}

function mapApiOpportunity(item: ApiOpportunity): Opportunity {
  return {
    id: item.id,
    name: item.title,
    type: opportunityTypeLabels[item.type],
    location: item.location === 'India' ? 'Across India' : item.location,
    state: item.location === 'India' ? 'All India' : item.location,
    deadline: formatDeadline(item.deadline),
    reason:
      'Demo listing loaded from your backend. Check the official provider for eligibility and deadline details.',
    provider: item.provider,
    benefit: item.description,
    criteria: ['Example eligibility details have not been verified.'],
    documents: ['Check the official provider for required documents.'],
  };
}

function mapApiProfile(profile: ApiProfile): UserProfile {
  return {
    name: profile.name ?? '',
    state: profile.state ?? '',
    education: profile.education ?? '',
    category: profile.category ?? '',
    annualIncome: profile.annualIncome ?? '',
    marks: profile.marks ?? '',
    skills: profile.skills ?? '',
    interests: profile.interests ?? '',
  };
}

function ApiNotice({
  isLoading,
  loadError,
  onRetry,
}: DataStateProps) {
  if (isLoading) {
    return (
      <div className="panel empty-state" role="status">
        <h2>Loading opportunities…</h2>
        <p className="muted">Connecting to the QualifyMe API.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="panel empty-state" role="alert">
        <h2>Couldn’t load opportunities</h2>
        <p className="muted">{loadError}</p>
        <button
          className="primary-button"
          type="button"
          onClick={onRetry}
          style={{ marginTop: 18 }}
        >
          Try again
        </button>
      </div>
    );
  }

  return null;
}

function AuthPage({
  onSubmit,
  initialMessage,
}: {
  onSubmit: (submission: AuthSubmission) => Promise<void>;
  initialMessage: string;
}) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onSubmit({ mode, name, email, password });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError('');
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <a className="auth-brand" href="/" aria-label="QualifyMe home">
          <img
            className="auth-logo"
            src="/qualifyme-logo.png"
            alt="QualifyMe"
          />
        </a>

        <p className="eyebrow auth-eyebrow">YOUR OPPORTUNITY SPACE</p>
        <h1 className="auth-title">
          {mode === 'login' ? 'Welcome back' : 'Make your next move'}
        </h1>
        <p className="muted auth-description">
          {mode === 'login'
            ? 'Sign in to continue exploring opportunities across India.'
            : 'Create an account to keep your opportunities in one place.'}
        </p>

        <div className="auth-mode-switch" aria-label="Account access">
          <button
            type="button"
            className={mode === 'login' ? 'selected' : ''}
            aria-pressed={mode === 'login'}
            onClick={() => changeMode('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'selected' : ''}
            aria-pressed={mode === 'register'}
            onClick={() => changeMode('register')}
          >
            Create account
          </button>
        </div>

        {initialMessage ? (
          <div className="auth-message" role="status">
            {initialMessage}
          </div>
        ) : null}

        {error ? (
          <div className="auth-error" role="alert">
            {error}
          </div>
        ) : null}

        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' ? (
            <label className="auth-field">
              <span>Your name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                autoComplete="name"
                maxLength={80}
                required
              />
            </label>
          ) : null}

          <label className="auth-field">
            <span>Email address</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <span className="auth-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={
                  mode === 'register'
                    ? 'Create a password'
                    : 'Enter your password'
                }
                autoComplete={
                  mode === 'register' ? 'new-password' : 'current-password'
                }
                minLength={mode === 'register' ? 15 : undefined}
                maxLength={256}
                required
              />
              <button
                className="auth-password-toggle"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </span>
            {mode === 'register' ? (
              <small>Use at least 15 characters.</small>
            ) : null}
          </label>

          <button
            className="primary-button auth-submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Please wait…'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <p className="auth-switch-copy">
          {mode === 'login' ? 'New to QualifyMe?' : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() =>
              changeMode(mode === 'login' ? 'register' : 'login')
            }
          >
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </button>
        </p>

        <div className="auth-note">
          Explore scholarships, government schemes, internships, and jobs in
          one place.
        </div>
      </section>
    </main>
  );
}

type ListingProps = {
  savedIds: string[];
  onToggleSave: (id: string) => void;
  onViewDetails: (item: Opportunity) => void;
};

function OpportunityCard({
  item,
  isSaved,
  onToggleSave,
  onViewDetails,
}: {
  item: Opportunity;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onViewDetails: (item: Opportunity) => void;
}) {
  return (
    <article className="opportunity-card">
      <div className="card-heading">
        <div>
          <span className="type-label">{item.type}</span>
          <h3>{item.name}</h3>
          <p className="muted">{item.location}</p>
        </div>

        <button
          className="save-button"
          type="button"
          aria-label={
            isSaved
              ? `Remove ${item.name} from saved`
              : `Save ${item.name}`
          }
          aria-pressed={isSaved}
          onClick={() => onToggleSave(item.id)}
        >
          {isSaved ? '♥' : '♡'}
        </button>
      </div>

      <div className="fit-note">
        <strong>Why this may fit</strong>
        <p>{item.reason}</p>
      </div>

      <div className="card-footer">
        <span>◷ &nbsp;Deadline: {item.deadline}</span>
        <button
          className="text-button"
          type="button"
          onClick={() => onViewDetails(item)}
        >
          View details →
        </button>
      </div>
    </article>
  );
}

function ExplorePage({
  opportunities,
  isLoading,
  loadError,
  savedIds,
  onToggleSave,
  onViewDetails,
}: ListingProps &
  DataStateProps & {
    opportunities: Opportunity[];
  }) {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All opportunities');
  const [selectedState, setSelectedState] = useState('All locations');

  const categories = [
    'All opportunities',
    'Scholarship',
    'Government scheme',
    'Internship',
    'Job',
  ];

  const locationOptions = Array.from(
    new Set(
      opportunities
        .map((item) => item.state)
        .filter((state) => state !== 'All India'),
    ),
  );

  const filteredOpportunities = opportunities.filter((item) => {
    const matchesSearch = `${item.name} ${item.type} ${item.location}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesType =
      selectedType === 'All opportunities' || item.type === selectedType;

    const matchesState =
      selectedState === 'All locations' ||
      item.state === 'All India' ||
      item.state === selectedState;

    return matchesSearch && matchesType && matchesState;
  });

  return (
    <section className="explore-page">
      <div className="explore-heading">
        <p className="eyebrow">DISCOVER</p>
        <h1>Explore opportunities</h1>
        <p className="muted">
          Search scholarships, schemes, internships, and jobs across India.
        </p>
      </div>

      <div className="explore-controls">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search by name or location"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label className="state-filter">
          <span>Location</span>
          <select
            value={selectedState}
            onChange={(event) => setSelectedState(event.target.value)}
          >
            <option>All locations</option>
            {locationOptions.map((location) => (
              <option key={location}>{location}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="category-filters" aria-label="Filter by opportunity type">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={`category-button ${
              selectedType === category ? 'selected' : ''
            }`}
            onClick={() => setSelectedType(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="results-heading">
        <h2>Available listings</h2>
        <span>{filteredOpportunities.length} found</span>
      </div>

      {!isLoading &&
        !loadError &&
        (filteredOpportunities.length > 0 ? (
          <div className="opportunity-grid">
            {filteredOpportunities.map((item) => (
              <OpportunityCard
                key={item.id}
                item={item}
                isSaved={savedIds.includes(item.id)}
                onToggleSave={onToggleSave}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        ) : (
          <div className="panel empty-state">
            <h2>No listings found</h2>
            <p className="muted">Try changing your search or filters.</p>
          </div>
        ))}
    </section>
  );
}

function SavedPage({
  savedItems,
  isLoading,
  loadError,
  savedIds,
  onToggleSave,
  onViewDetails,
  onExplore,
}: ListingProps &
  DataStateProps & {
    savedItems: Opportunity[];
    onExplore: () => void;
  }) {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const comparedItems = savedItems.filter((item) =>
    compareIds.includes(item.id),
  );

  const comparisonRows: {
    label: string;
    getValue: (item: Opportunity) => string;
  }[] = [
    { label: 'Type', getValue: (item) => item.type },
    { label: 'Location', getValue: (item) => item.location },
    { label: 'Benefit', getValue: (item) => item.benefit },
    { label: 'Deadline', getValue: (item) => item.deadline },
    {
      label: 'Example criteria',
      getValue: (item) => item.criteria.join(' · '),
    },
    {
      label: 'Documents',
      getValue: (item) => item.documents.join(' · '),
    },
  ];

  function toggleCompare(id: string) {
    setCompareIds((current) => {
      if (current.includes(id)) {
        return current.filter((itemId) => itemId !== id);
      }
      if (current.length >= 3) return current;
      return [...current, id];
    });
  }

  return (
    <section className="explore-page">
      <div className="explore-heading">
        <p className="eyebrow">YOUR SHORTLIST</p>
        <h1>Saved opportunities</h1>
        <p className="muted">
          Keep interesting opportunities handy while you review their details.
        </p>
      </div>

      {!isLoading &&
        !loadError &&
        (savedItems.length > 0 ? (
          <>
            <section className="panel compare-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">MAKE A DECISION</p>
                  <h2>Compare opportunities</h2>
                </div>
                <span className="compare-count">
                  {comparedItems.length} of 3 selected
                </span>
              </div>

              <p className="muted">
                Choose two or three saved opportunities to compare them side by
                side.
              </p>

              <div className="compare-options">
                {savedItems.map((item) => (
                  <label className="compare-option" key={item.id}>
                    <input
                      type="checkbox"
                      checked={compareIds.includes(item.id)}
                      disabled={
                        !compareIds.includes(item.id) && compareIds.length >= 3
                      }
                      onChange={() => toggleCompare(item.id)}
                    />
                    <span>{item.name}</span>
                    <small>{item.type}</small>
                  </label>
                ))}
              </div>

              {comparedItems.length >= 2 ? (
                <div className="compare-table-wrap">
                  <table className="compare-table">
                    <thead>
                      <tr>
                        <th>Details</th>
                        {comparedItems.map((item) => (
                          <th key={item.id}>{item.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map((row) => (
                        <tr key={row.label}>
                          <th>{row.label}</th>
                          {comparedItems.map((item) => (
                            <td key={item.id}>{row.getValue(item)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="compare-hint">
                  Select at least two opportunities to see the comparison.
                </p>
              )}
            </section>

            <div className="opportunity-grid">
              {savedItems.map((item) => (
                <OpportunityCard
                  key={item.id}
                  item={item}
                  isSaved={savedIds.includes(item.id)}
                  onToggleSave={onToggleSave}
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="panel empty-state">
            <h2>Your saved list is empty</h2>
            <p className="muted">Save an opportunity to find it here later.</p>
            <button
              className="primary-button"
              type="button"
              onClick={onExplore}
              style={{ marginTop: 18 }}
            >
              Explore opportunities
            </button>
          </div>
        ))}
    </section>
  );
}

function ApplicationsPage({
  opportunities,
  statuses,
  isLoading,
  loadError,
  onStatusChange,
  onViewDetails,
  onExplore,
}: DataStateProps & {
  opportunities: Opportunity[];
  statuses: Partial<Record<string, ApplicationStatus>>;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onViewDetails: (item: Opportunity) => void;
  onExplore: () => void;
}) {
  const trackedItems = opportunities.filter((item) => statuses[item.id]);

  const progressByStatus: Record<ApplicationStatus, number> = {
    Interested: 15,
    'Preparing documents': 45,
    Submitted: 80,
    'Decision received': 100,
  };

  return (
    <section className="explore-page">
      <div className="explore-heading">
        <p className="eyebrow">KEEP YOUR MOMENTUM</p>
        <h1>My applications</h1>
        <p className="muted">
          Track your next steps for opportunities you’re applying to.
        </p>
      </div>

      {!isLoading &&
        !loadError &&
        (trackedItems.length > 0 ? (
          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Opportunity</th>
                  <th>Type</th>
                  <th>My status</th>
                  <th>Progress</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {trackedItems.map((item) => {
                  const status = statuses[item.id];
                  if (!status) return null;

                  const progress = progressByStatus[status];

                  return (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.type}</td>
                      <td>
                        <select
                          className="tracker-select"
                          value={status}
                          onChange={(event) =>
                            onStatusChange(
                              item.id,
                              event.target.value as ApplicationStatus,
                            )
                          }
                        >
                          <option>Interested</option>
                          <option>Preparing documents</option>
                          <option>Submitted</option>
                          <option>Decision received</option>
                        </select>
                      </td>
                      <td>
                        <div
                          className="tracker-progress"
                          role="progressbar"
                          aria-label={`${item.name} progress`}
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <span style={{ width: `${progress}%` }} />
                        </div>
                        <small>{progress}%</small>
                      </td>
                      <td>
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => onViewDetails(item)}
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel empty-state">
            <h2>No applications being tracked yet</h2>
            <p className="muted">
              Open an opportunity and choose “Track application” to add it here.
            </p>
            <button
              className="primary-button"
              type="button"
              onClick={onExplore}
              style={{ marginTop: 18 }}
            >
              Explore opportunities
            </button>
          </div>
        ))}
    </section>
  );
}

function ProfilePage({
  profile,
  onSave,
}: {
  profile: UserProfile;
  onSave: (profile: UserProfile) => Promise<void>;
}) {
  const [form, setForm] = useState(profile);
  const [savedMessage, setSavedMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  function updateField(field: keyof UserProfile, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSavedMessage('');
    setError('');
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavedMessage('');
    setError('');
    setIsSaving(true);

    try {
      await onSave(form);
      setSavedMessage('Profile saved to your account.');
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save your profile. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="explore-page">
      <div className="explore-heading">
        <p className="eyebrow">PERSONALIZE YOUR RESULTS</p>
        <h1>Your profile</h1>
        <p className="muted">
          Share only the details you want to use for opportunity matching.
        </p>
      </div>

      <div className="profile-layout">
        <form className="panel profile-form" onSubmit={submitProfile}>
          <h2>Education and interests</h2>
          <p className="muted">
            Income and category are optional. We’ll use details like these to
            explain possible matches.
          </p>

          <div className="profile-fields">
            <label className="profile-field">
              <span>Name</span>
              <input
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Your name"
                autoComplete="name"
                maxLength={80}
                required
              />
            </label>

            <label className="profile-field">
              <span>State or union territory</span>
              <select
                value={form.state}
                onChange={(event) => updateField('state', event.target.value)}
              >
                <option value="">Choose a location</option>
                <option>Andhra Pradesh</option>
                <option>Delhi</option>
                <option>Karnataka</option>
                <option>Kerala</option>
                <option>Maharashtra</option>
                <option>Tamil Nadu</option>
                <option>Telangana</option>
                <option>Uttar Pradesh</option>
                <option>West Bengal</option>
                <option>Other</option>
              </select>
            </label>

            <label className="profile-field">
              <span>Current education level</span>
              <select
                value={form.education}
                onChange={(event) =>
                  updateField('education', event.target.value)
                }
              >
                <option value="">Choose a level</option>
                <option>School</option>
                <option>Undergraduate</option>
                <option>Postgraduate</option>
                <option>Vocational</option>
                <option>Other</option>
              </select>
            </label>

            <label className="profile-field">
              <span>Skills</span>
              <input
                value={form.skills}
                onChange={(event) => updateField('skills', event.target.value)}
                placeholder="For example: design, Java, writing"
                maxLength={500}
              />
            </label>

            <label className="profile-field">
              <span>Interests</span>
              <input
                value={form.interests}
                onChange={(event) =>
                  updateField('interests', event.target.value)
                }
                placeholder="For example: public service, technology"
                maxLength={500}
              />
            </label>

            <label className="profile-field">
              <span>
                Category <small>(optional)</small>
              </span>
              <select
                value={form.category}
                onChange={(event) =>
                  updateField('category', event.target.value)
                }
              >
                <option value="">Prefer not to say</option>
                <option>General</option>
                <option>OBC</option>
                <option>SC</option>
                <option>ST</option>
                <option>EWS</option>
                <option>Other</option>
              </select>
            </label>

            <label className="profile-field">
              <span>
                Annual family income <small>(optional)</small>
              </span>
              <input
                type="number"
                min="0"
                value={form.annualIncome}
                onChange={(event) =>
                  updateField('annualIncome', event.target.value)
                }
                placeholder="Amount in ₹"
              />
            </label>

            <label className="profile-field">
              <span>
                Most recent marks <small>(optional)</small>
              </span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.marks}
                onChange={(event) => updateField('marks', event.target.value)}
                placeholder="Percentage"
              />
            </label>
          </div>

          {error ? (
            <div className="auth-error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="profile-form-footer">
            <span className="muted">
              {savedMessage || 'You can update this anytime.'}
            </span>
            <button
              className="primary-button"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>

        <aside className="panel profile-privacy">
          <p className="eyebrow">YOUR CONTROL</p>
          <h2>Profile details</h2>
          <p className="muted">
            Your profile is saved to your account. Optional details help explain
            possible matches.
          </p>
          <div className="sample-note">
            QualifyMe match results are guidance. Always confirm eligibility
            with the official provider.
          </div>
        </aside>
      </div>
    </section>
  );
}

function OpportunityDetails({
  item,
  isSaved,
  applicationStatus,
  onToggleSave,
  onTrack,
  onBack,
}: {
  item: Opportunity;
  isSaved: boolean;
  applicationStatus: ApplicationStatus | undefined;
  onToggleSave: () => void;
  onTrack: () => void;
  onBack: () => void;
}) {
  const [checkedDocuments, setCheckedDocuments] = useState<string[]>([]);

  function toggleDocument(document: string) {
    setCheckedDocuments((current) =>
      current.includes(document)
        ? current.filter((entry) => entry !== document)
        : [...current, document],
    );
  }

  return (
    <section className="details-page">
      <button className="detail-back" type="button" onClick={onBack}>
        ← Back to opportunities
      </button>

      <div className="detail-heading">
        <div>
          <span className="type-label">{item.type}</span>
          <h1>{item.name}</h1>
          <p className="muted">
            {item.provider} · {item.location}
          </p>
        </div>

        <div>
          <button
            className="save-button"
            type="button"
            aria-label={isSaved ? 'Remove from saved' : 'Save opportunity'}
            aria-pressed={isSaved}
            onClick={onToggleSave}
          >
            {isSaved ? '♥' : '♡'}
          </button>

          <button className="primary-button" type="button" onClick={onTrack}>
            {applicationStatus
              ? 'View application progress'
              : 'Track application'}
          </button>

          <button className="primary-button" type="button" disabled>
            Official link pending verification
          </button>
        </div>
      </div>

      <div className="sample-note">
        Sample listing for layout practice. Replace these example details with
        information checked against an official provider.
      </div>

      <div className="detail-grid">
        <article className="panel detail-card">
          <p className="eyebrow">WHAT IT OFFERS</p>
          <h2>Benefits</h2>
          <p className="muted">{item.benefit}</p>

          <div className="detail-divider" />

          <p className="eyebrow">IMPORTANT DATE</p>
          <h2>Deadline</h2>
          <p className="deadline-tag detail-deadline">{item.deadline}</p>
        </article>

        <article className="panel detail-card">
          <p className="eyebrow">CHECK YOUR FIT</p>
          <h2>Example eligibility criteria</h2>
          <p className="muted">
            These sample criteria are not verified requirements.
          </p>

          <ul className="criteria-list">
            {item.criteria.map((criterion) => (
              <li key={criterion}>
                <span className="criteria-indicator">i</span>
                <span>{criterion}</span>
                <span className="criteria-status">Needs checking</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel detail-card document-card">
          <p className="eyebrow">GET READY</p>
          <h2>Document checklist</h2>
          <p className="muted">Tick items off as you prepare them.</p>

          <div className="document-list">
            {item.documents.map((document) => (
              <label className="document-row" key={document}>
                <input
                  type="checkbox"
                  checked={checkedDocuments.includes(document)}
                  onChange={() => toggleDocument(document)}
                />
                <span>{document}</span>
              </label>
            ))}
          </div>

          <p className="document-progress">
            {checkedDocuments.length} of {item.documents.length} ready
          </p>
        </article>
      </div>
    </section>
  );
}

function App() {
  const [authUser, setAuthUser] = useState<PublicUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  const [activePage, setActivePage] = useState('Overview');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);

  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [applicationStatuses, setApplicationStatuses] = useState<
    Partial<Record<string, ApplicationStatus>>
  >({});
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<Opportunity | null>(null);

  const [accountDataError, setAccountDataError] = useState('');
  const [accountDataReload, setAccountDataReload] = useState(0);

  const authUserId = authUser?.id;

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const result = await requestApi<{ user: PublicUser | null }>(
          '/auth/me',
        );

        if (active) {
          setAuthUser(result.user);
          if (result.user?.name) {
            setProfile({ ...emptyProfile, name: result.user.name });
          }
        }
      } catch {
        if (active) {
          setAuthMessage(
            'Could not reach the sign-in service. Make sure the backend is running.',
          );
        }
      } finally {
        if (active) setAuthChecked(true);
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOpportunities() {
      setIsLoading(true);
      setLoadError('');

      try {
        const response = await fetch(`${API_BASE}/opportunities`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('The API returned an error.');
        }

        const payload: unknown = await response.json();

        if (!Array.isArray(payload) || !payload.every(isApiOpportunity)) {
          throw new Error('The API returned an unexpected response.');
        }

        setOpportunities(payload.map(mapApiOpportunity));
      } catch {
        if (!controller.signal.aborted) {
          setOpportunities([]);
          setLoadError(
            'Check that your backend is running at http://localhost:3001, then try again.',
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadOpportunities();

    return () => controller.abort();
  }, [reloadVersion]);

  useEffect(() => {
    if (authUserId === undefined) return;

    let active = true;

    async function loadAccountData() {
      setAccountDataError('');

      try {
        const [profileResult, savedResult, applicationResult] =
          await Promise.all([
            requestApi<{ profile: ApiProfile }>('/profile'),
            requestApi<{ savedIds: string[] }>('/saved'),
            requestApi<{
              applications: { opportunityId: string; status: string }[];
            }>('/applications'),
          ]);

        if (!active) return;

        const nextProfile = mapApiProfile(profileResult.profile);
        setProfile(nextProfile);
        setSavedIds(savedResult.savedIds);

        const nextStatuses: Partial<
          Record<string, ApplicationStatus>
        > = {};

        for (const application of applicationResult.applications) {
          if (isApplicationStatus(application.status)) {
            nextStatuses[application.opportunityId] = application.status;
          }
        }

        setApplicationStatuses(nextStatuses);

        setAuthUser((current) =>
          current ? { ...current, name: nextProfile.name } : current,
        );
      } catch (error) {
        if (active) {
          setAccountDataError(
            error instanceof Error
              ? error.message
              : 'Could not load your account data.',
          );
        }
      }
    }

    void loadAccountData();

    return () => {
      active = false;
    };
  }, [authUserId, accountDataReload]);

  const navItems = ['Overview', 'Explore', 'Saved', 'Applications'];

  const requiredProfileFields: (keyof UserProfile)[] = [
    'name',
    'state',
    'education',
    'skills',
    'interests',
  ];

  const completedProfileFields = requiredProfileFields.filter((field) =>
    profile[field].trim(),
  ).length;

  const profileProgress = Math.round(
    (completedProfileFields / requiredProfileFields.length) * 100,
  );

  async function submitAuth(submission: AuthSubmission) {
    const endpoint =
      submission.mode === 'register' ? 'register' : 'login';

    const body =
      submission.mode === 'register'
        ? {
            name: submission.name,
            email: submission.email,
            password: submission.password,
          }
        : {
            email: submission.email,
            password: submission.password,
          };

    const result = await requestApi<{ user: PublicUser }>(
      `/auth/${endpoint}`,
      'POST',
      body,
    );

    if (!result.user) {
      throw new Error('Could not sign in. Please try again.');
    }

    setAuthUser(result.user);
    setAuthMessage('');
    setAccountDataError('');
    setProfile({
      ...emptyProfile,
      name: result.user.name ?? '',
    });
    setSavedIds([]);
    setApplicationStatuses({});
  }

  async function signOut() {
    try {
      await requestApi<void>('/auth/logout', 'POST');
    } catch {
      // Clear local account state even if the server cannot be reached.
    } finally {
      setAuthUser(null);
      setActivePage('Overview');
      setSelectedOpportunity(null);
      setSavedIds([]);
      setProfile(emptyProfile);
      setApplicationStatuses({});
      setAccountDataError('');
    }
  }

  function goToPage(page: string) {
    setSelectedOpportunity(null);
    setActivePage(page);
  }

  function openDetails(item: Opportunity) {
    setSelectedOpportunity(item);
  }

  async function toggleSaved(id: string) {
    const wasSaved = savedIds.includes(id);

    setSavedIds((current) =>
      wasSaved
        ? current.filter((savedId) => savedId !== id)
        : [...current, id],
    );

    try {
      const result = await requestApi<{ savedIds: string[] }>(
        `/saved/${encodeURIComponent(id)}`,
        wasSaved ? 'DELETE' : 'PUT',
      );
      setSavedIds(result.savedIds);
      setAccountDataError('');
    } catch (error) {
      setSavedIds((current) =>
        wasSaved
          ? current.includes(id)
            ? current
            : [...current, id]
          : current.filter((savedId) => savedId !== id),
      );
      setAccountDataError(
        error instanceof Error ? error.message : 'Could not update saved items.',
      );
    }
  }
  async function startTracking(item: Opportunity) {
  const existingStatus = applicationStatuses[item.id];

  if (!existingStatus) {
    setApplicationStatuses((current) => ({
      ...current,
      [item.id]: 'Interested',
    }));

    try {
      const result = await requestApi<{
        application: { opportunityId: string; status: string };
      }>(
        `/applications/${encodeURIComponent(item.id)}`,
        'POST',
      );

      const status = result.application.status;

      if (isApplicationStatus(status)) {
        setApplicationStatuses((current) => ({
          ...current,
          [item.id]: status,
        }));
      }

      setAccountDataError('');
    } catch (error) {
      setApplicationStatuses((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });

      setAccountDataError(
        error instanceof Error
          ? error.message
          : 'Could not start tracking this application.',
      );
      return;
    }
  }

  setSelectedOpportunity(null);
  setActivePage('Applications');
}

 

  async function updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
  ) {
    const previousStatus = applicationStatuses[id];

    setApplicationStatuses((current) => ({
      ...current,
      [id]: status,
    }));

    try {
      await requestApi(
        `/applications/${encodeURIComponent(id)}`,
        'PUT',
        { status },
      );
      setAccountDataError('');
    } catch (error) {
      setApplicationStatuses((current) => {
        const next = { ...current };

        if (previousStatus) {
          next[id] = previousStatus;
        } else {
          delete next[id];
        }

        return next;
      });

      setAccountDataError(
        error instanceof Error
          ? error.message
          : 'Could not update the application status.',
      );
    }
  }

  async function saveProfile(updatedProfile: UserProfile) {
    const result = await requestApi<{ profile: ApiProfile }>(
      '/profile',
      'PUT',
      updatedProfile,
    );

    const savedProfile = mapApiProfile(result.profile);
    setProfile(savedProfile);
    setAuthUser((current) =>
      current ? { ...current, name: savedProfile.name } : current,
    );
    setAccountDataError('');
  }

  const savedItems = opportunities.filter((item) => savedIds.includes(item.id));

  const dataState: DataStateProps = {
    isLoading,
    loadError,
    onRetry: () => setReloadVersion((current) => current + 1),
  };

  if (!authChecked) {
    return (
      <main className="auth-shell">
        <div className="auth-loading">Checking your QualifyMe account…</div>
      </main>
    );
  }

  if (!authUser) {
    return (
      <AuthPage
        onSubmit={submitAuth}
        initialMessage={authMessage}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            goToPage('Overview');
          }}
          aria-label="QualifyMe home"
        >
          <img
            className="brand-logo"
            src="/qualifyme-logo.png"
            alt="QualifyMe"
          />
        </a>

        <nav className="navigation" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item}
              className={`nav-button ${activePage === item ? 'active' : ''}`}
              type="button"
              aria-current={activePage === item ? 'page' : undefined}
              onClick={() => goToPage(item)}
            >
              {item}
              {item === 'Saved' && savedIds.length > 0
                ? ` (${savedIds.length})`
                : ''}
              {item === 'Applications' &&
              Object.keys(applicationStatuses).length > 0
                ? ` (${Object.keys(applicationStatuses).length})`
                : ''}
            </button>
          ))}
        </nav>

        <div className="account-actions">
          <button
            className="profile-button"
            type="button"
            aria-label="Open profile"
            onClick={() => goToPage('Profile')}
          >
            {profile.name
              ? profile.name[0].toUpperCase()
              : authUser.name?.[0]?.toUpperCase() ?? 'A'}
          </button>
          <button className="logout-button" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <main className="content">
        {accountDataError ? (
          <div className="panel empty-state" role="alert">
            <h2>Your account data could not sync</h2>
            <p className="muted">{accountDataError}</p>
            <button
              className="primary-button"
              type="button"
              onClick={() =>
                setAccountDataReload((current) => current + 1)
              }
              style={{ marginTop: 18 }}
            >
              Try again
            </button>
          </div>
        ) : null}

        {(isLoading || loadError) && activePage !== 'Profile' ? (
          <ApiNotice {...dataState} />
        ) : null}

        {selectedOpportunity ? (
          <OpportunityDetails
            item={selectedOpportunity}
            isSaved={savedIds.includes(selectedOpportunity.id)}
            applicationStatus={applicationStatuses[selectedOpportunity.id]}
            onToggleSave={() => void toggleSaved(selectedOpportunity.id)}
            onTrack={() => void startTracking(selectedOpportunity)}
            onBack={() => setSelectedOpportunity(null)}
          />
        ) : activePage === 'Explore' ? (
          <ExplorePage
            opportunities={opportunities}
            {...dataState}
            savedIds={savedIds}
            onToggleSave={(id) => void toggleSaved(id)}
            onViewDetails={openDetails}
          />
        ) : activePage === 'Saved' ? (
          <SavedPage
            savedItems={savedItems}
            {...dataState}
            savedIds={savedIds}
            onToggleSave={(id) => void toggleSaved(id)}
            onViewDetails={openDetails}
            onExplore={() => goToPage('Explore')}
          />
        ) : activePage === 'Applications' ? (
          <ApplicationsPage
            opportunities={opportunities}
            statuses={applicationStatuses}
            {...dataState}
            onStatusChange={(id, status) =>
              void updateApplicationStatus(id, status)
            }
            onViewDetails={openDetails}
            onExplore={() => goToPage('Explore')}
          />
        ) : activePage === 'Profile' ? (
          <ProfilePage
            profile={profile}
            onSave={saveProfile}
          />
        ) : (
          <>
            <section className="welcome-row">
              <div>
                <p className="eyebrow">YOUR OPPORTUNITY SPACE</p>
                <h1>
                  Hello
                  {profile.name
                    ? `, ${profile.name.split(' ')[0]}`
                    : ' there'}{' '}
                  <span aria-hidden="true">👋</span>
                </h1>
                <p className="muted">
                  Explore scholarships, schemes, internships, and jobs across
                  India.
                </p>
              </div>

              <button
                className="primary-button"
                type="button"
                onClick={() => goToPage('Profile')}
              >
                Complete your profile →
              </button>
            </section>

            <section className="overview-grid">
              <article className="panel profile-panel">
                <div>
                  <p className="eyebrow">YOUR PROFILE</p>
                  <h2>Help us find a better fit</h2>
                  <p className="muted">
                    Add a few details to get more relevant opportunities.
                  </p>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => goToPage('Profile')}
                  >
                    Add profile details →
                  </button>
                </div>

                <div
                  className="progress-ring"
                  role="img"
                  aria-label={`Profile ${profileProgress}% complete`}
                  style={{
                    background: `conic-gradient(var(--green) 0 ${profileProgress}%, #e4ece3 ${profileProgress}% 100%)`,
                  }}
                >
                  <span>{profileProgress}%</span>
                  <small>complete</small>
                </div>
              </article>

              <article className="panel deadline-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">STAY ON TRACK</p>
                    <h2>Upcoming deadlines</h2>
                  </div>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => goToPage('Applications')}
                  >
                    View all →
                  </button>
                </div>

                {opportunities.slice(0, 2).map((item) => (
                  <div className="deadline-row" key={item.id}>
                    <span className="deadline-dot" aria-hidden="true" />
                    <span>{item.name}</span>
                    <span className="deadline-tag">{item.deadline}</span>
                  </div>
                ))}
              </article>
            </section>

            <section className="recommendations">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">BASED ON YOUR PROFILE</p>
                  <h2>Opportunities to explore</h2>
                </div>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => goToPage('Explore')}
                >
                  View all opportunities →
                </button>
              </div>

              <div className="opportunity-grid">
                {opportunities.slice(0, 2).map((item) => (
                  <OpportunityCard
                    key={item.id}
                    item={item}
                    isSaved={savedIds.includes(item.id)}
                    onToggleSave={(id) => void toggleSaved(id)}
                    onViewDetails={openDetails}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;