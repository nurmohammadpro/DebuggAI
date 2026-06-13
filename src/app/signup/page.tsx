/**
 * Signup Page
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { PublicLayout } from '@/components/public-layout';
import { SignupForm } from '@/components/auth/signup-form';

export default function SignupPage() {
  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-52px)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription>
              Start with credits for debugging, project generation, and workspace preview.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* OAuth Providers */}
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="w-full" type="button">
                Google
              </Button>
              <Button variant="outline" className="w-full" type="button">
                GitHub
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[var(--app-bg)] px-2 text-[var(--app-text-dim)]">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <SignupForm />
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-[13px] text-[var(--app-text-muted)] text-center">
              Already have an account?{' '}
              <Link href="/login" className="text-[var(--app-accent)] hover:text-[var(--app-text)] transition-colors">
                Sign in
              </Link>
            </div>
            <p className="text-xs text-[var(--app-text-dim)] text-center">
              By signing up, you agree to the Terms of Service and Privacy Policy.
            </p>
          </CardFooter>
        </Card>
      </div>
    </PublicLayout>
  );
}
