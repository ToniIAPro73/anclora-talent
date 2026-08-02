export const SESSION_COOKIE_NAME = 'anclora_session';

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
} as const;
