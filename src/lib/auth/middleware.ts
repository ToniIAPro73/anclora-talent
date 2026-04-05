import { buildAbsoluteAppUrl } from './urls';

type MiddlewareAuth = {
  protect: (options: { unauthenticatedUrl: string }) => Promise<unknown>;
};

export async function protectRequest(auth: MiddlewareAuth, requestUrl: string) {
  await auth.protect({
    unauthenticatedUrl: buildAbsoluteAppUrl('/sign-in', { requestUrl }),
  });
}
