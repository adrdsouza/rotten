# Apple Pay Setup Guide - Quick Start

## ✅ What's Already Done

Your Apple Pay integration is **already implemented**! Here's what I've set up:

1. ✅ **Apple verification file** - Already in place
2. ✅ **ApplePayButton component** - Shows when Apple Pay is available
3. ✅ **Payment.tsx updated** - Includes Apple Pay + your credit card form
4. ✅ **Backend endpoints** - API routes for validation and processing
5. ✅ **NMI handler enhanced** - Supports Apple Pay tokens
6. ✅ **Domain registered** - `damneddesigns.com` 

## 🚀 Next Steps (Required)

### 1. Get Apple Pay Certificates

Visit [Apple Developer Portal](https://developer.apple.com/account) and:

1. **Create Merchant ID**:
   - Go to Certificates, Identifiers & Profiles
   - Select "Merchant IDs"
   - Create new: `merchant.com.damneddesigns`

2. **Generate Certificates**:
   - Payment Processing Certificate
   - Download both certificate and private key

### 2. Configure Environment Variables

Add to your `.env` files:

```bash
# Apple Pay Configuration
APPLE_PAY_MERCHANT_ID=merchant.com.damneddesigns
APPLE_PAY_CERTIFICATE_PATH=/path/to/apple-pay-cert.pem
APPLE_PAY_PRIVATE_KEY_PATH=/path/to/apple-pay-key.pem

# Your existing NMI config (unchanged)
NMI_SECURITY_KEY=your_existing_nmi_key
```

### 3. Enable Apple Pay in NMI

Login to your NMI merchant portal:
1. Go to **Payment Methods** → **Apple Pay**
2. Upload your Apple Pay certificates
3. Enable Apple Pay processing
4. Confirm `damneddesigns.com` is in allowed domains

### 4. Test on HTTPS

Apple Pay only works on HTTPS domains. Test on:
- ✅ Production: `https://damneddesigns.com`
- ✅ Staging with HTTPS
- ❌ Local development (HTTP) - won't show Apple Pay button

## 🔧 How It Works Now

```
Customer visits checkout
├── Apple Pay available on device?
│   ├── YES: Shows "Pay with Apple Pay" + "or pay with card"
│   └── NO: Shows only your superior credit card form
│
├── Apple Pay selected:
│   ├── Customer authorizes with Touch/Face ID
│   ├── Apple sends encrypted token
│   ├── Your backend processes via NMI
│   └── Order completed
│
└── Credit Card selected:
    ├── Your existing world-class validation
    ├── Direct NMI processing
    └── Order completed
```

## 🧪 Testing

### Apple Pay Sandbox:
- Configure test cards in Apple Developer account
- Test on Safari (macOS) or Safari (iOS)
- Must be HTTPS domain

### Your Existing Tests:
- All current NMI test cards work unchanged
- Your direct card processing remains identical
- Apple Pay is purely additive

## 🎯 The Result

Your customers will see:
- **Apple Pay button** (when available)
- **"or pay with card"** separator
- **Your existing credit card form** (unchanged)

Your **world-class direct card processing** remains exactly the same. Apple Pay just adds a premium option for users who have it.

## 📞 Need Help?

The implementation is complete - you just need:
1. Apple Pay certificates from Apple Developer
2. Environment variables configured
3. NMI portal Apple Pay enabled

Everything else is ready to go! 🚀
