import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const limitMock = vi.fn();
const whereMock = vi.fn(() => ({ limit: limitMock }));
const innerJoinMock = vi.fn(() => ({ where: whereMock }));
const fromMock = vi.fn(() => ({ innerJoin: innerJoinMock }));
const selectMock = vi.fn(() => ({ from: fromMock }));
const insertValuesMock = vi.fn();
const insertMock = vi.fn(() => ({ values: insertValuesMock }));

vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: selectMock, insert: insertMock }),
}));

const findUserByEmailMock = vi.fn();
const createUserMock = vi.fn();

vi.mock('@/lib/auth/users', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/users')>();
  return { ...actual, findUserByEmail: findUserByEmailMock, createUser: createUserMock };
});

const GOOGLE_IDENTITY = {
  provider: 'google' as const,
  providerAccountId: 'google-user-1',
  email: 'User@Example.com',
  fullName: 'Test User',
};

describe('loginWithExternalIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns the linked user when the provider account is already known', async () => {
    limitMock.mockResolvedValue([{ id: 'user-1', email: 'user@example.com', fullName: 'Test User' }]);

    const { loginWithExternalIdentity } = await import('./identity');
    const user = await loginWithExternalIdentity(GOOGLE_IDENTITY);

    expect(user).toEqual({ id: 'user-1', email: 'user@example.com', fullName: 'Test User' });
    expect(findUserByEmailMock).not.toHaveBeenCalled();
    expect(createUserMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  test('links the identity to an existing user with the same verified email', async () => {
    limitMock.mockResolvedValue([]);
    findUserByEmailMock.mockResolvedValue({
      id: 'user-9',
      email: 'user@example.com',
      fullName: 'Existing User',
      passwordHash: 'bcrypt-hash',
    });

    const { loginWithExternalIdentity } = await import('./identity');
    const user = await loginWithExternalIdentity(GOOGLE_IDENTITY);

    expect(findUserByEmailMock).toHaveBeenCalledWith('user@example.com');
    expect(createUserMock).not.toHaveBeenCalled();
    expect(insertValuesMock).toHaveBeenCalledWith({
      userId: 'user-9',
      provider: 'google',
      providerAccountId: 'google-user-1',
      email: 'user@example.com',
    });
    expect(user).toEqual({ id: 'user-9', email: 'user@example.com', fullName: 'Existing User' });
  });

  test('registers a passwordless user when neither identity nor email exist', async () => {
    limitMock.mockResolvedValue([]);
    findUserByEmailMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({ id: 'user-new', email: 'user@example.com', fullName: 'Test User' });

    const { loginWithExternalIdentity } = await import('./identity');
    const user = await loginWithExternalIdentity(GOOGLE_IDENTITY);

    expect(createUserMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      passwordHash: null,
      fullName: 'Test User',
    });
    expect(insertValuesMock).toHaveBeenCalledWith({
      userId: 'user-new',
      provider: 'google',
      providerAccountId: 'google-user-1',
      email: 'user@example.com',
    });
    expect(user).toEqual({ id: 'user-new', email: 'user@example.com', fullName: 'Test User' });
  });

  test('falls back to the email as display name when the provider gives none', async () => {
    limitMock.mockResolvedValue([]);
    findUserByEmailMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({ id: 'user-new', email: 'user@example.com', fullName: 'user@example.com' });

    const { loginWithExternalIdentity } = await import('./identity');
    await loginWithExternalIdentity({ ...GOOGLE_IDENTITY, fullName: '  ' });

    expect(createUserMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      passwordHash: null,
      fullName: 'user@example.com',
    });
  });
});
