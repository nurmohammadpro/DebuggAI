import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--app-bg)] px-4">
      <SignIn />
    </div>
  );
}
