import app from './app';
import logger from './utils/logger';

const PORT = process.env.PORT || 3000;

// Only start server if not in serverless environment
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);
    });
}

// Export for Vercel serverless
export default app;
