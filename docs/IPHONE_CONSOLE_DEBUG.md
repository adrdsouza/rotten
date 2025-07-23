# iPhone/Safari Console Logging Instructions

## Problem
Console logs are disabled in production to improve performance, but this makes debugging Apple Pay difficult on iPhone.

## Solution
We've implemented multiple ways to enable console logs for debugging:

### Method 1: Enable Debug Mode via URL (Easiest)
1. Add `?debug=true` to your URL
   - Example: `https://rottenhand.com/checkout?debug=true`
2. Refresh the page
3. Console logs will now be visible

### Method 2: Enable via Local Storage (Persistent)
1. Open Safari on iPhone
2. Go to your website
3. Open Web Inspector (see instructions below)
4. In the console, type: `enableApplePayDebug()`
5. Refresh the page
6. Console logs will now be visible until you disable them

### Method 3: Load Debug Helper Script
1. In the browser console, paste this line:
```javascript
fetch('/debug/applepay-debug.js').then(r=>r.text()).then(eval)
```
2. This will load helper functions and show debug info

### Method 4: Mobile Debug Console (Built-in)
- A floating debug console appears automatically when debug mode is enabled
- Shows console logs directly on the screen
- Access via the red "🐛 LOG" button in the bottom-right corner

## How to Access Safari Console on iPhone

### Option A: Using Mac + iPhone
1. **On iPhone:**
   - Settings > Safari > Advanced > Web Inspector (ON)
2. **Connect iPhone to Mac via USB**
3. **On Mac:**
   - Open Safari
   - Develop menu > [Your iPhone Name] > [Your Website]
   - Full console, network, elements available

### Option B: Using Remote Desktop/Screen Sharing
- Use screen sharing to access a Mac
- Follow the same steps as Option A

### Option C: Third-party Tools
- **Weinre**: Remote web inspector
- **Eruda**: Mobile console (can be injected via bookmarklet)

## Debug Helper Functions

Once debug mode is enabled, these functions are available in the console:

- `enableApplePayDebug()` - Enable Apple Pay debugging
- `disableApplePayDebug()` - Disable debugging  
- `checkDebugStatus()` - Check current debug status
- `showApplePayInfo()` - Show comprehensive Apple Pay support info

## What Gets Logged

With debug mode enabled, you'll see detailed logs for:

### Apple Pay Initialization
- `[Apple Pay] Starting initialization...`
- `[Apple Pay] Collect.js loaded successfully`
- `[Apple Pay] Checking availability...`
- `[Apple Pay] Supported version: X`
- `[Apple Pay] canMakePayments: true/false`
- `[Apple Pay] Final availability: true/false`

### Apple Pay Processing
- `[Apple Pay] Button clicked`
- `[Apple Pay] Creating payment request...`
- `[Apple Pay] Starting session...`
- `[Apple Pay] Payment authorized`
- `[Apple Pay] Processing payment...`

### Mobile Debug Console
- Real-time console output displayed on screen
- Color-coded log levels (error=red, warn=yellow, info=blue, log=green)
- Timestamp for each log entry
- Clear button to reset logs

## Testing Apple Pay Support

Run `showApplePayInfo()` in the console to see:
- Browser compatibility
- Apple Pay API availability
- Version support
- Card setup status
- Collect.js status
- HTTPS requirement check

## Common Issues

1. **No console logs visible**
   - Ensure debug mode is enabled (check with `checkDebugStatus()`)
   - Try adding `?debug=true` to URL

2. **Apple Pay button not showing**
   - Check `showApplePayInfo()` output
   - Verify HTTPS is enabled
   - Confirm Apple Pay is set up in Wallet app
   - Check if running on actual iOS device (not simulator)

3. **Mobile debug console not appearing**
   - Enable debug mode first
   - Look for red "🐛 LOG" button in bottom-right
   - Try refreshing the page

## Quick Debug Commands

```javascript
// Enable debugging and show info
enableApplePayDebug();
location.reload();

// After page reloads, check Apple Pay support
showApplePayInfo();

// Check if logs are working
console.log('Debug test - this should appear');
```

## Production Safety

- Debug mode only activates when explicitly enabled
- No performance impact when disabled
- Console logs are completely silent in normal production use
- Debug console only appears when debug flags are set
