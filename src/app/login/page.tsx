/**
 * Client Login Page
 */

import Link from 'next/link';

import { PublicLayout } from '@/components/public-layout';
import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-52px)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
            <CardDescription>
              Access your DeBuggAI workspace and projects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LoginForm />
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <div className="text-sm text-muted-foreground text-center">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-primary hover:underline">
                Create one
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </PublicLayout>
  );
}

