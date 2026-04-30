# Email Confirmation Setup Guide for DeBuggAI

## Problem
User registration shows "Check your email to confirm your account" but no email is sent.

## Root Cause
Supabase Auth requires email templates to be configured for sending confirmation emails. Currently, no email templates are set up.

## Solutions

### Option 1: Configure Supabase Email Templates (Recommended for Production)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/templates

2. **Configure Email Templates**
   - Enable "Confirm signup" template
   - Customize the email content with your branding
   - Set the redirect URL to: `${APP_URL}/auth/callback`

3. **Test Email Delivery**
   - Supabase uses built-in email service (limited)
   - For production, configure custom SMTP or use Resend

### Option 2: Disable Email Confirmation (For Development)

For local development, you can disable email confirmation:

```sql
-- In Supabase SQL Editor
ALTER TABLE auth.users
ALTER COLUMN email_confirmed_at SET DEFAULT now();

-- Or update existing users
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;
```

### Option 3: Use Resend for Email (Production-Grade)

1. **Set up Resend account**
   - Go to https://resend.com/
   - Get your API key

2. **Configure Supabase to use Resend**
   - In Supabase Dashboard → Settings → Auth → Email
   - Select "Custom SMTP"
   - Use Resend's SMTP settings:
     ```
     Host: smtp.resend.com
     Port: 465
     Username: resend
     Password: YOUR_RESEND_API_KEY
     ```

3. **Add environment variables**
   ```bash
   RESEND_API_KEY=re_xxxxxxxxx
   ```

### Option 4: Auto-Confirm Users (Quick Fix for Development)

Create a Supabase Edge Function to auto-confirm users:

```typescript
// supabase/functions/auto-confirm-user/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { user_id } = await req.json()

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data, error } = await supabaseClient.auth.admin.updateUserById(
    user_id,
    { email_confirm: true }
  )

  return new Response(JSON.stringify(data))
})
```

## Immediate Fix for Development

Update the signup flow to show users they're automatically confirmed:

```typescript
// In signup-form.tsx
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { full_name: fullName },
    emailRedirectTo: `${getAppUrl()}/auth/callback`,
  },
});

if (!error && data.user) {
  // Check if email confirmation is required
  if (!data.user.email_confirmed_at) {
    toast.success('Check your email to confirm your account.');
  } else {
    toast.success('Account created successfully!');
    // Redirect to dashboard
    router.push('/dashboard/home');
  }
}
```

## Next Steps

1. **For Development**: Use Option 2 (disable email confirmation)
2. **For Production**: Use Option 1 (Supabase templates) or Option 3 (Resend)
3. **For Testing**: Use Option 4 (auto-confirm function)

Choose the option that best fits your current development stage.
