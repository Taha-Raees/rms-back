#!/bin/bash

echo "🔧 Fixing authentication issues for cross-domain support..."

# Fix 1: Update login.ts cookie sameSite settings
echo "📝 Updating login.ts cookie settings..."
sed -i "s/sameSite: 'lax'/sameSite: isProduction ? 'none' : 'lax'/g" src/auth/login.ts

# Fix 2: Update CORS in index.ts
echo "🌐 Updating CORS configuration..."
sed -i '/if (allowedOrigins.includes(origin)) {/a \
    // Also allow any vercel.app subdomain in production (like ZetraTech)\
    if (process.env.NODE_ENV === '\''production'\'' && origin.endsWith('\''.vercel.app'\'')) {\
      return cb(null, true);\
    }' src/index.ts

# Fix 3: Update session sameSite
echo "🍪 Updating session sameSite setting..."
sed -i "s/sameSite: 'lax'/sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'/g" src/index.ts

echo "✅ Authentication fixes applied!"
echo ""
echo "📋 Summary of changes:"
echo "1. ✅ Cookie sameSite set to 'none' in production"
echo "2. ✅ CORS allows all .vercel.app subdomains in production"
echo "3. ✅ Session sameSite set to 'none' in production"
echo ""
echo "🚀 Next steps:"
echo "1. Commit and push these changes"
echo "2. Redeploy on Render"
echo "3. Test authentication - should work now!"