const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxRequests: number = 60, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = requestCounts.get(key);
  if (!record || now > record.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  record.count++;
  return record.count <= maxRequests;
}
