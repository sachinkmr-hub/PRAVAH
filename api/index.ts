import { app, loadDataset, isReady } from '../server.js';
import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  if (!isReady()) {
    await loadDataset();
  }
  return app(req, res);
}
