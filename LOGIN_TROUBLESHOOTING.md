# Login "Failed to Fetch" Error - Troubleshooting Guide

## ❌ Error: "Failed to fetch"

This error means the browser cannot reach the Supabase authentication service. Here's how to fix it:

## 🔍 Step-by-Step Diagnosis

### 1. Check Internet Connection
```bash
# Try to ping Supabase
ping supabase.com
```
If this fails, you need to restore internet connectivity first.

### 2. Verify Environment Variables
Your `.env.local` file **must** contain:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**To check your values:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings → API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon/Public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Rebuild After Env Changes
If you updated `.env.local`, you must rebuild:
```bash
npm run build
npm run dev
```
Next.js doesn't auto-reload environment variables.

### 4. Check Supabase Service Status
1. Go to [supabase.com/status](https://supabase.com/status)
2. Check if there are any outages
3. If there's an outage, wait for resolution

### 5. Clear Browser Cache
1. **Chrome/Edge**: Press `Ctrl+Shift+Delete`
2. **Firefox**: Press `Ctrl+Shift+Delete`
3. Select "All time" and clear
4. Refresh the login page

### 6. Check Browser Console
Press `F12` to open developer tools:
1. Go to **Console** tab
2. Look for error messages
3. Check **Network** tab to see the failed request to Supabase

## ✅ Common Causes & Solutions

### Cause 1: Missing Environment Variables
**Error:** "Supabase configuration is missing"
**Solution:**
1. Add both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`
2. Restart the dev server: `npm run dev`
3. Hard refresh browser: `Ctrl+Shift+R`

### Cause 2: Wrong Environment Variable Values
**Error:** "Failed to fetch" (with no helpful message)
**Solution:**
1. Copy correct values from Supabase dashboard (double-check for spaces)
2. Make sure they don't have quotes around them
3. Correct format: `KEY=value` (not `KEY="value"`)

### Cause 3: Network Issue
**Error:** "Request timed out"
**Solution:**
1. Check internet connection
2. Disable VPN if using one
3. Try from a different network
4. Check if Supabase is blocked by firewall

### Cause 4: Supabase Service Down
**Error:** "Failed to fetch" consistently
**Solution:**
1. Check [status.supabase.com](https://status.supabase.com)
2. Wait for service to recover
3. Use the Supabase dashboard to verify your project is accessible

### Cause 5: CORS Issue
**Error:** "Failed to fetch" with CORS-related console errors
**Solution:**
1. Verify `NEXT_PUBLIC_SUPABASE_URL` doesn't have trailing slash
2. Make sure it's an HTTPS URL
3. Correct: `https://your-project.supabase.co`

## 🛠️ Advanced Troubleshooting

### Test Supabase Connection Directly
Create a test file `test-supabase.js`:
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

supabase.auth.getUser().then(result => {
  console.log('Connection successful:', result)
}).catch(error => {
  console.error('Connection failed:', error)
})
```

### Check Supabase Project Status
In [Supabase Dashboard](https://supabase.com/dashboard):
1. Click on your project
2. Check **Status** at the bottom
3. Should show "Project is running"
4. Verify **Auth** service is enabled

## 📋 Verification Checklist

Before trying to log in again:

- [ ] Internet connection is working
- [ ] `.env.local` has both environment variables
- [ ] Environment variables have correct values (copy/pasted from Supabase)
- [ ] Dev server was restarted after env changes
- [ ] Browser cache was cleared
- [ ] Supabase service status is green
- [ ] Supabase project is "running" in dashboard
- [ ] Auth service is enabled in Supabase

## 🚀 If All Else Fails

1. **Restart everything:**
   ```bash
   npm run build
   npm run dev
   ```

2. **Hard refresh:**
   - `Ctrl+Shift+R` (Windows/Linux)
   - `Cmd+Shift+R` (Mac)

3. **Create new Supabase project:**
   - If current project seems broken
   - Add new credentials to `.env.local`
   - Test login again

4. **Check logs:**
   ```bash
   # Terminal where npm run dev is running
   # Look for error messages from Next.js or Supabase
   ```

## 📞 Getting Help

If you've gone through all steps and still have issues:

1. **Check Supabase logs:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Project → Functions → Logs

2. **Check browser console:**
   - Press F12
   - Go to Console tab
   - Copy full error message

3. **Check network requests:**
   - Press F12
   - Go to Network tab
   - Try to log in
   - Look for failed requests to `supabase.co`

## 📝 Notes

- The error message has been improved to be more helpful
- Timeout extended from 10s to 15s for slow connections
- Login now verifies authentication succeeded before redirecting
- All auth errors are logged to browser console for debugging

---

**Last Updated:** 2026-04-01
**Fixed in:** Commit d05262aa
