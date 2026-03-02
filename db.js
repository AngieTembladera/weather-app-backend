import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

export const con = mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'weatherdb',
});

con.connect((err) => {
  if (err) {
    console.error('Error al conectar a MySQL:', err);
    return;
  }
  console.log('Conectado a MySQL');
});

con.on('error', (err) => {
  console.error('MySQL connection error (capturado):', err);
});

export default con;