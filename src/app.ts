import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { CauseListController } from './controllers/cause-list.controller';
import logger from './utils/logger';

const app = express();
const controller = new CauseListController();

// Middleware
app.use(express.json());
app.use(morgan('combined', { stream: { write: (message) => logger.http(message.trim()) } }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.get('/api/cause-list', (req, res) => controller.getCauseList(req, res));
app.get('/api/cause-list/today', (req, res) => controller.getTodayCauseList(req, res));
app.get('/health', (req, res) => controller.getHealth(req, res));

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', err);
    res.status(500).json({ error: 'Internal server error' });
});

export default app;
