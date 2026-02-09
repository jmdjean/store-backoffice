import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { healthRouter } from './routes/health.js';
import { apiRouter } from './routes/api.js';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.use('/health', healthRouter);
app.use('/api', apiRouter);

app.listen(config.port, () => {
  console.log(`Backend running at http://localhost:${config.port}`);
});
