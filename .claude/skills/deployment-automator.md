---
name: deployment-automator
description: Track 8 - Deployment & CI/CD (DEP01-DEP23). Full deployment checklist: Supabase production, Netlify web, iOS TestFlight, Android Play Store, and GitHub Actions automation. P0-P2 priority.
type: skill
---

# Deployment & CI/CD Automator

**Purpose**: Deploy DeBuggAI to production across all platforms - Supabase backend, Netlify web, iOS, Android, and set up CI/CD automation.

**Priority**: P0-P2 - Production backend is P0. Mobile stores are P1. CI/CD automation is P2.

---

## DEP01 - Link Supabase CLI to Production

**Time**: 15 min | **Priority**: P0

**Command**:
```bash
# Login if not already
supabase login

# Link to production project
supabase link --project-ref YOUR_PROJECT_REF

# Verify
supabase status
```

**Expected output**: Shows project URL, API URL, DB URL, etc.

**Verification**: `.supabase` folder created with linked project info.

---

## DEP02 - Run All Migrations on Production

**Time**: 30 min | **Priority**: P0

**Command**:
```bash
supabase db push --linked
```

**What to watch for**:
- Each migration should show as "Applied"
- Check for any ERROR messages
- Order matters: 001 through 024

**If migration fails**:
1. Note which migration failed
2. Check the SQL for syntax errors
3. Fix and run again

**Verification**:
```bash
# List applied migrations
supabase migration list
```

---

## DEP03 - Set All Production Environment Secrets

**Time**: 30 min | **Priority**: P0

**Command**:
```bash
# AI Provider (using NEW key from S01)
supabase secrets set AI_API_KEY=gsk_NEW_KEY_HERE
supabase secrets set AI_BASE_URL=https://api.groq.com/openai/v1
supabase secrets set AI_MODEL=llama-3.3-70b-versatile

# Stripe
supabase secrets set STRIPE_SECRET_KEY=sk_live_XXX
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_XXX

# Verify
supabase secrets list
```

**Verification**: All 5 secrets show in list.

---

## DEP04 - Deploy All Edge Functions to Production

**Time**: 15 min | **Priority**: P0

**Command**:
```bash
supabase functions deploy --all
```

**After deployment**:
```bash
# Test each function
curl -X POST "$(supabase status | grep 'API URL' | awk '{print $3}')/functions/v1/debug-ai-analyze" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}'

# Check logs in dashboard
# Supabase dashboard > Edge Functions > Logs
```

**Verification**: Each function returns valid response (not 500).

---

## DEP05 - Configure Stripe Webhook for Production

**Time**: 30 min | **Priority**: P0

**Steps**:
1. Go to Stripe dashboard > Webhooks
2. Add endpoint: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe_webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
4. Copy the webhook signing secret
5. Add to Supabase: `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_XXX`

**Verification**: Test webhook with Stripe CLI:
```bash
stripe trigger customer.subscription.created
```

---

## DEP06 - Create Supabase Storage Bucket for Exports

**Time**: 15 min | **Priority**: P0

**Steps**:
1. Go to Supabase dashboard > Storage
2. Create bucket named `exports`
3. Set to **Private** (not public)
4. Add RLS policy:
```sql
-- Users can read files starting with their user_id
CREATE POLICY "Users can read own exports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);
```

**Verification**: `generate_export_zip` function can write to bucket.

---

## DEP07 - Configure Supabase Auth for Production

**Time**: 20 min | **Priority**: P0

**Steps**:
1. Go to Supabase dashboard > Auth > URL Configuration
2. Set Site URL to your production Netlify domain
3. Add redirect URLs:
   - `https://yourdomain.com`
   - `https://yourdomain.com/auth/callback`
   - `http://localhost:3000` (for dev)
4. Remove any wildcard entries (`*`)
5. Enable Email provider
6. If using Google OAuth: add client ID and secret from Google Cloud Console

**Verification**: OAuth tokens only sent to configured URLs.

---

## DEP08 - Build Flutter Web Release

**Time**: 15 min | **Priority**: P0

**Command**:
```bash
flutter build web --release --web-renderer canvaskit \
  --dart-define=SUPABASE_URL=https://YOUR.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=eyJ... \
  --dart-define=STRIPE_PUBLISHABLE_KEY=pk_live_XXX
```

**Output**: `build/web/` folder.

**Verification**: `build/web/index.html` exists and is valid.

---

## DEP09 - Deploy to Netlify Production

**Time**: 20 min | **Priority**: P0

**Using CLI**:
```bash
# Install Netlify CLI if needed
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=build/web

# Or link and deploy
netlify link
netlify deploy --prod
```

**Using dashboard**:
1. Go to Netlify dashboard
2. Drag `build/web/` folder into deploy area
3. Set `netlify.toml` SPA redirect rule is in place

**Set env vars** in Netlify UI:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `STRIPE_PUBLISHABLE_KEY`

**Verification**: Site loads at `https://your-site.netlify.app`.

---

## DEP10 - Set Custom Domain on Netlify

**Time**: 30 min | **Priority**: P1

**Steps**:
1. Go to Netlify > Domain settings
2. Add custom domain
3. Update DNS records (Netlify provides instructions)
4. Wait for SSL provisioning (automatic via Let's Encrypt)
5. Update Supabase Auth Site URL and redirect URLs to match new domain

**Verification**: Site loads at custom domain with HTTPS.

---

## DEP11 - Update web/manifest.json for PWA

**Time**: 30 min | **Priority**: P1

**File**: `web/manifest.json`

```json
{
  "name": "DeBuggAI",
  "short_name": "DeBuggAI",
  "description": "AI-Powered Flutter Debugging",
  "theme_color": "#00c853",
  "background_color": "#0a0e0a",
  "display": "standalone",
  "orientation": "portrait",
  "icons": [
    {
      "src": "icons/Icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icons/Icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**File**: `web/index.html`
```html
<!-- Add to head -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<link rel="apple-touch-icon" href="icons/Icon-192.png">
```

**Verification**: App can be installed as PWA on mobile.

---

## DEP12 - Configure iOS Bundle ID and Code Signing

**Time**: 1 hr | **Priority**: P1

**Steps**:
1. Open `ios/Runner.xcworkspace` in Xcode
2. Select Runner target > General
3. Set Bundle Identifier: `com.brookfieldatlantic.debuggai`
4. Select your Apple Developer team ($99/yr required)
5. Enable "Automatically manage signing"
6. Set minimum deployment target to iOS 14.0

**Verification**: Xcode shows valid provisioning profile.

---

## DEP13 - Update ios/Runner/Info.plist

**Time**: 30 min | **Priority**: P1

**File**: `ios/Runner/Info.plist`

```xml
<key>CFBundleDisplayName</key>
<string>DeBuggAI</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs access to your photo library to select files for debugging.</string>

<key>ITSAppUsesNonExemptEncryption</key>
<false/>

<!-- Deep linking -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>debuggai</string>
    </array>
  </dict>
</array>
```

**Verification**: Info.plist validates without errors.

---

## DEP14 - Build and Upload IPA to TestFlight

**Time**: 1 hr | **Priority**: P1

**Commands**:
```bash
# Build IPA
flutter build ipa --release

# Archive is at: build/ios/archive/Runner.xcarchive
```

**Upload via Xcode**:
1. Open Xcode Organizer
2. Select archive
3. Click "Distribute App"
4. Select "App Store Connect"
5. Upload
6. Wait for processing (~15 min)

**Add testers**:
1. Go to App Store Connect > TestFlight
2. Add internal testers
3. Send test invites

**Verification**: Build appears in TestFlight.

---

## DEP15 - Submit to App Store for Public Release

**Time**: 2 hr | **Priority**: P1

**Requirements**:
- Screenshots for:
  - 6.7" (iPhone 15 Pro Max)
  - 5.5" (iPhone 8 Plus)
  - 12.9" iPad
- App description (max 4000 chars)
- Keywords (max 100 chars)
- Age rating (likely 4+)
- Privacy policy URL (required)

**Review notes**:
```
To test DeBuggAI:
1. Login with email/password
2. Navigate to Debug screen
3. Enter a Flutter bug description
4. Review AI-generated analysis
5. Test subscription flow in Settings
```

**Verification**: App submitted for review.

---

## DEP16 - Generate Android Release Keystore

**Time**: 30 min | **Priority**: P1

**Command**:
```bash
keytool -genkey -v -keystore ~/debuggai-release.jks \
  -alias debuggai \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**IMPORTANT**:
- Store `.jks` file and passwords in password manager
- NEVER commit to git
- Losing keystore means you cannot update app

**Verification**: `debuggai-release.jks` file created.

---

## DEP17 - Configure Release Signing in build.gradle.kts

**Time**: 30 min | **Priority**: P1

**File**: `android/app/build.gradle.kts`

```kotlin
android {
    signingConfigs {
        create("release") {
            storeFile = file(System.getenv("KEYSTORE_PATH") ?: "/path/to/debuggai-release.jks")
            storePassword = System.getenv("KEYSTORE_PASSWORD")
            keyAlias = System.getenv("KEY_ALIAS") ?: "debuggai"
            keyPassword = System.getenv("KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            // ... other config
        }
    }
}
```

**Environment variables** (set in CI/CD or locally):
```bash
export KEYSTORE_PASSWORD=your_password
export KEY_PASSWORD=your_password
export KEYSTORE_PATH=/path/to/keystore
```

**Verification**: Release build signs with keystore.

---

## DEP18 - Build Android App Bundle (AAB)

**Time**: 1 hr | **Priority**: P1

**Command**:
```bash
flutter build appbundle --release
```

**Output**: `build/app/outputs/bundle/release/app-release.aab`

**Note**: Upload `.aab` file (not `.apk`) to Play Console.

**Verification**: AAB file exists and is valid.

---

## DEP19 - Set Up Play Console and Submit to Internal Testing

**Time**: 1 hr | **Priority**: P1

**Steps**:
1. Go to Google Play Console
2. Create new app ($25 one-time fee)
3. Upload AAB
4. Fill minimum required fields:
   - Title
   - Short description
   - Full description
   - App icon (already in `android/app/src/main/res/`)
   - Screenshots
5. Submit to Internal Testing track

**Verification**: App appears in internal testing.

---

## DEP20 - Play Store Production Release

**Time**: 2 hr | **Priority**: P1

**Requirements**:
- Screenshots for phone and 7" tablet
- Content rating questionnaire (~15 min)
- Data Safety form (declare collected data: email, usage data)
- Full description with keywords

**Rollout options**:
- Start at 10% rollout for safety
- Monitor for crashes
- Gradually increase to 100%

**Verification**: App released to production.

---

## DEP21 - Create GitHub Actions Deploy Workflow

**Time**: 2 hr | **Priority**: P2

**File**: `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.24.0'
      - run: flutter pub get
      - run: flutter analyze
      - run: flutter test

  build-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.24.0'
      - run: flutter build web --release \
          --dart-define=SUPABASE_URL=${{ secrets.SUPABASE_URL }} \
          --dart-define=SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }} \
          --dart-define=STRIPE_PUBLISHABLE_KEY=${{ secrets.STRIPE_PUBLISHABLE_KEY }}
      - uses: actions/upload-artifact@v4
        with:
          name: web-build
          path: build/web/

  deploy-netlify:
    needs: build-web
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: web-build
          path: build/web/
      - uses: nwtgck/actions-netlify@v2
        with:
          publish-dir: './build/web'
          production-deploy: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from GitHub Actions"
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}

  deploy-functions:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase functions deploy --all
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
```

**Verification**: Workflow runs on push to main.

---

## DEP22 - Add GitHub Actions Secrets

**Time**: 30 min | **Priority**: P2

**Go to**: GitHub repo > Settings > Secrets and variables > Actions

**Add secrets**:
- `SUPABASE_ACCESS_TOKEN` (from supabase.com/account/tokens)
- `SUPABASE_PROJECT_REF` (your project ID)
- `NETLIFY_AUTH_TOKEN` (from Netlify > User Settings > Applications)
- `NETLIFY_SITE_ID` (from Netlify site settings)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `STRIPE_PUBLISHABLE_KEY`

**Verification**: Workflow can access all secrets.

---

## DEP23 - Add PR Preview Deployments

**Time**: 2 hr | **Priority**: P2

**File**: `.github/workflows/preview.yml`

```yaml
name: Preview Deploy

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.24.0'
      - run: flutter build web --release \
          --dart-define=SUPABASE_URL=${{ secrets.SUPABASE_URL }} \
          --dart-define=SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }} \
          --dart-define=STRIPE_PUBLISHABLE_KEY=${{ secrets.STRIPE_PUBLISHABLE_KEY }}
      - uses: nwtgck/actions-netlify@v2
        with:
          publish-dir: './build/web'
          production-deploy: false
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Preview deploy for PR #${{ github.event.number }}"
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
      - uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deployment ready!\n\nURL: https://pr-${{ github.event.number }}-your-site.netlify.app'
            })
```

**Verification**: Each PR gets unique preview URL posted as comment.

---

## Completion Checklist

### Production Backend
- [ ] DEP01: Supabase CLI linked to production
- [ ] DEP02: All migrations applied successfully
- [ ] DEP03: All production secrets set
- [ ] DEP04: Edge functions deployed and tested
- [ ] DEP05: Stripe webhook configured
- [ ] DEP06: Exports storage bucket created
- [ ] DEP07: Auth URL configuration set

### Web Deployment
- [ ] DEP08: Flutter web release built
- [ ] DEP09: Deployed to Netlify production
- [ ] DEP10: Custom domain configured
- [ ] DEP11: PWA manifest configured

### iOS Deployment
- [ ] DEP12: Bundle ID and code signing configured
- [ ] DEP13: Info.plist updated
- [ ] DEP14: IPA uploaded to TestFlight
- [ ] DEP15: Submitted to App Store

### Android Deployment
- [ ] DEP16: Release keystore generated
- [ ] DEP17: Signing configured in build.gradle
- [ ] DEP18: AAB built
- [ ] DEP19: Internal testing set up
- [ ] DEP20: Production release submitted

### CI/CD Automation
- [ ] DEP21: GitHub Actions workflow created
- [ ] DEP22: All secrets added to GitHub
- [ ] DEP23: PR preview deployments enabled

**Post-Deployment**: Monitor logs, analytics, and user feedback for first 7 days.
