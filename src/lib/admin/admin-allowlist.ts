export function parseEmailAllowlist(raw: string | undefined | null) {
  return (raw || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isServerEmailAdminAllowlisted(email: string | null | undefined) {
  if (!email) return false;
  const allow = parseEmailAllowlist(process.env.ADMIN_EMAILS);
  return allow.includes(email.toLowerCase());
}

