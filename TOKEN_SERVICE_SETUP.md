# Token Service Setup Guide

## 🔐 Environment Variables Required

Add these environment variables to your `.env` file:

```bash
# Token Encryption Key (REQUIRED)
# Generate a new key with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your_64_character_hex_key_here

# Existing OAuth variables (should already be set)
QUICKBOOKS_CLIENT_ID=your_qbo_client_id
QUICKBOOKS_CLIENT_SECRET=your_qbo_client_secret
QUICKBOOKS_REDIRECT_URI=your_qbo_redirect_uri

XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
XERO_REDIRECT_URI=your_xero_redirect_uri
```

## 🗄️ Database Schema Updates

You'll need to add these tables to your Prisma schema:

```prisma
model AuditLog {
  id            String   @id @default(cuid())
  userId        String
  companyId     String
  apiEndpoint   String
  connectionType String
  requestMethod String
  responseStatus Int
  ipAddress     String
  userAgent     String
  errorMessage  String?
  responseTime  Int?
  timestamp     DateTime @default(now())

  @@index([companyId])
  @@index([timestamp])
}

model ConnectionHealth {
  id            String   @id @default(cuid())
  companyId     String
  connectionType String
  status        String   // 'healthy', 'unhealthy', 'expired'
  lastChecked   DateTime @default(now())
  errorMessage  String?

  @@unique([companyId, connectionType])
  @@index([companyId])
}
```

## 🚀 Migration Commands

```bash
# Generate migration
npx prisma migrate dev --name add_audit_tables

# Or if using Prisma Studio
npx prisma db push
```

## 🔧 Key Features Added

### ✅ **Advanced Token Management**
- **Encrypted token storage** - All tokens are encrypted before database storage
- **Token refresh deduplication** - Prevents multiple simultaneous token refreshes
- **Comprehensive error handling** - Proper error codes and messages
- **Connection health monitoring** - Track connection status over time

### ✅ **Audit Logging**
- **API call tracking** - Log all token-related operations
- **Connection health updates** - Monitor token validity
- **Error tracking** - Detailed error logging for debugging

### ✅ **Production Ready**
- **Type safety** - Full TypeScript support
- **Error recovery** - Graceful handling of token failures
- **Performance optimized** - Caching and deduplication
- **Security focused** - Encrypted storage and proper validation

## 📋 Usage Examples

### Get Valid Token
```typescript
import { tokenService } from '~/server/services/token';

// This will automatically refresh if needed
const token = await tokenService.getValidToken(companyId, 'qbo', userId);
```

### Check Token Status
```typescript
const status = await tokenService.getTokenStatus(companyId, 'qbo');
// Returns: { status: 'VALID' | 'EXPIRED' | 'NO_TOKEN' | 'ERROR', message: string }
```

### Get OAuth Client
```typescript
const client = await tokenService.getOAuthClient(companyId, 'qbo');
// Returns a properly configured OAuth client with valid token
```

## 🔄 Migration from Current System

Your current OAuth system will continue to work, but you can gradually migrate to use the token service:

1. **Immediate**: Token service handles all new token operations
2. **Gradual**: Update existing code to use `tokenService.getValidToken()`
3. **Complete**: Remove old token handling code

## 🛡️ Security Benefits

- **Encrypted Storage**: Tokens are encrypted with AES-256-GCM
- **Automatic Refresh**: Tokens refresh before expiration
- **Audit Trail**: All operations are logged
- **Error Handling**: Proper error codes and recovery
- **Connection Monitoring**: Track health over time

The token service is now fully integrated and ready for production use! 🎉
