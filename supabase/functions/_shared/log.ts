export function logInfo(message: string, meta?: Record<string, unknown>) {
  try {
    const payload = { level: 'info', message, meta };
    console.log(JSON.stringify(payload));
  } catch {
    // fallback
    console.log(message, meta || '');
  }
}

export function logError(message: string | Error, meta?: Record<string, unknown>) {
  try {
    const msg = message instanceof Error ? message.message : String(message);
    const stack = message instanceof Error ? message.stack : undefined;
    const payload = { level: 'error', message: msg, stack, meta };
    console.error(JSON.stringify(payload));
  } catch {
    console.error(message, meta || '');
  }
}
