export function isClientEmailAdminAllowlisted(email: string | null | undefined) {
  if (!email) return false;
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS;
  const allow = (raw || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}

