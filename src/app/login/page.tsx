/**
 * Admin Login Page
 *
 * Secure login page for admin access.
 */

import { redirect } from 'next/navigation';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  // Await searchParams since it's a Promise in Next.js 15
  const params = await searchParams;
  const redirectUrl = params.redirect || '/admin';
  const error = params.error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0D0A] px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#00C853]/10 border border-[#00C853]/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#00C853]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-[#E8F5E9]">DeBuggAI</h1>
          </div>
          <p className="text-[#8BAD8B]">Admin Console</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#111411] border border-[#1F2B1F] rounded-xl p-8">
          <h2 className="text-lg font-medium text-[#E8F5E9] mb-6">Sign in to admin</h2>

          {error && (
            <div className="mb-4 p-3 bg-[#FF5252]/10 border border-[#FF5252]/30 rounded-lg">
              <p className="text-sm text-[#FF5252]">{decodeURIComponent(error)}</p>
            </div>
          )}

          <form action="/auth/signin" method="POST" className="space-y-4">
            <input type="hidden" name="redirect" value={redirectUrl} />

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#8BAD8B] mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-3 py-2 bg-[#171C17] border border-[#283228] rounded-lg text-[#E8F5E9] placeholder-[#4D6B4D] focus:outline-none focus:border-[#00C853] focus:ring-2 focus:ring-[#00C853]/10 transition-colors"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#8BAD8B] mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-3 py-2 bg-[#171C17] border border-[#283228] rounded-lg text-[#E8F5E9] placeholder-[#4D6B4D] focus:outline-none focus:border-[#00C853] focus:ring-2 focus:ring-[#00C853]/10 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#00C853] text-black font-medium rounded-lg hover:bg-[#00E676] focus:outline-none focus:ring-2 focus:ring-[#00C853]/20 transition-colors"
            >
              Sign in
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#1F2B1F]">
            <p className="text-center text-sm text-[#4D6B4D]">
              Protected by admin access controls
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-[#4D6B4D]">
          <a href="/" className="hover:text-[#00C853] transition-colors">
            ← Back to main site
          </a>
        </p>
      </div>
    </div>
  );
}
