// POST /api/replays/presign — hand back a presigned PUT URL so the extension
// can upload the session straight to Blob storage. Vercel caps function bodies
// around 4.5MB and full rrweb sessions blow past that, so the payload never
// goes through this function; Blob itself accepts up to 50MB per blob. Reads
// stay server-side: GET /api/replays/<id> still fetches the blob.
import { randomUUID } from 'node:crypto';
import { issueSignedToken, presignUrl } from '@vercel/blob';

export const config = { runtime: 'nodejs' };

const MAX_SESSION = 50 * 1024 * 1024; // Blob per-blob cap

export async function POST(): Promise<Response> {
  const id = randomUUID();
  const pathname = `replays/${id}.json`;
  try {
    const { clientSigningToken, delegationToken } = await issueSignedToken({
      operations: ['put'],
      pathname,
      maximumSizeInBytes: MAX_SESSION,
    });
    const { presignedUrl } = await presignUrl(
      { clientSigningToken, delegationToken },
      { operation: 'put', pathname, access: 'public' },
    );
    return Response.json({ id, uploadUrl: presignedUrl });
  } catch (err) {
    return new Response(`presign failed: ${(err as Error).message}`, { status: 500 });
  }
}
