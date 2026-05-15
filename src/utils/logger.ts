export function logStderr(...args: unknown[]): void {
  const ts = new Date().toISOString();
  console.error(`[${ts}] [gtm-mcp]`, ...args);
}
