const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Crear tabla
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        opcode TEXT UNIQUE,
        username TEXT,
        product TEXT,
        status TEXT,
        licensekey TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Base de datos lista");
  } catch (e) {
    console.error("Error DB:", e);
  }
}
initDB();

// Rutas
app.post('/api/payment', async (req, res) => {
  const { opcode, username, product } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO payments (opcode, username, product, status, licensekey) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [opcode, username, product, 'pending', '']
    );
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.get('/api/payments/pending', async (req, res) => {
  const result = await pool.query("SELECT * FROM payments WHERE status = 'pending' ORDER BY date DESC");
  res.json(result.rows);
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 OrgasmoNet Backend corriendo en puerto', process.env.PORT || 3000);
});
