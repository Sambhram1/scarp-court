import { Request, Response } from 'express';
import { COURTS } from '../data/courts';
import logger from '../utils/logger';

export class CourtController {
    // GET /api/courts
    getAllCourts = async (req: Request, res: Response) => {
        try {
            logger.info('Fetching all courts');
            res.json(COURTS);
        } catch (error) {
            logger.error('Error fetching courts', error);
            res.status(500).json({ error: 'Failed to fetch courts' });
        }
    };
}
