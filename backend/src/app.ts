import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthDb } from './db';
import authRouter from './routes/auth';
import productRouter from './routes/products';

const app = express();
app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/healthz', async (_req, res) => {
  try { await healthDb(); res.json({ ok: true }); }
  catch { res.status(500).json({ ok: false }); }
});

app.use('/api/auth', authRouter);
app.use('/api/products', productRouter);

app.use((err:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  console.error(err); res.status(err.status||500).json({ message: err.message||'Server error' });
});

export default app;