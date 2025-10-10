# SheerID Integration - Simplified Implementation

## Overview

This document describes the simplified SheerID integration that follows SheerID's recommended best practices using a metadata-driven, frontend-first architecture.

## Architecture

### **Frontend-First Design**
- **Program configurations** are hardcoded in the frontend (`frontend/src/components/verification/types.ts`)
- **SheerID iframe** includes metadata in the URL for account linking
- **No GraphQL queries** needed for program data
- **Minimal backend** only handles webhook processing

### **Backend Webhook-Only**
- **Single webhook endpoint** processes verification completion
- **SheerID API integration** fetches verification details
- **Customer record updates** store verification status
- **Promotion conditions** work with existing verification data

## Implementation Details

### **Frontend Components**

#### **Program Constants** (`frontend/src/components/verification/types.ts`)
```typescript
export const VERIFICATION_PROGRAMS: VerificationProgram[] = [
  {
    id: 'military',
    name: 'US Military',
    segment: 'US_MILITARY',
    discountPercent: 15,
    category: 'military',
    description: 'Active duty, veterans, and military families',
    sheerIdProgramId: '62fb8387ffe3e916af05ce22'
  },
  // ... other programs
];
```

#### **Metadata Integration** (`frontend/src/components/verification/SheerIdModal.tsx`)
```typescript
<iframe
  src={`https://services.sheerid.com/verify/${program.sheerIdProgramId}/?metadata=${encodeURIComponent(JSON.stringify({
    programId: program.id,
    category: program.category,
    discountPercent: program.discountPercent,
    customerId: customerId || 'anonymous'
  }))}`}
  // ... other props
/>
```

### **Backend Implementation**

#### **Plugin Configuration** (`backend/src/vendure-config.ts`)
```typescript
SheerIdPlugin.init({
  clientId: process.env.SHEERID_CLIENT_ID || '',
  clientSecret: process.env.SHEERID_CLIENT_SECRET || '',
  webhookSecret: process.env.SHEERID_WEBHOOK_SECRET || 'default-secret'
})
```

#### **Webhook Processing** (`backend/src/plugins/sheerid-plugin/sheerid.service.ts`)
1. **Receives verification ID** from SheerID webhook
2. **Obtains OAuth access token** using Client Credentials flow (cached for 30 days)
3. **Fetches verification details** from SheerID API using JWT bearer token
4. **Extracts metadata** (customerId, programId, category, discountPercent)
5. **Updates customer record** with verification status
6. **Handles success/failure** states appropriately

## Environment Variables

Add to `backend/.env`:
```bash
# SheerID Configuration (Client Applications - OAuth)
SHEERID_CLIENT_ID=your_client_application_id_here
SHEERID_CLIENT_SECRET=your_client_application_secret_here
SHEERID_WEBHOOK_SECRET=your_webhook_secret_here
```

### **Authentication Method**
- **Uses OAuth Client Credentials flow** for secure, time-limited access tokens
- **Tokens automatically expire** after 30 days for enhanced security
- **Token caching** prevents unnecessary API calls and improves performance
- **Automatic token refresh** when cached token expires

## Benefits of This Approach

### **Simplified Architecture**
- ✅ **No complex backend program management**
- ✅ **No GraphQL schema extensions needed**
- ✅ **Frontend controls all UI logic**
- ✅ **Backend only handles verification completion**

### **SheerID Best Practices**
- ✅ **Metadata-driven account linking**
- ✅ **API-based verification details**
- ✅ **Webhook-only backend integration**
- ✅ **Follows official SheerID documentation**

### **Maintenance Benefits**
- ✅ **Easier to update program configurations**
- ✅ **Less code to maintain**
- ✅ **Clear separation of concerns**
- ✅ **Reduced complexity**

## Migration Completed

### **What Changed**
1. **Frontend**: Program configs moved from backend to frontend constants
2. **Backend**: Removed GraphQL extensions, simplified to webhook-only
3. **Integration**: Uses SheerID API + metadata instead of complex program management
4. **Authentication**: Migrated from static API tokens to OAuth Client Applications
5. **Configuration**: Uses Client ID + Secret with automatic token management

### **What Stayed the Same**
- ✅ **Customer verification storage** (same custom fields)
- ✅ **Promotion conditions** (verified customer condition works unchanged)
- ✅ **Webhook endpoint** (same URL structure)
- ✅ **User experience** (same verification flow)

## Testing

Both frontend and backend build successfully with the new implementation.

## Complete File Structure

### **Frontend Files**
- `frontend/src/components/verification/types.ts` - Program constants and types
- `frontend/src/components/verification/VerificationModal.tsx` - Main verification UI
- `frontend/src/components/verification/SheerIdModal.tsx` - SheerID iframe wrapper
- `frontend/src/components/verification/VerificationButton.tsx` - Trigger button

### **Backend Files**
- `backend/src/plugins/sheerid-plugin/index.ts` - Plugin definition
- `backend/src/plugins/sheerid-plugin/types.ts` - Type definitions
- `backend/src/plugins/sheerid-plugin/sheerid.service.ts` - Webhook processing logic
- `backend/src/plugins/sheerid-plugin/sheerid.controller.ts` - Webhook endpoint
- `backend/src/plugins/sheerid-plugin/promotion-conditions/verified-customer.condition.ts` - Promotion condition

### **Configuration Files**
- `backend/src/vendure-config.ts` - Plugin registration
- `backend/.env` - Environment variables

## SheerID Program IDs (Current)

```typescript
const PROGRAMS = {
  military: '62fb8387ffe3e916af05ce22',
  first_responder: '63235d2ce445913797c137d4',
  teacher: '66394380141e0119a76dfaa1',
  student: '66394477141e0119a76e032b',
  medical: '63235d9ae445913797c14132',
  senior: '663944c3141e0119a76e0670'
};
```

## Webhook Configuration

**Webhook URL**: `https://damneddesigns.com/shop-api/sheerid/webhook/{programId}`

**Required Headers**:
- `x-sheerid-signature` - HMAC signature for verification
- `Content-Type: application/json`

**Payload Format**:
```json
{
  "verificationId": "string"
}
```

## Customer Data Storage

Verification data is stored in customer custom fields:
- `sheerIdVerifications` - JSON array of verification objects
- `activeVerifications` - String array of active categories
- `verificationMetadata` - JSON object with quick access data

## Configuration Status

✅ **Environment variables configured** with Client Application credentials
✅ **OAuth Client Credentials flow implemented** with automatic token management
✅ **Backend services restarted** and running successfully
✅ **Token generation tested** - OAuth flow working correctly

## Next Steps

1. **Set up webhook URL** in SheerID dashboard: `https://damneddesigns.com/shop-api/sheerid/webhook/{programId}`
2. **Test webhook processing** with SheerID verification flow
3. **Verify promotion conditions** work with new verification data
4. **Monitor logs** for any integration issues

## OAuth Implementation Benefits

- ✅ **Enhanced Security**: Tokens expire automatically after 30 days
- ✅ **Future-Proof**: Uses SheerID's recommended Client Applications system
- ✅ **Performance**: Token caching reduces API calls
- ✅ **Reliability**: Automatic token refresh when expired
- ✅ **Compliance**: Follows OAuth 2.0 standards and SheerID best practices
