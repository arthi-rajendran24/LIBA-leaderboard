import 'server-only';

type RedisResponse<T> = { result: T; error?: string };

function credentials() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      'Redis is not configured. Connect an Upstash Redis store to this Vercel project.',
    );
  }

  return { url, token };
}

export async function redisCommand<T>(command: Array<string | number>) {
  const { url, token } = credentials();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Redis request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as RedisResponse<T>;
  if (payload.error) throw new Error(payload.error);
  return payload.result;
}
