const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error en la base de datos:', err);
});

// Crear tabla si no existe
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        opcode TEXT UNIQUE NOT NULL,
        username TEXT,
        product TEXT,
        status TEXT DEFAULT 'pending',
        licensekey TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Tabla 'payments' lista");
  } catch (e) {
    console.error("Error creando tabla:", e);
  }
}
initDB();

// Rutas
app.post('/api/payment', async (req, res) => {
  const { opcode, username, product } = req.body;
  if (!opcode || !username) return res.status(400).json({ success: false, error: "Faltan datos" });

  try {
    const result = await pool.query(
      'INSERT INTO payments (opcode, username, product, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [opcode, username, product || 'General', 'pending']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.get('/api/payments/pending', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM payments WHERE status = 'pending' ORDER BY date DESC");
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en puerto ${PORT}`);
});
