import 'server-only';
import { put } from '@vercel/blob';

export async function uploadProjectBlob(projectId: string, file: File) {
  if (!process.env.BLOB_READ_WRITE_TOKEN || file.size === 0) {
    return null;
  }

  const safeName = `${projectId}/${Date.now()}-${file.name.replace(/\s+/g, '-').toLowerCase()}`;

  return put(safeName, file, {
    access: 'public',
    addRandomSuffix: true,
  });
}
