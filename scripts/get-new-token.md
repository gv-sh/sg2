# Get New Instagram Access Token

## Issue Identified
**Error Subcode 467**: "The session is invalid because the user logged out"

Your access token became invalid because the user who created it logged out of Facebook/Instagram.

## Quick Fix - Get New Token

### Step 1: Go to Graph API Explorer
Click this link: https://developers.facebook.com/tools/explorer/?method=GET&path=me&version=v18.0&app_id=1459552298843429

### Step 2: Generate New Token
1. **Select App**: Make sure "1459552298843429" is selected
2. **Get User Access Token**: Click "Get User Access Token"
3. **Add Permissions**: Add these permissions:
   - `instagram_basic`
   - `instagram_content_publish` (for posting)
   - `pages_show_list` (if using business account)
4. **Generate Access Token**: Click "Generate Access Token"
5. **Login**: Login with the Instagram account you want to use

### Step 3: Copy New Token
Copy the new access token from the "Access Token" field

### Step 4: Update Environment Variable
```bash
export INSTAGRAM_ACCESS_TOKEN="your_new_token_here"
```

Or add it to your `.env` file:
```
INSTAGRAM_ACCESS_TOKEN=your_new_token_here
```

### Step 5: Test Again
```bash
node scripts/test-instagram-simple.js
```

## Alternative: Use Meta Business Suite

1. Go to https://business.facebook.com/
2. Select your business account
3. Go to Business Settings > Users > System Users
4. Create a system user for your app
5. Generate a permanent token

## Notes

- **Short-lived tokens** expire in 1 hour
- **Long-lived tokens** expire in 60 days  
- **System user tokens** can be permanent
- **Business/Creator accounts** required for content publishing

## Quick Test Command

Once you have a new token, run:
```bash
# Test credentials
node scripts/test-instagram-simple.js

# Create test post (if credentials work)
node scripts/test-instagram.js
```