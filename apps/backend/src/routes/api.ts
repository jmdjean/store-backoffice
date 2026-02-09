import { Router } from 'express';

export const apiRouter = Router();

apiRouter.get('/', (_req, res) => {
  res.json({ message: 'Store Backoffice API', version: '1.0.0' });
});
