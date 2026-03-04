import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

// Crear pool en lugar de una sola conexión
export const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "weatherdb",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Verificar conexión inicial (opcional pero recomendado)
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Error al conectar a MySQL:", err);
    return;
  }
  console.log("Pool de MySQL conectado correctamente");
  connection.release(); // Muy importante liberar conexión
});

export default pool;
