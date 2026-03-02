import express from 'express';
import cors from 'cors';
import routes from './routes/weatherRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

// Verifica que la API Key esté presente en el entorno de producción
console.log('OPENWEATHER_API_KEY presente?', !!process.env.OPENWEATHER_API_KEY);
console.log(
  'OPENWEATHER_API_KEY (masked):',
  process.env.OPENWEATHER_API_KEY
    ? process.env.OPENWEATHER_API_KEY.trim().slice(0, 8) + '***'
    : 'no definida'
);

// Rutas de tu API
app.use('/api', routes);

// Ruta de prueba
app.get('/', (req, res) => res.json({ status: 'ok' }));

// Puerto para Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server escuchando en el puerto ${PORT}`));
