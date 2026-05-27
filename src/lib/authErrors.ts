/** Map Supabase Auth errors to i18n keys or raw messages */
export function getAuthErrorKey(err: unknown): 'invalidCredentials' | 'checkEmail' | 'notInAuth' | 'raw' {
  const msg =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message: string }).message)
      : err instanceof Error
        ? err.message
        : String(err);

  const lower = msg.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) return 'notInAuth';
  if (lower.includes('email not confirmed')) return 'checkEmail';
  if (lower.includes('invalid') && lower.includes('credential')) return 'notInAuth';
  return 'raw';
}

export function getAuthErrorRaw(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: string }).message);
  }
  return err instanceof Error ? err.message : String(err);
}
