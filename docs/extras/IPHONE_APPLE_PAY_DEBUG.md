# 📱 iPhone Apple Pay Debug Guide (No Mac Required)

This guide will help you debug Apple Pay issues on iPhone when you don't have access to a Mac for Safari Web Inspector.

## 🚀 Quick Start Debug Process

### Step 1: Access the Debug Page on iPhone
1. **Option A - Direct URL**: Go to `https://your-domain.com/debug/apple-pay-test.html`
2. **Option B - QR Code**: Use the QR code generator on the debug page from your laptop
3. **Option C - Bookmark**: Save the debug page URL in Safari bookmarks

### Step 2: Run the Debug Tests
1. Open the debug page on your iPhone
2. Scroll through all sections and note any red ❌ indicators
3. Tap "Export Debug Info" to get detailed information
4. Copy the debug information and send it to yourself via email/text

### Step 3: Enable Debug Mode
1. Tap "Enable Debug Mode" on the debug page
2. Navigate to your actual checkout page
3. Look for additional debug information that appears

## 🔧 Debug Methods for Non-Mac Users

### Method 1: Debug Bookmarklet
The debug page will provide a bookmarklet (special bookmark) that you can drag to your Safari bookmarks. When tapped on any page, it shows Apple Pay debug information.

**How to use:**
1. Go to the debug page on your laptop
2. Click "Get Debug Bookmarklet"
3. Copy the bookmarklet link
4. On iPhone Safari, create a new bookmark and paste the link
5. Tap the bookmark on your checkout page to see debug info

### Method 2: Console Log Capture
Since iPhone Safari doesn't easily show console logs, the debug page captures them for you:

1. Visit the debug page on iPhone
2. All console logs are automatically captured
3. Use "Export Debug Info" to get all the logs
4. Send the information to yourself to analyze on laptop

### Method 3: Remote Debug Information
1. Enable "Remote Logging" on the debug page
2. Visit your checkout page normally
3. Return to the debug page
4. Export all captured information

## 🎯 Common Issues & Solutions

### Issue 1: Apple Pay Button Not Appearing

**Check these on iPhone:**
- [ ] Using Safari browser (not Chrome or other browsers)
- [ ] Connected to HTTPS site (not HTTP)
- [ ] Have at least one card set up in Apple Wallet
- [ ] Card is compatible (Visa, MasterCard, Amex, Discover)
- [ ] Device has Touch ID, Face ID, or passcode enabled

**Debug steps:**
1. Go to Settings > Wallet & Apple Pay
2. Verify you have cards added
3. Try adding a test card if none present
4. Check that Apple Pay is enabled for Safari

### Issue 2: "ApplePaySession not available"

**Possible causes:**
- Not using Safari browser
- Site not served over HTTPS
- iOS version too old (need iOS 11.2+)
- Device doesn't support Apple Pay

**Debug steps:**
1. Check iOS version: Settings > General > About
2. Try opening in Safari specifically (not in-app browser)
3. Verify URL shows "https://" not "http://"

### Issue 3: "Cannot make payments"

**Possible causes:**
- No compatible cards in Apple Wallet
- Apple Pay disabled in Settings
- Region/country restrictions
- Card issuer doesn't support Apple Pay

**Debug steps:**
1. Add a known compatible card to Apple Wallet
2. Settings > Wallet & Apple Pay > Allow Payments On Mac (if available)
3. Contact card issuer to verify Apple Pay support

## 📱 Step-by-Step iPhone Debugging

### Step 1: Environment Check
On your iPhone, visit the debug page and verify:
```
✅ iOS Device: true
✅ Safari Browser: true  
✅ HTTPS: true
✅ Mobile: true
```

### Step 2: Apple Pay Support Check
Look for these indicators:
```
✅ ApplePaySession: Available
✅ Version 3: true
✅ Can Make Payments: true
✅ Has Compatible Cards: true
```

### Step 3: Test Apple Pay
1. If all checks pass, you should see an Apple Pay button
2. Tap the button to test the payment flow
3. It should show the Apple Pay sheet
4. Cancel the payment (it's just a test)

### Step 4: Troubleshoot Issues
If any check fails:

**ApplePaySession not available:**
- Switch to Safari if using another browser
- Check iOS version (need 11.2+)
- Ensure HTTPS connection

**Cannot make payments:**
- Go to Settings > Wallet & Apple Pay
- Add a test card if none present
- Enable Apple Pay for websites

**No compatible cards:**
- Add Visa, MasterCard, Amex, or Discover card
- Contact bank to enable Apple Pay
- Try different card if available

## 🚨 Emergency Debug Options

### Option 1: Screenshot Everything
Take screenshots of:
- Debug page results
- Settings > Wallet & Apple Pay screen
- Safari settings
- Your checkout page
- Any error messages

### Option 2: Screen Recording
1. Settings > Control Center > Customize Controls
2. Add "Screen Recording"
3. Record yourself going through the debug process
4. Send video to analyze later

### Option 3: Simple Error Test
Create a simple test by adding this to any page:
```javascript
// Paste this in Safari address bar on iPhone:
javascript:alert('Apple Pay: ' + (window.ApplePaySession ? 'Available' : 'Not Available') + '\nCan Make Payments: ' + (window.ApplePaySession ? ApplePaySession.canMakePayments() : 'N/A'));
```

## 🔍 What to Look For

### In Debug Export
Look for these key indicators:
```json
{
  "applePay": {
    "sessionAvailable": true,    // Must be true
    "canMakePayments": true,     // Must be true  
    "version3": true             // Should be true
  },
  "environment": {
    "isIOS": true,              // Must be true
    "isSafari": true,           // Must be true
    "isHTTPS": true             // Must be true
  }
}
```

### In Console Logs
Look for error messages containing:
- "Apple Pay"
- "ApplePaySession" 
- "Payment request"
- "Collect.js"
- Any JavaScript errors

## 📞 Getting Help

If you're still stuck after following this guide:

1. **Export complete debug info** from the debug page
2. **Take screenshots** of all relevant settings
3. **Note your specific setup:**
   - iPhone model and iOS version
   - Cards in Apple Wallet
   - Exact error messages or behavior
4. **Document the steps** you've tried

## 🎯 Next Steps

Once you identify the issue:

1. **Environment issues**: Fix HTTPS, Safari usage, iOS version
2. **Apple Pay setup issues**: Add cards, enable Apple Pay in settings
3. **Code issues**: Check your website's Apple Pay implementation
4. **Domain issues**: Verify Apple Pay domain registration with NMI

Remember: Apple Pay is very strict about requirements, but once working, it's very reliable!
