/**
 * Structured logger for audit trails.
 * Outputs JSON to console, which Vercel captures in logs.
 */

export function auditLog(event: string, details: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    ...details,
  };

  console.log(JSON.stringify(entry));
}
