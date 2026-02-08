// apps/backend-nest/src/vertex/vertex.util.ts

/**
 * Simple exponential backoff with jitter for Vertex calls.
 * Retries on HTTP 429/5xx and common gRPC codes (RESOURCE_EXHAUSTED, UNAVAILABLE, etc).
 */
export async function withBackoff<T>(
  fn: () => Promise<T>,
  label = 'vertex',
  maxRetries = 5,
  baseMs = 500,
  capMs = 15000,
): Promise<T> {
  let attempt = 0;

  // HTTP and gRPC-ish retryable codes we care about
  const retryableHttp = new Set([429, 500, 502, 503, 504]);
  const retryableGrpc = new Set([8, 14, 13, 4]); // RESOURCE_EXHAUSTED, UNAVAILABLE, INTERNAL, DEADLINE_EXCEEDED

  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      const code = err?.code ?? err?.status ?? err?.response?.status ?? 0;
      const retryable = retryableHttp.has(code) || retryableGrpc.has(code);

      if (!retryable || attempt >= maxRetries) throw err;

      // Exponential backoff with jitter
      const exp = Math.min(capMs, baseMs * 2 ** attempt);
      const jitter = Math.random() * Math.min(250, exp * 0.25);
      const delay = Math.round(exp + jitter);

      // Optional: surface a tiny breadcrumb without spamming logs
      // console.warn(`[${label}] retry ${attempt + 1}/${maxRetries} in ${delay}ms (code=${code})`);

      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }
}
