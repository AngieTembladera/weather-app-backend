import dotenv from 'dotenv';
dotenv.config(); 

import express from 'express';
import cors from 'cors';
import routes from './routes/weatherRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

console.log('OPENWEATHER_API_KEY presente?', !!process.env.OPENWEATHER_API_KEY);
console.log(
  'OPENWEATHER_API_KEY (masked):',
  process.env.OPENWEATHER_API_KEY ? process.env.OPENWEATHER_API_KEY.trim().slice(0, 8) + '***' : 'no definida'
);

app.use('/api', routes);

app.get('/', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server escuchando en http://localhost:${PORT}`));