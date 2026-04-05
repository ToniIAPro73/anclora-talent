type AppUrlOptions = {
  host?: string | null;
  protocol?: string | null;
  requestUrl?: string | null;
};

export function buildAbsoluteAppUrl(path: string, options: AppUrlOptions = {}) {
  if (options.requestUrl) {
    return new URL(path, options.requestUrl).toString();
  }

  if (options.host) {
    const protocol = options.protocol || 'https';
    return new URL(path, `${protocol}://${options.host}`).toString();
  }

  return path;
}