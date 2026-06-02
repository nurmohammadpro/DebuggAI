const DEFAULT_ADMIN_EMAILS = [
  'nurprodev@gmail.com',
];

function parseAdminEmails(raw: string | undefined) {
  return (raw || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function getAdminEmailAllowlist() {
  const envEmails = parseAdminEmails(process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.ADMIN_EMAILS);
  const all = new Set<string>([
    ...DEFAULT_ADMIN_EMAILS.map((email) => email.toLowerCase()),
    ...envEmails,
  ]);
  return all;
}

export function isEmailAdminAllowlisted(email: string | null | undefined) {
  if (!email) return false;
  return getAdminEmailAllowlist().has(email.toLowerCase());
}

