import type { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'path';
import fs from 'fs';

export default function handler(req: VercelRequest, res: VercelResponse) {
    // Serve the index.html file
    const htmlPath = path.join(process.cwd(), 'public', 'index.html');

    if (fs.existsSync(htmlPath)) {
        const html = fs.readFileSync(htmlPath, 'utf-8');
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
    }

    return res.status(404).json({ error: 'Not found' });
}
