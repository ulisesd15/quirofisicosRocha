# Google Maps API Configuration Guide

## Current Issue
The Google Maps API key is returning a 403 error, which means the API key lacks proper permissions or restrictions.

## How to Fix Google Maps API 403 Error

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select your project (or create a new one)

### Step 2: Enable Required APIs
Navigate to "APIs & Services" > "Library" and enable:
- **Maps Embed API** (required for iframe embeds)
- **Maps JavaScript API** (optional, for interactive maps)
- **Places API** (optional, for location search)

### Step 3: Configure API Key Restrictions
1. Go to "APIs & Services" > "Credentials"
2. Find your API key: `AIzaSyC8b9CElTNxNVTWQJiaOxx94mzQNXW0Z4E`
3. Click "Edit" (pencil icon)

### Step 4: Set API Restrictions
Under "API restrictions":
- Select "Restrict key"
- Check these APIs:
  - ✅ Maps Embed API
  - ✅ Maps JavaScript API (if using interactive maps)
  - ✅ Places API (if using place search)

### Step 5: Set Application Restrictions
Choose one of these options:

**Option A: HTTP referrers (recommended for websites)**
- Select "HTTP referrers (web sites)"
- Add these referrers:
  ```
  http://localhost:3001/*
  https://yourdomain.com/*
  ```

**Option B: None (less secure, but works for testing)**
- Select "None" if you want to test without restrictions first

### Step 6: Save and Test
1. Click "Save"
2. Wait 5-10 minutes for changes to propagate
3. Test your website

## Current API Key Status
- Key: `AIzaSyC8b9CElTNxNVTWQJiaOxx94mzQNXW0Z4E`
- Status: ❌ 403 Error (Insufficient permissions)
- Needed: Maps Embed API enabled + proper restrictions

## Fallback Solution
If you can't configure the API key immediately, the website will automatically use a static fallback map that works without an API key.

## Testing the Fix
After configuring the API key, you can test it by:
1. Opening http://localhost:3001
2. Scrolling to the contact section
3. The map should load without 403 errors

## Alternative: Use Static Map (No API Key Required)
If you prefer not to use the Google Maps API, you can use the static fallback map which is already implemented and working.
