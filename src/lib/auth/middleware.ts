type MiddlewareAuth = {
  protect: (options: { unauthenticatedUrl: string }) => Promise<unknown>;
};

export async function protectRequest(auth: MiddlewareAuth) {
  await auth.protect({
    unauthenticatedUrl: '/sign-in',
  });
}
