import { app, loadDataset, isReady } from '../server.js';
import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  if (!isReady()) {
    await loadDataset();
  }
  await new Promise<void>((resolve, reject) => {
    res.on("finish", resolve);
    res.on("error", reject);
    app(req, res);
  });
}
