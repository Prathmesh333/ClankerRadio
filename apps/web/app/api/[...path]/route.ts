import type { NextRequest } from 'next/server';

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const headers = new Headers();
  for (const name of ['content-type', 'idempotency-key']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (process.env.STUDIO_TOKEN) headers.set('x-studio-token', process.env.STUDIO_TOKEN);
  try {
    const response = await fetch(`${process.env.API_URL ?? 'http://127.0.0.1:8000'}/api/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`, {
      method: request.method, headers, body: request.method === 'POST' ? await request.text() : undefined,
      cache: 'no-store', signal: path.join('/') === 'audio/loopback' ? request.signal : AbortSignal.timeout(30_000),
    });
    const resultHeaders = new Headers();
    for (const name of ['content-type', 'content-disposition']) {
      const value = response.headers.get(name);
      if (value) resultHeaders.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers: resultHeaders });
  } catch {
    return Response.json({ detail: 'The composition service is unavailable. Start the API and retry.' }, { status: 503 });
  }
}
export { proxy as GET, proxy as POST };
