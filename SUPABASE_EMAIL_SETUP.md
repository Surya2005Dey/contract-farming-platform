# Supabase Email Configuration Guide

## 🚨 URGENT: Email Not Sending Issues Fixed

### Quick Fix Steps:
1. ✅ Fixed emailRedirectTo URL in signup API
2. ✅ Fixed resend email functionality  
3. ✅ Created email testing tools
4. ✅ Added comprehensive diagnostics

### Test Your Email Setup:
Visit: http://localhost:3002/test/email to test email sending

## Issues Fixed:
1. ✅ Added proper email confirmation callback route
2. ✅ Fixed environment variables for email redirects
3. ✅ Added email resend functionality
4. ✅ Better error handling for unverified emails
5. ✅ Created proper success and error pages
6. ✅ **FIXED: Malformed emailRedirectTo URL**
7. ✅ **ADDED: Email testing and diagnostics tools**

## Supabase Dashboard Configuration Needed:

### 1. Enable Email Confirmations
Go to: https://supabase.com/dashboard/project/qiaxvzrlhdjspgvhqzor/auth/settings

**Authentication Settings:**
- ✅ Enable email confirmations: **ON**
- ✅ Enable email change confirmations: **ON**
- ✅ Enable phone confirmations: **OFF** (unless needed)

### 2. Configure Email Templates
Go to: https://supabase.com/dashboard/project/qiaxvzrlhdjspgvhqzor/auth/templates

**Confirm signup template:**
```html
<h2>Confirm your signup</h2>

<p>Thank you for signing up to Contract Farming Platform!</p>
<p>Follow this link to confirm your user account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your account</a></p>
```

### 3. Site URL Configuration
Go to: https://supabase.com/dashboard/project/qiaxvzrlhdjspgvhqzor/auth/url-configuration

**Site URL:** `http://localhost:3001` (for development)
**Redirect URLs:** Add these:
- `http://localhost:3001/auth/callback`
- `http://localhost:3000/auth/callback` (backup)

### 4. SMTP Configuration (Optional but Recommended)
Go to: https://supabase.com/dashboard/project/qiaxvzrlhdjspgvhqzor/settings/auth

**SMTP Settings:** Configure your own SMTP to avoid rate limits:
- **Enable custom SMTP:** ON
- **SMTP Host:** (e.g., smtp.gmail.com)
- **SMTP Port:** 587
- **SMTP User:** your-email@gmail.com
- **SMTP Pass:** your-app-password
- **Sender email:** your-email@gmail.com
- **Sender name:** Contract Farming Platform

### 5. Testing the Email Flow:
1. Try signing up with a real email address
2. Check your inbox (and spam folder) for confirmation email
3. Click the confirmation link
4. Should redirect to dashboard successfully

## Current Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://qiaxvzrlhdjspgvhqzor.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_REDIRECT_URL=http://localhost:3001/auth/callback
```

## Troubleshooting Email Issues:

### 1. Test Email Sending
- Go to: http://localhost:3002/test/email
- Enter a real email address
- Check the response for errors

### 2. Check Diagnostics
- Visit: http://localhost:3002/api/diagnostics/email
- Review environment variables and settings

### 3. Common Issues & Solutions:

**❌ "Email not sending"**
- ✅ Check spam folder
- ✅ Verify Supabase email confirmations are enabled
- ✅ Ensure site URL and redirect URLs are correct
- ✅ Configure custom SMTP (recommended)

**❌ "Invalid redirect URL"**  
- ✅ Add redirect URL to Supabase dashboard
- ✅ Ensure NEXT_PUBLIC_SUPABASE_REDIRECT_URL matches current port

**❌ "Rate limit exceeded"**
- ✅ Configure custom SMTP to avoid Supabase limits
- ✅ Wait before retrying

**❌ "User already registered"**
- ✅ Use different email for testing
- ✅ Delete test users from Supabase auth dashboard

### 4. Manual Email Testing:
```bash
# Test with curl
curl -X POST http://localhost:3002/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@gmail.com"}'
```

## Current Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://qiaxvzrlhdjspgvhqzor.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_REDIRECT_URL=http://localhost:3002/auth/callback
```
