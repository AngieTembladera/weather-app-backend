import mysql from 'mysql2';

// Conexión usando directamente las variables de Railway
export const con = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
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
