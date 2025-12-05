# Instagram Graph API Setup Guide

## Current Status
❌ **Instagram API credentials are invalid or expired**

Your current setup shows:
- Access Token: `EAATglXIEtbEBQNWLszo...`
- App ID: `1459552298843429`
- Error: Invalid OAuth access token (Code 190)

## How to Fix

### Option 1: Generate New Access Token

1. **Go to Facebook Developers Console**
   - Visit: https://developers.facebook.com/apps/1459552298843429
   - Navigate to your app dashboard

2. **Get a New User Access Token**
   - Go to Tools > Graph API Explorer
   - Select your app from dropdown
   - Select Instagram Basic Display or Instagram Graph API
   - Generate new access token with these permissions:
     - `instagram_basic`
     - `instagram_content_publish` (for posting)
     - `pages_show_list` (if using business account)

3. **For Long-lived Token (Recommended)**
   ```bash
   # Exchange short-lived token for long-lived (60 days)
   curl -i -X GET "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_SHORT_LIVED_TOKEN"
   ```

### Option 2: Check Account Type

Instagram Content Publishing requires:
- **Business Account** or **Creator Account**
- **Facebook Page** connected to Instagram account
- Proper permissions in Facebook App

### Option 3: Test with Instagram Basic Display

If you're just testing, you might want to start with Instagram Basic Display API:

1. Create new app at developers.facebook.com
2. Add Instagram Basic Display product
3. Configure OAuth redirect URIs
4. Get user access token for testing

## Testing Your Setup

Once you have valid credentials:

1. **Update environment variables:**
   ```bash
   export INSTAGRAM_ACCESS_TOKEN="your_new_token_here"
   export INSTAGRAM_APP_ID="1459552298843429"
   ```

2. **Test credentials:**
   ```bash
   node scripts/test-instagram-simple.js
   ```

3. **Create test post:**
   ```bash
   node scripts/test-instagram.js
   ```

## Common Issues

### Error 190: Invalid OAuth Access Token
- Token expired (short-lived tokens expire in 1 hour)
- Token format incorrect
- Wrong app credentials
- **Solution:** Generate new token

### Error 100: Unsupported Request
- Missing required permissions
- Wrong API endpoint
- **Solution:** Check permissions and endpoints

### Error 200: Permissions Error
- App doesn't have required permissions
- User hasn't granted permissions
- **Solution:** Review app permissions

### Error 803: Some of the aliases you requested do not exist
- Instagram account not properly connected
- Wrong account type (personal vs business)
- **Solution:** Convert to business/creator account

## Next Steps

1. **Fix the access token** - Get a new long-lived token
2. **Verify account type** - Ensure business/creator account
3. **Test again** - Run the test scripts
4. **Create test post** - Verify posting works

## Resources

- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-api)
- [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer)