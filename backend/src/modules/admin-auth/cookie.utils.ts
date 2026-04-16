export function extractCookie(cookieHeader: string, key: string): string | null {
  const parts = cookieHeader.split(';').map((part) => part.trim());
  for (const part of parts) {
    const [name, ...rest] = part.split('=');
    if (name === key) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}
