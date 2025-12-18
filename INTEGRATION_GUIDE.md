# Quick Integration Guide

## Replace the Old Scraper

To use the new refactored scraper, simply rename the files:

```bash
# Backup old implementation
mv src/scraper/scraper.service.ts src/scraper/scraper.service.old.ts

# Activate new implementation
mv src/scraper/scraper.service.refactored.ts src/scraper/scraper.service.ts
```

Or manually update `src/scraper/scraper.service.ts` to import and re-export the refactored service.

## Graceful Shutdown

Add this to your `server.ts`:

```typescript
// Graceful shutdown handler
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing browser...');
  const scraper = new ScraperService();
  await scraper.close();
  process.exit(0);
});
```

## Testing

```bash
# Start server
npm run dev

# Test endpoint
curl "http://localhost:3000/api/cause-list?date=2025-12-18"
```

The refactored code maintains the same public API, so **no controller changes needed**.
