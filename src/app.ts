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
app.use(express.static(path.join(__dirname, '../dist')));

// API Routes
app.use('/api', controller.getCauseList.bind(controller)); // Changed to use 'controller' as defined

// Handle React routing, return all requests to React app
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.get('/health', (req, res) => controller.getHealth(req, res));

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', err);
    res.status(500).json({ error: 'Internal server error' });
});

export default app;
