export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const e = email.trim();
  if (e.length < 6 || e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export function requiredString(value, maxLen) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!v) return null;
  if (maxLen && v.length > maxLen) return null;
  return v;
}
