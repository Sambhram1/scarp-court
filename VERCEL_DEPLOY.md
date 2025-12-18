# Vercel Deployment Guide

## Quick Deploy

1. Push your code to GitHub
2. Connect repository to Vercel
3. Vercel will auto-detect and deploy

## Environment Variables

Add these to Vercel dashboard:

```
NODE_ENV=production
LOG_LEVEL=info
```

## Important Notes

### Serverless Functions Timeout
- **Hobby plan**: 10 seconds max
- **Pro plan**: 60 seconds max

Our scraper typically takes 4-6 seconds, so it should work on both plans.

### Redis Cache
The mocked Redis service works fine for serverless. For production caching, consider:
- Vercel KV (Redis-compatible)
- Upstash Redis
- Or keep using the mock (stateless)

### Cold Starts
First request after idle may be slower (~2-3s extra). Subsequent requests are fast due to warm functions.

## Troubleshooting

### "Can't see data"
1. Check Vercel function logs
2. Verify the API endpoint URL: `https://your-app.vercel.app/api/cause-list?date=2025-12-18&court=COURT%20NO.%2001`
3. Test with browser DevTools Network tab

### Timeout errors
- Increase Vercel plan if on Hobby (10s limit)
- Or optimize the scraper to cache more aggressively

### HTTPS/SSL errors
Already handled with `rejectUnauthorized: false` in the scraper.

## Testing Deployment

```bash
# Test API endpoint
curl "https://your-app.vercel.app/api/cause-list?date=2025-12-18&court=COURT%20NO.%2001"

# Test frontend
open https://your-app.vercel.app
```

## Files for Deployment

Required files:
- ✅ `vercel.json` - Deployment configuration
- ✅ `src/server.ts` - Serverless-compatible server
- ✅ `src/app.ts` - Express app
- ✅ `public/index.html` - Frontend
- ✅ `.gitignore` - Exclude node_modules, .env
- ✅ `package.json` - Dependencies and scripts

## Build Command
```bash
npm run build
```

## Output Directory
```
dist/
```

The build is already configured in `package.json`.
